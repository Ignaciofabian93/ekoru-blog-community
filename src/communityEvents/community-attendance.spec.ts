import {
  ATTENDANCE_WINDOW_DAYS,
  CommunityEventService,
  ORGANIZER_POINTS_ATTENDEE_CAP,
} from './community-event.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersClient } from '../common/clients/users.client';
import { ConfigService } from '@nestjs/config';

const NOW = new Date('2026-10-20T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function setup({
  event = {},
  registration = {},
  confirmed = 1,
}: {
  event?: Record<string, unknown>;
  registration?: Record<string, unknown>;
  confirmed?: number;
} = {}) {
  const reg = {
    id: 9,
    communityPostId: 1,
    name: 'Ana',
    email: 'ana@example.com',
    sellerId: 'attendee-1',
    attendedAt: null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    ...registration,
  };
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ sellerType: 'COMPANY' }]),
    communityPost: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        status: 'SCHEDULED',
        organizerId: 'org-1',
        startDate: new Date(NOW.getTime() - 2 * DAY),
        endDate: null,
        ...event,
      }),
    },
    communityPostRegistration: {
      findUnique: jest.fn().mockResolvedValue(reg),
      update: jest.fn(({ data }: { data: { attendedAt: Date | null } }) =>
        Promise.resolve({ ...reg, attendedAt: data.attendedAt }),
      ),
      count: jest.fn().mockResolvedValue(confirmed),
      findMany: jest.fn().mockResolvedValue([reg]),
    },
  };
  const users = { awardActivityPoints: jest.fn().mockResolvedValue(10) };
  const service = new CommunityEventService(
    prisma as unknown as PrismaService,
    users as unknown as UsersClient,
    { get: jest.fn() } as unknown as ConfigService,
  );
  return { prisma, users, service };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('event attendance (points)', () => {
  it('lists registrants to the organiser without exposing seller ids', async () => {
    const { service } = setup();
    const rows = await service.listOwnEventAttendees({
      sellerId: 'org-1',
      id: 1,
    });
    expect(rows[0]).toMatchObject({ id: 9, name: 'Ana', hasAccount: true });
    expect(rows[0]).not.toHaveProperty('sellerId');
  });

  it('refuses anyone but the organiser', async () => {
    const { service } = setup();
    await expect(
      service.setAttendance({
        sellerId: 'someone-else',
        registrationId: 9,
        attended: true,
        now: NOW,
      }),
    ).rejects.toThrow('Solo el organizador');
  });

  it('confirming pays the attendee and the organiser, once each', async () => {
    const { prisma, users, service } = setup();

    const row = await service.setAttendance({
      sellerId: 'org-1',
      registrationId: 9,
      attended: true,
      now: NOW,
    });
    await flush();

    expect(row.attendedAt).toEqual(NOW);
    expect(prisma.communityPostRegistration.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attendedAt: NOW } }),
    );
    expect(users.awardActivityPoints).toHaveBeenCalledWith({
      sellerId: 'attendee-1',
      kind: 'ATTENDTOEVENT',
      reference: 'event-registration:9',
    });
    expect(users.awardActivityPoints).toHaveBeenCalledWith({
      sellerId: 'org-1',
      kind: 'ORGANIZEEVENT',
      reference: 'event-attendee:9',
    });
  });

  it('pays nobody for a guest without an account', async () => {
    const { users, service } = setup({ registration: { sellerId: null } });
    await service.setAttendance({
      sellerId: 'org-1',
      registrationId: 9,
      attended: true,
      now: NOW,
    });
    await flush();
    expect(users.awardActivityPoints).not.toHaveBeenCalled();
  });

  it('pays nobody when organisers mark themselves', async () => {
    const { users, service } = setup({ registration: { sellerId: 'org-1' } });
    await service.setAttendance({
      sellerId: 'org-1',
      registrationId: 9,
      attended: true,
      now: NOW,
    });
    await flush();
    expect(users.awardActivityPoints).not.toHaveBeenCalled();
  });

  it('stops paying the organiser past the attendee cap', async () => {
    const { users, service } = setup({
      confirmed: ORGANIZER_POINTS_ATTENDEE_CAP + 1,
    });
    await service.setAttendance({
      sellerId: 'org-1',
      registrationId: 9,
      attended: true,
      now: NOW,
    });
    await flush();
    expect(users.awardActivityPoints).toHaveBeenCalledTimes(1);
    expect(users.awardActivityPoints).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'ATTENDTOEVENT' }),
    );
  });

  it('clearing the mark pays nothing and keeps points', async () => {
    const { prisma, users, service } = setup();
    await service.setAttendance({
      sellerId: 'org-1',
      registrationId: 9,
      attended: false,
      now: NOW,
    });
    await flush();
    expect(prisma.communityPostRegistration.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attendedAt: null } }),
    );
    expect(users.awardActivityPoints).not.toHaveBeenCalled();
  });

  it('refuses before the event starts, after the window, and when cancelled', async () => {
    const before = setup({
      event: { startDate: new Date(NOW.getTime() + DAY) },
    });
    await expect(
      before.service.setAttendance({
        sellerId: 'org-1',
        registrationId: 9,
        attended: true,
        now: NOW,
      }),
    ).rejects.toThrow('desde que comienza');

    const late = setup({
      event: {
        startDate: new Date(NOW.getTime() - (ATTENDANCE_WINDOW_DAYS + 5) * DAY),
        endDate: new Date(NOW.getTime() - (ATTENDANCE_WINDOW_DAYS + 1) * DAY),
      },
    });
    await expect(
      late.service.setAttendance({
        sellerId: 'org-1',
        registrationId: 9,
        attended: true,
        now: NOW,
      }),
    ).rejects.toThrow('días después');

    const cancelled = setup({ event: { status: 'CANCELLED' } });
    await expect(
      cancelled.service.setAttendance({
        sellerId: 'org-1',
        registrationId: 9,
        attended: true,
        now: NOW,
      }),
    ).rejects.toThrow('cancelado');
  });
});
