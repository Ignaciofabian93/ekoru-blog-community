import { CommunityEventLocationType } from '@prisma/client';
import { BadRequestError } from '../common/exceptions';

/** Where an event happens, as stored on CommunityPost. */
export interface EventLocation {
  locationType: CommunityEventLocationType;
  address: string | null;
  countyId: number | null;
  onlineUrl: string | null;
}

/** The location part of a create or (partial) update input. */
export interface LocationInput {
  locationType?: CommunityEventLocationType | null;
  address?: string | null;
  countyId?: number | null;
  onlineUrl?: string | null;
}

const EMPTY: EventLocation = {
  locationType: CommunityEventLocationType.IN_PERSON,
  address: null,
  countyId: null,
  onlineUrl: null,
};

/** True when an update touches any location field. */
export function touchesLocation(input: LocationInput): boolean {
  return (
    input.locationType !== undefined ||
    input.address !== undefined ||
    input.countyId !== undefined ||
    input.onlineUrl !== undefined
  );
}

/**
 * Applies a location input over the current location (none when creating) and
 * checks the result is complete for its mode:
 * - IN_PERSON needs an address and a county;
 * - ONLINE needs a join link;
 * - HYBRID needs all three.
 *
 * Fields the mode does not use are cleared, so an event switched to ONLINE
 * never keeps a stale address on its card.
 */
export function resolveLocation(
  input: LocationInput,
  current: EventLocation = EMPTY,
): EventLocation {
  const take = <K extends keyof EventLocation>(key: K): EventLocation[K] =>
    (input[key] !== undefined ? input[key] : current[key]) as EventLocation[K];

  const locationType =
    take('locationType') ?? CommunityEventLocationType.IN_PERSON;
  const address = take('address')?.trim() || null;
  const countyId = take('countyId') ?? null;
  const onlineUrl = take('onlineUrl')?.trim() || null;

  const inPerson = locationType !== CommunityEventLocationType.ONLINE;
  const online = locationType !== CommunityEventLocationType.IN_PERSON;

  if (inPerson && (!address || countyId == null)) {
    throw new BadRequestError('Indica la dirección y la comuna del evento');
  }
  if (online && !onlineUrl) {
    throw new BadRequestError(
      'Indica el enlace para unirse al evento en línea',
    );
  }

  return {
    locationType,
    address: inPerson ? address : null,
    countyId: inPerson ? countyId : null,
    onlineUrl: online ? onlineUrl : null,
  };
}
