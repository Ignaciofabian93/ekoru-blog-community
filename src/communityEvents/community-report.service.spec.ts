import { Prisma } from '@prisma/client';
import { CommunityReportService } from './community-report.service';
import { CommunityEventService } from './community-event.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityReportAction } from '../graphql/enums';

const report = {
  id: 1,
  communityPostId: 3,
  reporterId: 'person-1',
  reason: 'SPAM',
  details: null,
  status: 'OPEN',
  resolvedById: null,
  resolvedAt: null,
  resolutionNote: null,
  createdAt: new Date(),
  communityPost: {
    title: 'Charla',
    status: 'SCHEDULED',
    organizerId: 'seller-1',
  },
};

function makePrisma({
  event = { organizerId: 'seller-1' } as { organizerId: string | null } | null,
  admin = {
    adminType: 'PLATFORM',
    role: 'MODERATOR',
    permissions: ['MODERATE_CONTENT'],
    isActive: true,
  },
}: {
  event?: { organizerId: string | null } | null;
  admin?: Record<string, unknown> | null;
} = {}) {
  return {
    $queryRaw: jest.fn(() => Promise.resolve(admin ? [admin] : [])),
    communityPost: { findUnique: jest.fn(() => Promise.resolve(event)) },
    communityPostReport: {
      create: jest.fn(() => Promise.resolve({ id: 1 })),
      findUnique: jest.fn(() => Promise.resolve(report)),
      findMany: jest.fn(() => Promise.resolve([report])),
      count: jest.fn(() => Promise.resolve(1)),
      update: jest.fn(() => Promise.resolve(report)),
      updateMany: jest.fn(() => Promise.resolve({ count: 2 })),
      groupBy: jest.fn(() =>
        Promise.resolve([{ communityPostId: 3, _count: { _all: 2 } }]),
      ),
    },
  };
}

const makeEvents = () => ({
  cancelAdminEvent: jest.fn(() => Promise.resolve({})),
});

const service = (
  prisma: ReturnType<typeof makePrisma>,
  events = makeEvents(),
) =>
  new CommunityReportService(
    prisma as unknown as PrismaService,
    events as unknown as CommunityEventService,
  );

describe('CommunityReportService', () => {
  describe('report', () => {
    it('needs an account, an existing event and someone else’s event', async () => {
      await expect(
        service(makePrisma()).report({ eventId: 3, reason: 'SPAM' }),
      ).rejects.toThrow(/iniciar sesion/);
      await expect(
        service(makePrisma({ event: null })).report({
          sellerId: 'person-1',
          eventId: 3,
          reason: 'SPAM',
        }),
      ).rejects.toThrow(/no encontrado/);
      await expect(
        service(makePrisma()).report({
          sellerId: 'seller-1',
          eventId: 3,
          reason: 'SPAM',
        }),
      ).rejects.toThrow(/propio evento/);
    });

    it('stores the report with trimmed details', async () => {
      const prisma = makePrisma();
      await expect(
        service(prisma).report({
          sellerId: 'person-1',
          eventId: 3,
          reason: 'SCAM',
          details: '  pide transferencias  ',
        }),
      ).resolves.toBe(true);
      expect(prisma.communityPostReport.create).toHaveBeenCalledWith({
        data: {
          communityPostId: 3,
          reporterId: 'person-1',
          reason: 'SCAM',
          details: 'pide transferencias',
        },
      });
    });

    it('treats a repeat report as done', async () => {
      const prisma = makePrisma();
      prisma.communityPostReport.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(
        service(prisma).report({
          sellerId: 'person-1',
          eventId: 3,
          reason: 'SPAM',
        }),
      ).resolves.toBe(true);
    });
  });

  describe('moderation', () => {
    it('lists the OPEN queue by default, with open counts per event', async () => {
      const prisma = makePrisma();
      const page = await service(prisma).list({
        adminId: 'a1',
        page: 1,
        pageSize: 20,
      });
      expect(prisma.communityPostReport.findMany.mock.calls[0]).toEqual([
        expect.objectContaining({ where: { status: 'OPEN' } }),
      ]);
      expect(page.nodes[0]).toMatchObject({
        eventTitle: 'Charla',
        eventStatus: 'SCHEDULED',
        openReportsOnEvent: 2,
      });
    });

    it('refuses admins without MODERATE_CONTENT', async () => {
      const prisma = makePrisma({
        admin: {
          adminType: 'PLATFORM',
          role: 'MODERATOR',
          permissions: [],
          isActive: true,
        },
      });
      await expect(
        service(prisma).list({ adminId: 'a1', page: 1, pageSize: 20 }),
      ).rejects.toThrow(/MODERATE_CONTENT/);
    });

    it('dismisses one report', async () => {
      const prisma = makePrisma();
      const events = makeEvents();
      await service(prisma, events).resolve({
        adminId: 'a1',
        id: 1,
        action: CommunityReportAction.DISMISS,
        note: ' fine ',
      });
      expect(prisma.communityPostReport.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          status: 'DISMISSED',
          resolvedById: 'a1',
          resolutionNote: 'fine',
        }),
      });
      expect(events.cancelAdminEvent).not.toHaveBeenCalled();
    });

    it('cancels the event and closes every open report on it', async () => {
      const prisma = makePrisma();
      const events = makeEvents();
      await service(prisma, events).resolve({
        adminId: 'a1',
        id: 1,
        action: CommunityReportAction.CANCEL_EVENT,
        note: 'Estafa confirmada',
        language: 'ES',
      });
      expect(events.cancelAdminEvent).toHaveBeenCalledWith({
        adminId: 'a1',
        id: 3,
        reason: 'Estafa confirmada',
        language: 'ES',
      });
      expect(prisma.communityPostReport.updateMany).toHaveBeenCalledWith({
        where: { communityPostId: 3, status: 'OPEN' },
        data: expect.objectContaining({
          status: 'ACTIONED',
          resolvedById: 'a1',
        }),
      });
    });
  });
});
