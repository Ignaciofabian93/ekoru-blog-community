import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentLanguage, CurrentSeller } from '../common/decorators';
import {
  CommunityEventEntity,
  CommunityEventConnectionEntity,
  CommunityRegistrationEntity,
  CommunityRegistrationConnectionEntity,
  EventAttendeeEntity,
} from './entities';
import {
  CreateCommunityEventInput,
  UpdateCommunityEventInput,
  PublicCommunityEventsArgs,
  RegisterForCommunityEventInput,
  CancelCommunityEventArgs,
} from './dto';
import { CommunityEventService } from './community-event.service';

/**
 * The community events surface for the apps, as opposed to the admin panel's
 * `CommunityEventResolver`.
 *
 * Two roles, deliberately separated:
 *  - **Business accounts organise.** Creating, editing and deleting an event
 *    requires a business seller, and only its author may change it.
 *  - **Everyone attends.** Person accounts — and guests, who supply their own
 *    details — reserve a place. Attending is the only thing a person account
 *    can do here, which is the whole point of the split.
 */
@Resolver(() => CommunityEventEntity)
export class CommunityEventPublicResolver {
  private readonly logger = new Logger(CommunityEventPublicResolver.name);

  constructor(private readonly eventService: CommunityEventService) {}

  // ─── Reads (public) ─────────────────────────────────────────────────────────

  @Query(() => CommunityEventConnectionEntity, {
    name: 'communityEvents',
    description:
      'Published community events with capacity math. Upcoming first; past ' +
      'events only when asked for. Public.',
  })
  async communityEvents(
    @Args()
    {
      page,
      pageSize,
      includePast,
      organizerId,
      authorId,
      communityCategoryId,
      communitySubCategoryId,
    }: PublicCommunityEventsArgs,
  ) {
    return this.eventService.listPublicEvents({
      page,
      pageSize,
      includePast,
      organizerId: organizerId ?? authorId,
      communityCategoryId,
      communitySubCategoryId,
    });
  }

  @Query(() => CommunityEventEntity, {
    name: 'communityEvent',
    nullable: true,
    description:
      'One community event, with places taken and remaining. Public.',
  })
  async communityEvent(@Args('id', { type: () => Int }) id: number) {
    return this.eventService.getPublicEvent(id);
  }

  @Query(() => CommunityRegistrationConnectionEntity, {
    name: 'myCommunityEventRegistrations',
    description: "The signed-in attendee's own reservations.",
  })
  async myCommunityEventRegistrations(
    @CurrentSeller() sellerId: string | undefined,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 10 }) pageSize: number,
  ) {
    return this.eventService.myRegistrations({ sellerId, page, pageSize });
  }

  // ─── Organising (business accounts only) ────────────────────────────────────

  @Mutation(() => CommunityEventEntity, {
    name: 'createMyCommunityEvent',
    description:
      'Publish a community event. Business accounts only; the organiser is ' +
      'the signed-in seller.',
  })
  async createMyCommunityEvent(
    @Args('input') input: CreateCommunityEventInput,
    @CurrentSeller() sellerId: string | undefined,
  ) {
    this.logger.debug(`createMyCommunityEvent by ${sellerId ?? 'anonymous'}`);
    return this.eventService.createSellerEvent({ sellerId, input });
  }

  @Mutation(() => CommunityEventEntity, {
    name: 'updateMyCommunityEvent',
    description: 'Edit an event you organise.',
  })
  async updateMyCommunityEvent(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateCommunityEventInput,
    @CurrentSeller() sellerId: string | undefined,
  ) {
    return this.eventService.updateSellerEvent({ sellerId, id, input });
  }

  @Query(() => [EventAttendeeEntity], {
    name: 'myEventAttendees',
    description:
      'Everyone registered for an event you organise, to confirm who came.',
  })
  async myEventAttendees(
    @Args('eventId', { type: () => Int }) eventId: number,
    @CurrentSeller() sellerId: string | undefined,
  ) {
    return this.eventService.listOwnEventAttendees({ sellerId, id: eventId });
  }

  @Mutation(() => EventAttendeeEntity, {
    name: 'setEventAttendance',
    description:
      'Confirm (or clear) that a registered person came to your event. ' +
      'Confirming earns eco-points for them and for you, once.',
  })
  async setEventAttendance(
    @Args('registrationId', { type: () => Int }) registrationId: number,
    @Args('attended', { type: () => Boolean }) attended: boolean,
    @CurrentSeller() sellerId: string | undefined,
  ) {
    return this.eventService.setAttendance({
      sellerId,
      registrationId,
      attended,
    });
  }

  @Mutation(() => CommunityEventEntity, {
    name: 'cancelMyCommunityEvent',
    description:
      'Cancel an event you organise. Everyone registered is emailed (guests too); members also get an in-app notice.',
  })
  async cancelMyCommunityEvent(
    @Args() { id, reason }: CancelCommunityEventArgs,
    @CurrentSeller() sellerId: string | undefined,
    @CurrentLanguage() language: string | undefined,
  ) {
    return this.eventService.cancelSellerEvent({
      sellerId,
      id,
      reason,
      language,
    });
  }

  @Mutation(() => Boolean, {
    name: 'deleteMyCommunityEvent',
    description:
      'Delete an event you organise. Refused while it has registrations: cancel it instead.',
  })
  async deleteMyCommunityEvent(
    @Args('id', { type: () => Int }) id: number,
    @CurrentSeller() sellerId: string | undefined,
  ) {
    return this.eventService.deleteSellerEvent({ sellerId, id });
  }

  // ─── Attending (anyone) ─────────────────────────────────────────────────────

  // Guests can register with any email, so cap it hard per visitor.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Mutation(() => CommunityRegistrationEntity, {
    name: 'registerForCommunityEvent',
    description:
      'Reserve a place. Works signed in (linked to your account) or as a ' +
      'guest. Refuses once the event is full or finished.',
  })
  async registerForCommunityEvent(
    @Args('input') input: RegisterForCommunityEventInput,
    @CurrentSeller() sellerId: string | undefined,
    @CurrentLanguage() language: string | undefined,
  ) {
    return this.eventService.registerForEvent({ ...input, sellerId, language });
  }

  @Mutation(() => Boolean, {
    name: 'cancelMyCommunityEventRegistration',
    description: 'Give up your place.',
  })
  async cancelMyCommunityEventRegistration(
    @Args('id', { type: () => Int }) id: number,
    @CurrentSeller() sellerId: string | undefined,
  ) {
    return this.eventService.cancelMyRegistration({ sellerId, id });
  }
}
