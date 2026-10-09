import { Injectable } from '@nestjs/common';
import {
  CommunityReportReason,
  CommunityReportStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertAdminCan } from '../common/admin-access';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../common/exceptions';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils';
import { CommunityReportAction } from '../graphql/enums';
import { CommunityEventService } from './community-event.service';

const REPORT_INCLUDE = {
  communityPost: { select: { title: true, status: true, organizerId: true } },
} satisfies Prisma.CommunityPostReportInclude;

type ReportRow = Prisma.CommunityPostReportGetPayload<{
  include: typeof REPORT_INCLUDE;
}>;

/**
 * Reports on community events (EK-23). Anyone signed in can flag an event
 * once; moderators with MODERATE_CONTENT dismiss the report or cancel the
 * event, which tells its registrants (BLC-6).
 */
@Injectable()
export class CommunityReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: CommunityEventService,
  ) {}

  async report({
    sellerId,
    eventId,
    reason,
    details,
  }: {
    sellerId?: string;
    eventId: number;
    reason: CommunityReportReason;
    details?: string | null;
  }): Promise<boolean> {
    if (!sellerId) throw new UnauthorizedError('Debes iniciar sesion');

    const event = await this.prisma.communityPost.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });
    if (!event) throw new NotFoundError('Evento no encontrado');
    if (event.organizerId === sellerId) {
      throw new BadRequestError('No puedes reportar tu propio evento');
    }

    try {
      await this.prisma.communityPostReport.create({
        data: {
          communityPostId: eventId,
          reporterId: sellerId,
          reason,
          details: details?.trim() || null,
        },
      });
    } catch (error) {
      // One report per account per event: a repeat is not an error for the user.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return true;
      }
      throw error;
    }
    return true;
  }

  async list({
    adminId,
    status,
    page,
    pageSize,
  }: {
    adminId?: string;
    status?: CommunityReportStatus;
    page: number;
    pageSize: number;
  }) {
    await assertAdminCan(this.prisma, adminId, 'MODERATE_CONTENT');
    const { skip, take } = calculatePrismaParams(page, pageSize);
    const where: Prisma.CommunityPostReportWhereInput = {
      status: status ?? CommunityReportStatus.OPEN,
    };
    const [count, rows] = await Promise.all([
      this.prisma.communityPostReport.count({ where }),
      this.prisma.communityPostReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: REPORT_INCLUDE,
      }),
    ]);
    return createPaginatedResponse(
      await this.withOpenCounts(rows),
      count,
      page,
      pageSize,
    );
  }

  async resolve({
    adminId,
    id,
    action,
    note,
    language,
  }: {
    adminId?: string;
    id: number;
    action: CommunityReportAction;
    note?: string | null;
    language?: string;
  }) {
    const admin = await assertAdminCan(
      this.prisma,
      adminId,
      'MODERATE_CONTENT',
    );
    const report = await this.prisma.communityPostReport.findUnique({
      where: { id },
      select: { communityPostId: true },
    });
    if (!report) throw new NotFoundError('Report not found');

    const resolution = {
      resolvedById: admin,
      resolvedAt: new Date(),
      resolutionNote: note?.trim() || null,
    };

    if (action === CommunityReportAction.CANCEL_EVENT) {
      // Cancelling tells every registrant (BLC-6); the note is their reason.
      await this.events.cancelAdminEvent({
        adminId,
        id: report.communityPostId,
        reason: note?.trim() || null,
        language,
      });
      // Every open report on the event is settled by the same decision.
      await this.prisma.communityPostReport.updateMany({
        where: {
          communityPostId: report.communityPostId,
          status: CommunityReportStatus.OPEN,
        },
        data: { status: CommunityReportStatus.ACTIONED, ...resolution },
      });
    } else {
      await this.prisma.communityPostReport.update({
        where: { id },
        data: { status: CommunityReportStatus.DISMISSED, ...resolution },
      });
    }

    const updated = await this.prisma.communityPostReport.findUnique({
      where: { id },
      include: REPORT_INCLUDE,
    });
    const [mapped] = await this.withOpenCounts([updated!]);
    return mapped;
  }

  /** Flattens the event fields and adds how many reports on it are still open. */
  private async withOpenCounts(rows: ReportRow[]) {
    const ids = [...new Set(rows.map((r) => r.communityPostId))];
    const counts = ids.length
      ? await this.prisma.communityPostReport.groupBy({
          by: ['communityPostId'],
          where: {
            communityPostId: { in: ids },
            status: CommunityReportStatus.OPEN,
          },
          _count: { _all: true },
        })
      : [];
    const open = new Map(counts.map((c) => [c.communityPostId, c._count._all]));
    return rows.map(({ communityPost, ...report }) => ({
      ...report,
      eventTitle: communityPost.title,
      eventStatus: communityPost.status,
      eventOrganizerId: communityPost.organizerId,
      openReportsOnEvent: open.get(report.communityPostId) ?? 0,
    }));
  }
}
