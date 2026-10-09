import { CommunityEventService } from './community-event.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersClient } from '../common/clients/users.client';
import { ConfigService } from '@nestjs/config';

type Sql = TemplateStringsArray;

/**
 * Prisma double. Raw SQL is answered by what the query reads: the seller's
 * type, whether a county exists, or the county/city/region names.
 */
function makePrisma({
  sellerType = 'BUSINESS',
  counties = [7],
  subCategories = { 5: true, 6: false } as Record<number, boolean>,
  stored,
  registration,
  registrants = [],
}: {
  sellerType?: string | null;
  counties?: number[];
  subCategories?: Record<number, boolean>;
  stored?: Record<string, unknown>;
  registration?: Record<string, unknown>;
  registrants?: Array<{ name: string; email: string; sellerId: string | null }>;
} = {}) {
  const queryRaw = jest.fn((strings: Sql, ...values: unknown[]) => {
    const sql = strings.join('?');
    if (sql.includes('"sellerType"')) {
      return Promise.resolve(sellerType ? [{ sellerType }] : []);
    }
    if (sql.includes('JOIN "City"')) {
      return Promise.resolve(
        counties.map((id) => ({
          id,
          county: 'Ñuñoa',
          city: 'Santiago',
          region: 'Metropolitana',
          cityId: 1,
          regionId: 13,
        })),
      );
    }
    if (sql.includes('FROM "County"')) {
      const id = values[0] as number;
      return Promise.resolve(counties.includes(id) ? [{ id }] : []);
    }
    return Promise.resolve([]);
  });
  const row = (data: Record<string, unknown>) => ({
    id: 1,
    title: 'Taller',
    content: 'Reparación de bicicletas',
    coverImage: null,
    startDate: null,
    endDate: null,
    capacity: null,
    likes: 0,
    authorId: null,
    organizerId: null,
    status: 'SCHEDULED',
    cancelledAt: null,
    cancellationReason: null,
    locationType: 'IN_PERSON',
    address: null,
    countyId: null,
    onlineUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { registrations: 0 },
    communitySubCategory:
      (data.communitySubCategoryId ?? stored?.communitySubCategoryId)
        ? { communityCategoryId: 2 }
        : null,
    ...data,
  });
  const prisma = {
    $queryRaw: queryRaw,
    communitySubCategory: {
      findUnique: jest.fn(({ where }: { where: { id: number } }) =>
        Promise.resolve(
          where.id in subCategories
            ? { isActive: subCategories[where.id] }
            : null,
        ),
      ),
    },
    communityPost: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(row(data)),
      ),
      update: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(row({ ...stored, ...data })),
      ),
      findUnique: jest.fn(() => Promise.resolve(stored ? row(stored) : null)),
      findMany: jest.fn(() => Promise.resolve([row({ countyId: 7 })])),
      count: jest.fn(() => Promise.resolve(1)),
    },
    communityPostRegistration: {
      count: jest.fn(() => Promise.resolve(registrants.length)),
      findMany: jest.fn(() => Promise.resolve(registrants)),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 9, ...data }),
      ),
      findUnique: jest.fn(() => Promise.resolve(registration ?? null)),
      delete: jest.fn(() => Promise.resolve({})),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma),
  );
  return prisma;
}

const makeUsers = () => ({
  notify: jest.fn(() => Promise.resolve(true)),
  sendEventRegistrationEmail: jest.fn(() => Promise.resolve(true)),
  sendEventCancelledEmails: jest.fn(() => Promise.resolve(1)),
});
let users = makeUsers();
beforeEach(() => {
  users = makeUsers();
});
const config = {
  get: (key: string) =>
    key === 'webAppUrl' ? 'https://app.ekoru.cl' : undefined,
} as unknown as ConfigService;

const service = (prisma: ReturnType<typeof makePrisma>) =>
  new CommunityEventService(
    prisma as unknown as PrismaService,
    users as unknown as UsersClient,
    config,
  );

/** Lets fire-and-forget notifications settle. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

const inPerson = {
  title: 'Taller',
  content: 'Reparación de bicicletas',
  address: 'Av. Irarrázaval 1000',
  countyId: 7,
  communitySubCategoryId: 5,
};

describe('CommunityEventService (organiser and location)', () => {
  it('records the business as organizer, never as the Admin author', async () => {
    const prisma = makePrisma();
    const event = await service(prisma).createSellerEvent({
      sellerId: 'seller-1',
      input: inPerson,
    });
    const { data } = prisma.communityPost.create.mock.calls[0][0];
    expect(data.organizerId).toBe('seller-1');
    expect(data.authorId).toBeUndefined();
    expect(data).toMatchObject({
      locationType: 'IN_PERSON',
      address: 'Av. Irarrázaval 1000',
      countyId: 7,
      onlineUrl: null,
    });
    expect(event).toMatchObject({ countyName: 'Ñuñoa', cityName: 'Santiago' });
  });

  it('refuses person accounts', async () => {
    const prisma = makePrisma({ sellerType: 'PERSON' });
    await expect(
      service(prisma).createSellerEvent({ sellerId: 's', input: inPerson }),
    ).rejects.toThrow(/cuentas de empresa/);
    expect(prisma.communityPost.create).not.toHaveBeenCalled();
  });

  it('rejects an incomplete location and an unknown county', async () => {
    const prisma = makePrisma();
    await expect(
      service(prisma).createSellerEvent({
        sellerId: 's',
        input: {
          title: 'T',
          content: 'Contenido largo',
          communitySubCategoryId: 5,
        },
      }),
    ).rejects.toThrow(/dirección y la comuna/);
    await expect(
      service(prisma).createSellerEvent({
        sellerId: 's',
        input: { ...inPerson, countyId: 999 },
      }),
    ).rejects.toThrow(/comuna indicada no existe/);
    expect(prisma.communityPost.create).not.toHaveBeenCalled();
  });

  it('lets only the organiser edit, and clears the address when going online', async () => {
    const stored = {
      id: 1,
      organizerId: 'seller-1',
      locationType: 'IN_PERSON',
      address: 'Calle 1',
      countyId: 7,
    };
    const other = makePrisma({ stored });
    await expect(
      service(other).updateSellerEvent({
        sellerId: 'seller-2',
        id: 1,
        input: { title: 'Nuevo' },
      }),
    ).rejects.toThrow(/Solo el organizador/);

    const prisma = makePrisma({ stored });
    await service(prisma).updateSellerEvent({
      sellerId: 'seller-1',
      id: 1,
      input: { locationType: 'ONLINE', onlineUrl: 'https://meet.ekoru.cl/x' },
    });
    const { data } = prisma.communityPost.update.mock.calls[0][0];
    expect(data).toMatchObject({
      locationType: 'ONLINE',
      address: null,
      countyId: null,
      onlineUrl: 'https://meet.ekoru.cl/x',
    });
  });

  it('leaves the location alone on updates that do not touch it', async () => {
    const prisma = makePrisma({
      stored: { id: 1, organizerId: 'seller-1' },
    });
    await service(prisma).updateSellerEvent({
      sellerId: 'seller-1',
      id: 1,
      input: { title: 'Nuevo' },
    });
    const { data } = prisma.communityPost.update.mock.calls[0][0];
    expect(data).toEqual({ title: 'Nuevo' });
  });

  it('filters the public list by organiser and fills in place names', async () => {
    const prisma = makePrisma();
    const page = await service(prisma).listPublicEvents({
      page: 1,
      pageSize: 12,
      organizerId: 'seller-1',
    });
    const [{ where }] = prisma.communityPost.findMany.mock
      .calls[0] as unknown as [{ where: Record<string, unknown> }];
    expect(where.organizerId).toBe('seller-1');
    expect(page.nodes[0]).toMatchObject({
      countyName: 'Ñuñoa',
      regionName: 'Metropolitana',
    });
  });
  it('requires an active subcategory on new events', async () => {
    const prisma = makePrisma();
    const { communitySubCategoryId: _omit, ...noSub } = inPerson;
    void _omit;
    await expect(
      service(prisma).createSellerEvent({ sellerId: 's', input: noSub }),
    ).rejects.toThrow(/Elige la categoría/);
    await expect(
      service(prisma).createSellerEvent({
        sellerId: 's',
        input: { ...inPerson, communitySubCategoryId: 6 },
      }),
    ).rejects.toThrow(/no existe/);
    expect(prisma.communityPost.create).not.toHaveBeenCalled();

    const event = await service(prisma).createSellerEvent({
      sellerId: 's',
      input: inPerson,
    });
    expect(prisma.communityPost.create.mock.calls[0][0].data).toMatchObject({
      communitySubCategoryId: 5,
    });
    expect(event).toMatchObject({
      communitySubCategoryId: 5,
      communityCategoryId: 2,
    });
  });

  it('does not let an update clear the subcategory', async () => {
    const prisma = makePrisma({
      stored: { id: 1, organizerId: 'seller-1', communitySubCategoryId: 5 },
    });
    await expect(
      service(prisma).updateSellerEvent({
        sellerId: 'seller-1',
        id: 1,
        input: { communitySubCategoryId: null },
      }),
    ).rejects.toThrow(/Elige la categoría/);
  });

  it('filters the public list by category through the subcategory', async () => {
    const prisma = makePrisma();
    await service(prisma).listPublicEvents({
      page: 1,
      pageSize: 12,
      communityCategoryId: 2,
    });
    await service(prisma).listPublicEvents({
      page: 1,
      pageSize: 12,
      communitySubCategoryId: 5,
    });
    const calls = prisma.communityPost.findMany.mock.calls as unknown as [
      { where: Record<string, unknown> },
    ][];
    expect(calls[0][0].where.communitySubCategory).toEqual({
      communityCategoryId: 2,
    });
    expect(calls[1][0].where.communitySubCategoryId).toBe(5);
  });

  it('emails the attendee and notifies the organiser after a reservation', async () => {
    const prisma = makePrisma({
      stored: {
        id: 3,
        title: 'Taller de bicis',
        organizerId: 'seller-1',
        address: 'Av. Irarrázaval 1000',
        countyId: 7,
        startDate: new Date('2099-01-01T15:00:00Z'),
      },
    });
    const registration = await service(prisma).registerForEvent({
      eventId: 3,
      name: ' Ana ',
      email: 'ANA@example.com',
      language: 'EN',
    });
    expect(registration).toMatchObject({
      name: 'Ana',
      email: 'ana@example.com',
    });
    await settle();

    expect(users.sendEventRegistrationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ana@example.com',
        language: 'en',
        eventTitle: 'Taller de bicis',
        place: 'Av. Irarrázaval 1000, Ñuñoa, Santiago',
        onlineUrl: null,
        eventUrl: 'https://app.ekoru.cl/en/community',
      }),
    );
    expect(users.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: 'seller-1',
        type: 'EVENT_REGISTRATION_RECEIVED',
        data: { attendeeName: 'Ana', eventTitle: 'Taller de bicis' },
      }),
    );
  });

  it('does not notify an organiser for events EKORU runs itself', async () => {
    const prisma = makePrisma({
      stored: { id: 3, title: 'Charla', organizerId: null },
    });
    await service(prisma).registerForEvent({
      eventId: 3,
      name: 'Ana',
      email: 'ana@example.com',
    });
    await settle();
    expect(users.sendEventRegistrationEmail).toHaveBeenCalledTimes(1);
    expect(users.notify).not.toHaveBeenCalled();
  });

  it('keeps the reservation when the notifications fail', async () => {
    users.sendEventRegistrationEmail.mockRejectedValueOnce(
      new Error('smtp down'),
    );
    const prisma = makePrisma({
      stored: { id: 3, title: 'Charla', organizerId: 'seller-1' },
    });
    await expect(
      service(prisma).registerForEvent({
        eventId: 3,
        name: 'Ana',
        email: 'ana@example.com',
      }),
    ).resolves.toMatchObject({ email: 'ana@example.com' });
    await settle();
  });

  it('tells the organiser when an attendee releases a place', async () => {
    const prisma = makePrisma({
      registration: {
        sellerId: 'person-1',
        name: 'Ana',
        communityPost: { id: 3, title: 'Charla', organizerId: 'seller-1' },
      },
    });
    await expect(
      service(prisma).cancelMyRegistration({ sellerId: 'person-1', id: 9 }),
    ).resolves.toBe(true);
    await settle();
    expect(users.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: 'seller-1',
        type: 'EVENT_REGISTRATION_CANCELLED',
      }),
    );
  });

  describe('cancellation (BLC-6)', () => {
    const registrants = [
      { name: 'Ana', email: 'ana@example.com', sellerId: 'person-1' },
      { name: 'Guest', email: 'guest@example.com', sellerId: null },
      { name: 'Ana again', email: 'ana2@example.com', sellerId: 'person-1' },
    ];

    it('cancels, emails every registrant and notifies each member once', async () => {
      const prisma = makePrisma({
        stored: { id: 3, title: 'Charla', organizerId: 'seller-1' },
        registrants,
      });
      const event = await service(prisma).cancelSellerEvent({
        sellerId: 'seller-1',
        id: 3,
        reason: ' Lluvia ',
        language: 'ES',
      });
      expect(prisma.communityPost.update.mock.calls[0][0].data).toMatchObject({
        status: 'CANCELLED',
        cancellationReason: 'Lluvia',
      });
      expect(event).toMatchObject({ status: 'CANCELLED' });
      await settle();

      expect(users.sendEventCancelledEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'es',
          eventTitle: 'Charla',
          reason: 'Lluvia',
          communityUrl: 'https://app.ekoru.cl/es/community',
          recipients: [
            { email: 'ana@example.com', name: 'Ana' },
            { email: 'guest@example.com', name: 'Guest' },
            { email: 'ana2@example.com', name: 'Ana again' },
          ],
        }),
      );
      expect(users.notify).toHaveBeenCalledTimes(1);
      expect(users.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: 'person-1',
          type: 'EVENT_CANCELLED',
        }),
      );
    });

    it('does nothing more when the event is already cancelled', async () => {
      const prisma = makePrisma({
        stored: {
          id: 3,
          title: 'Charla',
          organizerId: 'seller-1',
          status: 'CANCELLED',
        },
        registrants,
      });
      await service(prisma).cancelSellerEvent({ sellerId: 'seller-1', id: 3 });
      await settle();
      expect(prisma.communityPost.update).not.toHaveBeenCalled();
      expect(users.sendEventCancelledEmails).not.toHaveBeenCalled();
    });

    it('refuses registrations and edits on a cancelled event', async () => {
      const stored = {
        id: 3,
        title: 'Charla',
        organizerId: 'seller-1',
        status: 'CANCELLED',
      };
      await expect(
        service(makePrisma({ stored })).registerForEvent({
          eventId: 3,
          name: 'Ana',
          email: 'ana@example.com',
        }),
      ).rejects.toThrow(/cancelado/);
      await expect(
        service(makePrisma({ stored })).updateSellerEvent({
          sellerId: 'seller-1',
          id: 3,
          input: { title: 'Otra' },
        }),
      ).rejects.toThrow(/cancelado/);
    });

    it('refuses to delete an event that has registrations', async () => {
      const prisma = makePrisma({
        stored: { id: 3, organizerId: 'seller-1' },
        registrants,
      });
      await expect(
        service(prisma).deleteSellerEvent({ sellerId: 'seller-1', id: 3 }),
      ).rejects.toThrow(/cancélalo/);
    });

    it('only lists scheduled events publicly', async () => {
      const prisma = makePrisma();
      await service(prisma).listPublicEvents({ page: 1, pageSize: 12 });
      const [{ where }] = prisma.communityPost.findMany.mock
        .calls[0] as unknown as [{ where: Record<string, unknown> }];
      expect(where.status).toBe('SCHEDULED');
    });
  });

  describe('registrations (BLC-8)', () => {
    it('locks the event row before counting places', async () => {
      const prisma = makePrisma({
        stored: { id: 3, title: 'Charla', capacity: 10 },
      });
      await service(prisma).registerForEvent({
        eventId: 3,
        name: 'Ana',
        email: 'ana@example.com',
      });
      const sql = (
        prisma.$queryRaw.mock.calls as unknown as [TemplateStringsArray][]
      ).map(([strings]) => strings.join('?'));
      expect(sql.some((q) => q.includes('FOR UPDATE'))).toBe(true);
      // The lock comes before the capacity count.
      const lockOrder = prisma.$queryRaw.mock.invocationCallOrder[0];
      const countOrder =
        prisma.communityPostRegistration.count.mock.invocationCallOrder[0];
      expect(lockOrder).toBeLessThan(countOrder);
    });

    it('refuses a full event', async () => {
      const prisma = makePrisma({
        stored: { id: 3, title: 'Charla', capacity: 1 },
        registrants: [
          { name: 'Ben', email: 'ben@example.com', sellerId: null },
        ],
      });
      await expect(
        service(prisma).registerForEvent({
          eventId: 3,
          name: 'Ana',
          email: 'ana@example.com',
        }),
      ).rejects.toThrow(/No quedan cupos/);
      expect(prisma.communityPostRegistration.create).not.toHaveBeenCalled();
    });

    it('refuses an event that already finished', async () => {
      const prisma = makePrisma({
        stored: { id: 3, title: 'Charla', startDate: new Date('2020-01-01') },
      });
      await expect(
        service(prisma).registerForEvent({
          eventId: 3,
          name: 'Ana',
          email: 'ana@example.com',
        }),
      ).rejects.toThrow(/ya termino/);
    });

    it('links members to their account and leaves guests unlinked', async () => {
      const prisma = makePrisma({ stored: { id: 3, title: 'Charla' } });
      await service(prisma).registerForEvent({
        eventId: 3,
        name: 'Guest',
        email: 'guest@example.com',
      });
      await service(prisma).registerForEvent({
        eventId: 3,
        name: 'Ana',
        email: 'ana@example.com',
        sellerId: 'person-1',
      });
      const created = prisma.communityPostRegistration.create.mock.calls.map(
        ([{ data }]) => data,
      );
      expect(created[0]).toMatchObject({
        sellerId: null,
        email: 'guest@example.com',
      });
      expect(created[1]).toMatchObject({ sellerId: 'person-1' });
    });

    it('requires an existing business account to organise', async () => {
      await expect(
        service(makePrisma({ sellerType: null })).createSellerEvent({
          sellerId: 'ghost',
          input: inPerson,
        }),
      ).rejects.toThrow(/Cuenta no encontrada/);
      await expect(
        service(makePrisma()).createSellerEvent({
          sellerId: undefined,
          input: inPerson,
        }),
      ).rejects.toThrow(/iniciar sesion/);
    });
  });
});
