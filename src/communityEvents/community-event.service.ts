import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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

type EventRow = Prisma.CommunityPostGetPayload<{
  include: { _count: { select: { registrations: true } } };
}>;

/**
 * Community Event Service — admin CRUD over community events (the CommunityPost
 * table) and read/management of their registrations.
 *
 * Writes require an authenticated admin; the event's `authorId` is the acting
 * admin. Registrations are written by the web app when users register — this
 * service only lists and removes them, and derives capacity math.
 */
@Injectable()
export class CommunityEventService {
  private readonly logger = new Logger(CommunityEventService.name);

  constructor(private readonly prisma: PrismaService) {}

  private requireAdmin(adminId?: string): string {
    if (!adminId) throw new UnauthorizedError('Admin authentication required');
    return adminId;
  }

  /** Attaches computed registrationCount + remainingCapacity to a raw row. */
  private mapEvent(row: EventRow) {
    const registrationCount = row._count.registrations;
    const remainingCapacity =
      row.capacity == null
        ? null
        : Math.max(0, row.capacity - registrationCount);
    return { ...row, registrationCount, remainingCapacity };
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
    this.requireAdmin(adminId);
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
        include: { _count: { select: { registrations: true } } },
      }),
    ]);

    return createPaginatedResponse(
      rows.map((r) => this.mapEvent(r)),
      count,
      page,
      pageSize,
    );
  }

  async getEvent({ adminId, id }: { adminId?: string; id: number }) {
    this.requireAdmin(adminId);
    const event = await this.prisma.communityPost.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } },
    });
    if (!event) throw new NotFoundError('Community event not found');
    return this.mapEvent(event);
  }

  async createEvent({
    adminId,
    input,
  }: {
    adminId?: string;
    input: CreateCommunityEventInput;
  }) {
    const author = this.requireAdmin(adminId);
    this.assertDateRange(input.startDate, input.endDate);
    try {
      const created = await this.prisma.communityPost.create({
        data: {
          authorId: author,
          title: input.title,
          content: input.content,
          coverImage: input.coverImage ?? null,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          capacity: input.capacity ?? null,
        },
        include: { _count: { select: { registrations: true } } },
      });
      return this.mapEvent(created);
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
    this.requireAdmin(adminId);
    const existing = await this.prisma.communityPost.findUnique({
      where: { id },
      select: { startDate: true, endDate: true },
    });
    if (!existing) throw new NotFoundError('Community event not found');

    // Validate the effective range after applying the partial update.
    const startDate =
      input.startDate !== undefined ? input.startDate : existing.startDate;
    const endDate =
      input.endDate !== undefined ? input.endDate : existing.endDate;
    this.assertDateRange(startDate, endDate);

    try {
      const updated = await this.prisma.communityPost.update({
        where: { id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.content !== undefined && { content: input.content }),
          ...(input.coverImage !== undefined && {
            coverImage: input.coverImage,
          }),
          ...(input.startDate !== undefined && { startDate: input.startDate }),
          ...(input.endDate !== undefined && { endDate: input.endDate }),
          ...(input.capacity !== undefined && { capacity: input.capacity }),
        },
        include: { _count: { select: { registrations: true } } },
      });
      return this.mapEvent(updated);
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async deleteEvent({ adminId, id }: { adminId?: string; id: number }) {
    this.requireAdmin(adminId);
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
    this.requireAdmin(adminId);
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
    this.requireAdmin(adminId);
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
    authorId,
  }: {
    page: number;
    pageSize: number;
    includePast?: boolean;
    authorId?: string;
  }) {
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const where: Prisma.CommunityPostWhereInput = {
      ...(authorId ? { authorId } : {}),
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
        include: { _count: { select: { registrations: true } } },
      }),
    ]);

    return createPaginatedResponse(
      rows.map((r) => this.mapEvent(r)),
      count,
      page,
      pageSize,
    );
  }

  async getPublicEvent(id: number) {
    const event = await this.prisma.communityPost.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } },
    });
    if (!event) throw new NotFoundError('Evento no encontrado');
    return this.mapEvent(event);
  }

  async createSellerEvent({
    sellerId,
    input,
  }: {
    sellerId?: string;
    input: CreateCommunityEventInput;
  }) {
    const author = await this.assertBusinessSeller(sellerId);
    this.assertDateRange(input.startDate, input.endDate);
    try {
      const created = await this.prisma.communityPost.create({
        data: {
          authorId: author,
          title: input.title,
          content: input.content,
          coverImage: input.coverImage ?? null,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          capacity: input.capacity ?? null,
        },
        include: { _count: { select: { registrations: true } } },
      });
      return this.mapEvent(created);
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  /** Loads an event and confirms the caller authored it. */
  private async loadOwnEvent(id: number, sellerId?: string) {
    const author = await this.assertBusinessSeller(sellerId);
    const event = await this.prisma.communityPost.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!event) throw new NotFoundError('Evento no encontrado');
    if (event.authorId !== author) {
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
    await this.loadOwnEvent(id, sellerId);
    this.assertDateRange(input.startDate, input.endDate);
    try {
      const updated = await this.prisma.communityPost.update({
        where: { id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.content !== undefined && { content: input.content }),
          ...(input.coverImage !== undefined && {
            coverImage: input.coverImage,
          }),
          ...(input.startDate !== undefined && { startDate: input.startDate }),
          ...(input.endDate !== undefined && { endDate: input.endDate }),
          ...(input.capacity !== undefined && { capacity: input.capacity }),
        },
        include: { _count: { select: { registrations: true } } },
      });
      return this.mapEvent(updated);
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async deleteSellerEvent({ sellerId, id }: { sellerId?: string; id: number }) {
    await this.loadOwnEvent(id, sellerId);
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
  }: {
    eventId: number;
    name: string;
    email: string;
    sellerId?: string;
  }) {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const event = await tx.communityPost.findUnique({
          where: { id: eventId },
          select: { id: true, capacity: true, startDate: true, endDate: true },
        });
        if (!event) throw new NotFoundError('Evento no encontrado');

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

        return tx.communityPostRegistration.create({
          data: {
            communityPostId: eventId,
            name: name.trim(),
            email: normalizedEmail,
            sellerId: sellerId ?? null,
          },
        });
      });
    } catch (error) {
      throw this.friendlyError(error);
    }
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
        select: { sellerId: true },
      },
    );
    if (!registration) return false;
    if (registration.sellerId !== sellerId) {
      throw new UnauthorizedError('Solo puedes cancelar tu propia inscripcion');
    }

    await this.prisma.communityPostRegistration.delete({ where: { id } });
    return true;
  }
}
