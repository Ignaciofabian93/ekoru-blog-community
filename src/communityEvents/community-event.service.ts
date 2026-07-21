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
}
