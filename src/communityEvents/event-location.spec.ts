import { resolveLocation, touchesLocation } from './event-location';

const inPerson = {
  locationType: 'IN_PERSON' as const,
  address: 'Av. Siempre Viva 742',
  countyId: 7,
  onlineUrl: null,
};

describe('resolveLocation', () => {
  it('defaults to IN_PERSON and requires address and county', () => {
    expect(() => resolveLocation({})).toThrow(/dirección y la comuna/);
    expect(() => resolveLocation({ address: 'Calle 1' })).toThrow(
      /dirección y la comuna/,
    );
    expect(resolveLocation({ address: ' Calle 1 ', countyId: 3 })).toEqual({
      locationType: 'IN_PERSON',
      address: 'Calle 1',
      countyId: 3,
      onlineUrl: null,
    });
  });

  it('requires a link for ONLINE and drops any address', () => {
    expect(() => resolveLocation({ locationType: 'ONLINE' })).toThrow(/enlace/);
    expect(
      resolveLocation({
        locationType: 'ONLINE',
        onlineUrl: 'https://meet.example.com/x',
        address: 'Calle 1',
        countyId: 3,
      }),
    ).toEqual({
      locationType: 'ONLINE',
      address: null,
      countyId: null,
      onlineUrl: 'https://meet.example.com/x',
    });
  });

  it('requires everything for HYBRID', () => {
    expect(() =>
      resolveLocation({
        locationType: 'HYBRID',
        onlineUrl: 'https://meet.example.com/x',
      }),
    ).toThrow(/dirección y la comuna/);
    expect(
      resolveLocation({
        locationType: 'HYBRID',
        address: 'Calle 1',
        countyId: 3,
        onlineUrl: 'https://meet.example.com/x',
      }).locationType,
    ).toBe('HYBRID');
  });

  it('applies a partial update over the current location', () => {
    expect(resolveLocation({ address: 'Nueva 10' }, inPerson)).toEqual({
      ...inPerson,
      address: 'Nueva 10',
    });
    expect(() => resolveLocation({ countyId: null }, inPerson)).toThrow(
      /dirección y la comuna/,
    );
    expect(
      resolveLocation(
        { locationType: 'ONLINE', onlineUrl: 'https://x.cl' },
        inPerson,
      ),
    ).toEqual({
      locationType: 'ONLINE',
      address: null,
      countyId: null,
      onlineUrl: 'https://x.cl',
    });
  });
});

describe('touchesLocation', () => {
  it('is false for updates that leave the location alone', () => {
    expect(touchesLocation({})).toBe(false);
    expect(touchesLocation({ address: null })).toBe(true);
    expect(touchesLocation({ locationType: 'ONLINE' })).toBe(true);
  });
});
