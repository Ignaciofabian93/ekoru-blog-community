import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertAdminCan } from '../common/admin-access';
import { UsersClient } from '../common/clients/users.client';
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} from '../common/exceptions';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils';
import { CreateCommunityEventInput, UpdateCommunityEventInput } from './dto';
import {
  EventLocation,
  resolveLocation,
  touchesLocation,
} from './event-location';

/** Columns needed to apply a partial update over an event. */
/**
 * Attendance can be confirmed from the event's start until this long after it
 * ends (or after its start, for a single-date event).
 */
export const ATTENDANCE_WINDOW_DAYS = 30;

/**
 * An organiser earns ORGANIZEEVENT points for each attendee with an account,
 * up to this many per event, so a host cannot inflate points with a list.
 */
export const ORGANIZER_POINTS_ATTENDEE_CAP = 40;

const DAY_MS = 24 * 60 * 60 * 1000;

const EDITABLE_SELECT = {
  id: true,
  status: true,
  organizerId: true,
  startDate: true,
  endDate: true,
  locationType: true,
  address: true,
  countyId: true,
  onlineUrl: true,
} as const;

/** What every event read loads: registrations count and the category of its subcategory. */
const EVENT_INCLUDE = {
  _count: { select: { registrations: true } },
  communitySubCategory: { select: { communityCategoryId: true } },
} satisfies Prisma.CommunityPostInclude;

type EventRow = Prisma.CommunityPostGetPayload<{
  include: typeof EVENT_INCLUDE;
}>;

/**
 * Community Event Service — admin CRUD over community events (the CommunityPost
 * table) and read/management of their registrations.
 *
 * Admin writes require MODERATE_CONTENT; an admin-created event records the
 * admin in `authorId`. Events a business publishes from the app record the
 * business in `organizerId` instead. Registrations are written by the web app
 * when users register — this service lists and removes them, and derives
 * capacity math.
 */
@Injectable()
export class CommunityEventService {
  private readonly logger = new Logger(CommunityEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersClient,
    private readonly config: ConfigService,
  ) {}

  /** Email language: es, en or fr (other catalog languages fall back to es). */
  private mailLanguage(language?: string): 'es' | 'en' | 'fr' {
    const lang = (language ?? 'es').toLowerCase();
    return lang === 'en' || lang === 'fr' ? lang : 'es';
  }

  /**
   * Tells the attendee their place is reserved (email, guests included) and
   * the organising business that someone registered (in-app + push). Runs
   * after the reservation is committed and never fails it.
   */
  private async notifyRegistration(
    event: {
      id: number;
      title: string;
      startDate: Date | null;
      endDate: Date | null;
      organizerId: string | null;
      locationType: string;
      address: string | null;
      countyId: number | null;
      onlineUrl: string | null;
    },
    registration: { name: string; email: string },
    language?: string,
  ) {
    const lang = this.mailLanguage(language);
    const [placed] = await this.withPlaces([event]);
    const place =
      event.locationType === 'ONLINE'
        ? null
        : [event.address, placed.countyName, placed.cityName]
            .filter(Boolean)
            .join(', ') || null;
    const webAppUrl = this.config.get<string>('webAppUrl') ?? '';

    await Promise.all([
      this.users.sendEventRegistrationEmail({
        email: registration.email,
        name: registration.name,
        language: lang,
        eventTitle: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        place,
        onlineUrl: event.locationType === 'IN_PERSON' ? null : event.onlineUrl,
        eventUrl: `${webAppUrl}/${lang}/community`,
      }),
      event.organizerId
        ? this.users.notify({
            sellerId: event.organizerId,
            type: 'EVENT_REGISTRATION_RECEIVED',
            relatedId: event.id,
            actionUrl: '/community',
            data: {
              attendeeName: registration.name,
              eventTitle: event.title,
            },
          })
        : Promise.resolve(false),
    ]);
  }

  /** Platform admin with MODERATE_CONTENT (matches the panel's community screens). */
  private requireAdmin(adminId?: string): Promise<string> {
    return assertAdminCan(this.prisma, adminId, 'MODERATE_CONTENT');
  }

  /** Attaches computed registrationCount + remainingCapacity to a raw row. */
  private mapEvent(row: EventRow) {
    const { communitySubCategory, ...event } = row;
    const registrationCount = row._count.registrations;
    const remainingCapacity =
      row.capacity == null
        ? null
        : Math.max(0, row.capacity - registrationCount);
    return {
      ...event,
      communityCategoryId: communitySubCategory?.communityCategoryId ?? null,
      registrationCount,
      remainingCapacity,
    };
  }

  /**
   * The subcategory an event belongs to. Required when creating, cannot be
   * cleared, and must be active. Undefined when an update leaves it alone.
   */
  private async subCategoryFor(
    value: number | null | undefined,
    { required }: { required: boolean },
  ): Promise<number | undefined> {
    if (value === undefined && !required) return undefined;
    if (value == null) {
      throw new BadRequestError('Elige la categoría del evento');
    }
    const sub = await this.prisma.communitySubCategory.findUnique({
      where: { id: value },
      select: { isActive: true },
    });
    if (!sub?.isActive) {
      throw new BadRequestError('La categoría elegida no existe');
    }
    return value;
  }

  /**
   * Adds county, city and region names to events in one query. The location
   * tables belong to ekoru-users, so they are read with raw SQL.
   */
  private async withPlaces<T extends { countyId: number | null }>(events: T[]) {
    const ids = [
      ...new Set(
        events.map((e) => e.countyId).filter((v): v is number => v != null),
      ),
    ];
    const places = new Map<
      number,
      {
        county: string;
        city: string;
        region: string;
        cityId: number;
        regionId: number;
      }
    >();
    if (ids.length) {
      const rows = await this.prisma.$queryRaw<
        {
          id: number;
          county: string;
          city: string;
          region: string;
          cityId: number;
          regionId: number;
        }[]
      >`
        SELECT co."id", co."county", ci."city", r."region", co."cityId", ci."regionId"
        FROM "County" co
        JOIN "City" ci ON ci."id" = co."cityId"
        JOIN "Region" r ON r."id" = ci."regionId"
        WHERE co."id" IN (${Prisma.join(ids)})`;
      for (const row of rows) places.set(row.id, row);
    }
    return events.map((e) => {
      const place = e.countyId != null ? places.get(e.countyId) : undefined;
      return {
        ...e,
        countyName: place?.county ?? null,
        cityName: place?.city ?? null,
        regionName: place?.region ?? null,
        cityId: place?.cityId ?? null,
        regionId: place?.regionId ?? null,
      };
    });
  }

  private async withPlace<T extends { countyId: number | null }>(event: T) {
    const [withPlace] = await this.withPlaces([event]);
    return withPlace;
  }

  /** Resolves and checks the location of a create or a location-changing update. */
  private async locationFor(
    input: CreateCommunityEventInput | UpdateCommunityEventInput,
    current?: EventLocation,
  ): Promise<EventLocation> {
    const location = resolveLocation(input, current);
    if (location.countyId != null) {
      const rows = await this.prisma.$queryRaw<{ id: number }[]>`
        SELECT "id" FROM "County" WHERE "id" = ${location.countyId} LIMIT 1`;
      if (!rows.length)
        throw new BadRequestError('La comuna indicada no existe');
    }
    return location;
  }

  async getEvents({
    adminId,
    page,
    pageSize,
    search,
  }: {
    adminId?: string;
    page: number;
    pageSize: number;
    search?: string;
  }) {
    await this.requireAdmin(adminId);
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const where: Prisma.CommunityPostWhereInput = search?.trim()
      ? { title: { contains: search.trim(), mode: 'insensitive' } }
      : {};

    const [count, rows] = await Promise.all([
      this.prisma.communityPost.count({ where }),
      this.prisma.communityPost.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take,
        include: EVENT_INCLUDE,
      }),
    ]);

    return createPaginatedResponse(
      await this.withPlaces(rows.map((r) => this.mapEvent(r))),
      count,
      page,
      pageSize,
    );
  }

  async getEvent({ adminId, id }: { adminId?: string; id: number }) {
    await this.requireAdmin(adminId);
    const event = await this.prisma.communityPost.findUnique({
      where: { id },
      include: EVENT_INCLUDE,
    });
    if (!event) throw new NotFoundError('Community event not found');
    return this.withPlace(this.mapEvent(event));
  }

  async createEvent({
    adminId,
    input,
  }: {
    adminId?: string;
    input: CreateCommunityEventInput;
  }) {
    const author = await this.requireAdmin(adminId);
    this.assertDateRange(input.startDate, input.endDate);
    const communitySubCategoryId = await this.subCategoryFor(
      input.communitySubCategoryId,
      { required: true },
    );
    const location = await this.locationFor(input);
    try {
      const created = await this.prisma.communityPost.create({
        data: {
          authorId: author,
          communitySubCategoryId,
          title: input.title,
          content: input.content,
          coverImage: input.coverImage ?? null,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          capacity: input.capacity ?? null,
          ...location,
        },
        include: EVENT_INCLUDE,
      });
      return this.withPlace(this.mapEvent(created));
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  /**
   * Applies a partial update — shared by the admin and the organiser paths.
   * Dates and location are validated on their effective values, i.e. after
   * the update is laid over what is stored.
   */
  private async applyUpdate(
    existing: Prisma.CommunityPostGetPayload<{
      select: typeof EDITABLE_SELECT;
    }>,
    input: UpdateCommunityEventInput,
  ) {
    if (existing.status === 'CANCELLED') {
      throw new BadRequestError('Este evento está cancelado');
    }
    const startDate =
      input.startDate !== undefined ? input.startDate : existing.startDate;
    const endDate =
      input.endDate !== undefined ? input.endDate : existing.endDate;
    this.assertDateRange(startDate, endDate);

    const location = touchesLocation(input)
      ? await this.locationFor(input, existing)
      : {};
    const communitySubCategoryId = await this.subCategoryFor(
      input.communitySubCategoryId,
      { required: false },
    );

    try {
      const updated = await this.prisma.communityPost.update({
        where: { id: existing.id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.content !== undefined && { content: input.content }),
          ...(input.coverImage !== undefined && {
            coverImage: input.coverImage,
          }),
          ...(input.startDate !== undefined && { startDate: input.startDate }),
          ...(input.endDate !== undefined && { endDate: input.endDate }),
          ...(input.capacity !== undefined && { capacity: input.capacity }),
          ...(communitySubCategoryId !== undefined && {
            communitySubCategoryId,
          }),
          ...location,
        },
        include: EVENT_INCLUDE,
      });
      return this.withPlace(this.mapEvent(updated));
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async updateEvent({
    adminId,
    id,
    input,
  }: {
    adminId?: string;
    id: number;
    input: UpdateCommunityEventInput;
  }) {
    await this.requireAdmin(adminId);
    const existing = await this.prisma.communityPost.findUnique({
      where: { id },
      select: EDITABLE_SELECT,
    });
    if (!existing) throw new NotFoundError('Community event not found');
    return this.applyUpdate(existing, input);
  }

  /** Organiser cancels their own event. */
  async cancelSellerEvent({
    sellerId,
    id,
    reason,
    language,
  }: {
    sellerId?: string;
    id: number;
    reason?: string | null;
    language?: string;
  }) {
    await this.loadOwnEvent(id, sellerId);
    return this.cancel({ id, reason, language });
  }

  /** Admin cancels any event (moderation, or on the organiser's behalf). */
  async cancelAdminEvent({
    adminId,
    id,
    reason,
    language,
  }: {
    adminId?: string;
    id: number;
    reason?: string | null;
    language?: string;
  }) {
    await this.requireAdmin(adminId);
    return this.cancel({ id, reason, language });
  }

  /**
   * Marks the event CANCELLED (idempotent) and tells everyone registered: an
   * email to each registrant, guests included, and an in-app notice to the
   * ones with an account. Notifications never fail the cancellation.
   */
  private async cancel({
    id,
    reason,
    language,
  }: {
    id: number;
    reason?: string | null;
    language?: string;
  }) {
    const current = await this.prisma.communityPost.findUnique({
      where: { id },
      include: EVENT_INCLUDE,
    });
    if (!current) throw new NotFoundError('Evento no encontrado');
    if (current.status === 'CANCELLED') {
      return this.withPlace(this.mapEvent(current));
    }

    const cancelled = await this.prisma.communityPost.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason?.trim() || null,
      },
      include: EVENT_INCLUDE,
    });

    void this.notifyCancellation(cancelled, language).catch((err: unknown) =>
      this.logger.error(
        `Cancellation notices for event ${id} failed`,
        err as Error,
      ),
    );
    return this.withPlace(this.mapEvent(cancelled));
  }

  private async notifyCancellation(
    event: {
      id: number;
      title: string;
      startDate: Date | null;
      cancellationReason: string | null;
    },
    language?: string,
  ) {
    const registrations = await this.prisma.communityPostRegistration.findMany({
      where: { communityPostId: event.id },
      select: { name: true, email: true, sellerId: true },
    });
    if (!registrations.length) return;

    const lang = this.mailLanguage(language);
    const webAppUrl = this.config.get<string>('webAppUrl') ?? '';
    const members = [
      ...new Set(
        registrations.map((r) => r.sellerId).filter((v): v is string => !!v),
      ),
    ];

    await Promise.all([
      this.users.sendEventCancelledEmails({
        language: lang,
        eventTitle: event.title,
        startDate: event.startDate,
        reason: event.cancellationReason,
        communityUrl: `${webAppUrl}/${lang}/community`,
        recipients: registrations.map((r) => ({
          email: r.email,
          name: r.name,
        })),
      }),
      ...members.map((sellerId) =>
        this.users.notify({
          sellerId,
          type: 'EVENT_CANCELLED',
          relatedId: event.id,
          actionUrl: '/community',
          data: { eventTitle: event.title },
        }),
      ),
    ]);
  }

  async deleteEvent({ adminId, id }: { adminId?: string; id: number }) {
    await this.requireAdmin(adminId);
    try {
      // Registrations cascade.
      await this.prisma.communityPost.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async getRegistrations({
    adminId,
    eventId,
    page,
    pageSize,
  }: {
    adminId?: string;
    eventId: number;
    page: number;
    pageSize: number;
  }) {
    await this.requireAdmin(adminId);
    const { skip, take } = calculatePrismaParams(page, pageSize);
    const where: Prisma.CommunityPostRegistrationWhereInput = {
      communityPostId: eventId,
    };

    const [count, rows] = await Promise.all([
      this.prisma.communityPostRegistration.count({ where }),
      this.prisma.communityPostRegistration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return createPaginatedResponse(rows, count, page, pageSize);
  }

  async deleteRegistration({ adminId, id }: { adminId?: string; id: number }) {
    await this.requireAdmin(adminId);
    try {
      await this.prisma.communityPostRegistration.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  /** Rejects an inverted range (end before start). */
  private assertDateRange(start?: Date | null, end?: Date | null): void {
    if (start && end && end.getTime() < start.getTime()) {
      throw new BadRequestError('endDate must be on or after startDate');
    }
  }

  private friendlyError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return new BadRequestError(
            'Duplicate value violates a unique constraint',
          );
        case 'P2003':
          return new BadRequestError(
            'Invalid relation: the referenced id does not exist',
          );
        case 'P2025':
          return new NotFoundError('Row not found');
        default:
          this.logger.error(`Prisma error ${error.code}`, error);
          return new BadRequestError(`Database error ${error.code}`);
      }
    }
    this.logger.error('Unexpected community event error', error as Error);
    return error instanceof Error ? error : new Error('Unknown error');
  }
  // --- Seller-facing surface -------------------------------------------------
  // Events are authored by *business* accounts (from the app or the panel);
  // person accounts can only attend. Everything below is scoped to the session
  // seller - no caller ever names the author or the attendee.

  /**
   * Confirms the caller is a business account.
   *
   * `Seller` belongs to the users subgraph, so the type is read with raw SQL
   * against the shared database - the same approach other subgraphs use for
   * tables they do not own.
   */
  private async assertBusinessSeller(sellerId?: string): Promise<string> {
    if (!sellerId) throw new UnauthorizedError('Debes iniciar sesion');

    const rows = await this.prisma.$queryRaw<{ sellerType: string }[]>`
      SELECT "sellerType" FROM "Seller" WHERE id = ${sellerId} LIMIT 1`;
    const sellerType = rows[0]?.sellerType;

    if (!sellerType) throw new NotFoundError('Cuenta no encontrada');
    if (sellerType === 'PERSON') {
      throw new UnauthorizedError(
        'Solo las cuentas de empresa pueden crear eventos. Puedes inscribirte en los eventos publicados.',
      );
    }
    return sellerId;
  }

  /** Public event list. Upcoming first; past events are excluded by default. */
  async listPublicEvents({
    page,
    pageSize,
    includePast,
    organizerId,
    communityCategoryId,
    communitySubCategoryId,
  }: {
    page: number;
    pageSize: number;
    includePast?: boolean;
    organizerId?: string;
    communityCategoryId?: number;
    communitySubCategoryId?: number;
  }) {
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const where: Prisma.CommunityPostWhereInput = {
      // Cancelled events leave the public lists; registrants were emailed.
      status: 'SCHEDULED',
      ...(organizerId ? { organizerId } : {}),
      ...(communitySubCategoryId ? { communitySubCategoryId } : {}),
      ...(communityCategoryId
        ? { communitySubCategory: { communityCategoryId } }
        : {}),
      // An event with no date is treated as always-on (a tutorial, say), so it
      // is not filtered out with the past ones.
      ...(includePast
        ? {}
        : {
            OR: [
              { startDate: null },
              { startDate: { gte: new Date() } },
              { endDate: { gte: new Date() } },
            ],
          }),
    };

    const [count, rows] = await Promise.all([
      this.prisma.communityPost.count({ where }),
      this.prisma.communityPost.findMany({
        where,
        orderBy: [{ startDate: 'asc' }, { id: 'desc' }],
        skip,
        take,
        include: EVENT_INCLUDE,
      }),
    ]);

    return createPaginatedResponse(
      await this.withPlaces(rows.map((r) => this.mapEvent(r))),
      count,
      page,
      pageSize,
    );
  }

  async getPublicEvent(id: number) {
    const event = await this.prisma.communityPost.findUnique({
      where: { id },
      include: EVENT_INCLUDE,
    });
    if (!event) throw new NotFoundError('Evento no encontrado');
    return this.withPlace(this.mapEvent(event));
  }

  async createSellerEvent({
    sellerId,
    input,
  }: {
    sellerId?: string;
    input: CreateCommunityEventInput;
  }) {
    const organizer = await this.assertBusinessSeller(sellerId);
    this.assertDateRange(input.startDate, input.endDate);
    const communitySubCategoryId = await this.subCategoryFor(
      input.communitySubCategoryId,
      { required: true },
    );
    const location = await this.locationFor(input);
    try {
      const created = await this.prisma.communityPost.create({
        data: {
          // The business is the organiser. `authorId` is the Admin foreign
          // key and stays null; writing the seller id there failed every
          // app-created event (BLC-10).
          organizerId: organizer,
          communitySubCategoryId,
          title: input.title,
          content: input.content,
          coverImage: input.coverImage ?? null,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          capacity: input.capacity ?? null,
          ...location,
        },
        include: EVENT_INCLUDE,
      });
      return this.withPlace(this.mapEvent(created));
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  /** Loads an event and confirms the caller organises it. */
  // ─── Attendance (points) ───────────────────────────────────────────────────

  /** Everyone registered for an event the caller organises. */
  async listOwnEventAttendees({
    sellerId,
    id,
  }: {
    sellerId?: string;
    id: number;
  }) {
    await this.loadOwnEvent(id, sellerId);
    const rows = await this.prisma.communityPostRegistration.findMany({
      where: { communityPostId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        sellerId: true,
        attendedAt: true,
        createdAt: true,
      },
    });
    return rows.map(({ sellerId: account, ...row }) => ({
      ...row,
      hasAccount: !!account,
    }));
  }

  /**
   * The organiser confirms (or clears) that a registered person came.
   *
   * Confirming earns points once per registration (ekoru-users
   * docs/POINTS.md): ATTENDTOEVENT for the attendee and ORGANIZEEVENT for the
   * organiser, both only when the attendee registered with an Ekoru account
   * that is not the organiser's, and the organiser's only for the first
   * `ORGANIZER_POINTS_ATTENDEE_CAP` such attendees. Clearing the mark does
   * not take points back. Allowed from the event's start until
   * `ATTENDANCE_WINDOW_DAYS` after it, never on a cancelled event.
   */
  async setAttendance({
    sellerId,
    registrationId,
    attended,
    now = new Date(),
  }: {
    sellerId?: string;
    registrationId: number;
    attended: boolean;
    now?: Date;
  }) {
    const registration = await this.prisma.communityPostRegistration.findUnique(
      {
        where: { id: registrationId },
        select: { id: true, communityPostId: true, sellerId: true },
      },
    );
    if (!registration) throw new NotFoundError('Inscripción no encontrada');

    const event = await this.loadOwnEvent(
      registration.communityPostId,
      sellerId,
    );
    if (event.status === 'CANCELLED') {
      throw new BadRequestError('El evento fue cancelado');
    }
    if (event.startDate && event.startDate > now) {
      throw new BadRequestError(
        'La asistencia se confirma desde que comienza el evento',
      );
    }
    const last = event.endDate ?? event.startDate;
    if (
      last &&
      now.getTime() > last.getTime() + ATTENDANCE_WINDOW_DAYS * DAY_MS
    ) {
      throw new BadRequestError(
        `La asistencia se confirma hasta ${ATTENDANCE_WINDOW_DAYS} días después del evento`,
      );
    }

    // Only the first confirmation stamps the time; clearing sets null.
    const updated = await this.prisma.communityPostRegistration.update({
      where: { id: registrationId },
      data: attended
        ? { attendedAt: (await this.attendedAt(registrationId)) ?? now }
        : { attendedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        sellerId: true,
        attendedAt: true,
        createdAt: true,
      },
    });

    if (attended) {
      void this.awardAttendancePoints({
        eventId: event.id,
        organizerId: event.organizerId,
        registration: updated,
      });
    }

    const { sellerId: account, ...row } = updated;
    return { ...row, hasAccount: !!account };
  }

  private async attendedAt(registrationId: number): Promise<Date | null> {
    const row = await this.prisma.communityPostRegistration.findUnique({
      where: { id: registrationId },
      select: { attendedAt: true },
    });
    return row?.attendedAt ?? null;
  }

  private async awardAttendancePoints({
    eventId,
    organizerId,
    registration,
  }: {
    eventId: number;
    organizerId: string | null;
    registration: { id: number; sellerId: string | null };
  }): Promise<void> {
    const attendee = registration.sellerId;
    if (!attendee || attendee === organizerId) return;
    try {
      await this.users.awardActivityPoints({
        sellerId: attendee,
        kind: 'ATTENDTOEVENT',
        reference: `event-registration:${registration.id}`,
      });
      if (!organizerId) return;
      const confirmed = await this.prisma.communityPostRegistration.count({
        where: {
          communityPostId: eventId,
          attendedAt: { not: null },
          sellerId: { not: null },
          NOT: { sellerId: organizerId },
        },
      });
      if (confirmed > ORGANIZER_POINTS_ATTENDEE_CAP) return;
      await this.users.awardActivityPoints({
        sellerId: organizerId,
        kind: 'ORGANIZEEVENT',
        reference: `event-attendee:${registration.id}`,
      });
    } catch (error) {
      this.logger.error(
        `Attendance points failed for registration ${registration.id}`,
        error,
      );
    }
  }

  private async loadOwnEvent(id: number, sellerId?: string) {
    const organizer = await this.assertBusinessSeller(sellerId);
    const event = await this.prisma.communityPost.findUnique({
      where: { id },
      select: EDITABLE_SELECT,
    });
    if (!event) throw new NotFoundError('Evento no encontrado');
    if (event.organizerId !== organizer) {
      throw new UnauthorizedError(
        'Solo el organizador puede editar este evento',
      );
    }
    return event;
  }

  async updateSellerEvent({
    sellerId,
    id,
    input,
  }: {
    sellerId?: string;
    id: number;
    input: UpdateCommunityEventInput;
  }) {
    const existing = await this.loadOwnEvent(id, sellerId);
    return this.applyUpdate(existing, input);
  }

  async deleteSellerEvent({ sellerId, id }: { sellerId?: string; id: number }) {
    await this.loadOwnEvent(id, sellerId);
    // Deleting would silently drop people who reserved a place; cancelling
    // keeps the record and tells them.
    const registrations = await this.prisma.communityPostRegistration.count({
      where: { communityPostId: id },
    });
    if (registrations > 0) {
      throw new BadRequestError(
        'Este evento tiene inscritos: cancélalo para avisarles en vez de borrarlo',
      );
    }
    await this.prisma.communityPost.delete({ where: { id } });
    return true;
  }

  /**
   * Reserves a place. Open to any account - attending is what person accounts
   * are here for - and to guests, who supply their own name and email.
   *
   * Capacity is checked inside a transaction: two people racing for the last
   * place must not both get it.
   */
  async registerForEvent({
    eventId,
    name,
    email,
    sellerId,
    language,
  }: {
    eventId: number;
    name: string;
    email: string;
    sellerId?: string;
    language?: string;
  }) {
    const normalizedEmail = email.trim().toLowerCase();

    let event: Parameters<CommunityEventService['notifyRegistration']>[0];
    let registration: Awaited<
      ReturnType<PrismaService['communityPostRegistration']['create']>
    >;
    try {
      ({ event, registration } = await this.prisma.$transaction(async (tx) => {
        // Lock the event row so concurrent reservations queue up. Under the
        // default READ COMMITTED isolation two transactions could otherwise
        // both count capacity - 1 and both take the last place.
        await tx.$queryRaw`SELECT "id" FROM "CommunityPost" WHERE "id" = ${eventId} FOR UPDATE`;

        const event = await tx.communityPost.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            title: true,
            capacity: true,
            startDate: true,
            endDate: true,
            organizerId: true,
            status: true,
            locationType: true,
            address: true,
            countyId: true,
            onlineUrl: true,
          },
        });
        if (!event) throw new NotFoundError('Evento no encontrado');
        if (event.status === 'CANCELLED') {
          throw new BadRequestError('Este evento fue cancelado');
        }

        const closesAt = event.endDate ?? event.startDate;
        if (closesAt && closesAt.getTime() < Date.now()) {
          throw new BadRequestError('Este evento ya termino');
        }

        if (event.capacity != null) {
          const taken = await tx.communityPostRegistration.count({
            where: { communityPostId: eventId },
          });
          if (taken >= event.capacity) {
            throw new BadRequestError('No quedan cupos para este evento');
          }
        }

        const registration = await tx.communityPostRegistration.create({
          data: {
            communityPostId: eventId,
            name: name.trim(),
            email: normalizedEmail,
            sellerId: sellerId ?? null,
          },
        });
        return { event, registration };
      }));
    } catch (error) {
      throw this.friendlyError(error);
    }

    // Fire and forget: the place is reserved whatever happens to the email.
    void this.notifyRegistration(event, registration, language).catch(
      (err: unknown) =>
        this.logger.error(
          `Registration notifications for event ${event.id} failed`,
          err as Error,
        ),
    );
    return registration;
  }

  /** The signed-in attendee's own reservations. */
  async myRegistrations({
    sellerId,
    page,
    pageSize,
  }: {
    sellerId?: string;
    page: number;
    pageSize: number;
  }) {
    if (!sellerId) throw new UnauthorizedError('Debes iniciar sesion');
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const where = { sellerId };
    const [count, rows] = await Promise.all([
      this.prisma.communityPostRegistration.count({ where }),
      this.prisma.communityPostRegistration.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
    ]);

    return createPaginatedResponse(rows, count, page, pageSize);
  }

  /** Attendees cancel their own reservation, freeing the place. */
  async cancelMyRegistration({
    sellerId,
    id,
  }: {
    sellerId?: string;
    id: number;
  }) {
    if (!sellerId) throw new UnauthorizedError('Debes iniciar sesion');

    const registration = await this.prisma.communityPostRegistration.findUnique(
      {
        where: { id },
        select: {
          sellerId: true,
          name: true,
          communityPost: {
            select: { id: true, title: true, organizerId: true },
          },
        },
      },
    );
    if (!registration) return false;
    if (registration.sellerId !== sellerId) {
      throw new UnauthorizedError('Solo puedes cancelar tu propia inscripcion');
    }

    await this.prisma.communityPostRegistration.delete({ where: { id } });

    const event = registration.communityPost;
    if (event.organizerId) {
      void this.users
        .notify({
          sellerId: event.organizerId,
          type: 'EVENT_REGISTRATION_CANCELLED',
          relatedId: event.id,
          actionUrl: '/community',
          data: { attendeeName: registration.name, eventTitle: event.title },
        })
        .catch((err: unknown) =>
          this.logger.error(
            `Cancellation notice for event ${event.id} failed`,
            err as Error,
          ),
        );
    }
    return true;
  }
}
