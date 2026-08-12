import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { CurrentSeller } from '../common/decorators';
import {
  CommunityEventEntity,
  CommunityEventConnectionEntity,
  CommunityRegistrationEntity,
  CommunityRegistrationConnectionEntity,
} from './entities';
import {
  CreateCommunityEventInput,
  UpdateCommunityEventInput,
  PublicCommunityEventsArgs,
  RegisterForCommunityEventInput,
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
    { page, pageSize, includePast, authorId }: PublicCommunityEventsArgs,
  ) {
    return this.eventService.listPublicEvents({
      page,
      pageSize,
      includePast,
      authorId,
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

  @Mutation(() => Boolean, {
    name: 'deleteMyCommunityEvent',
    description: 'Delete an event you organise. Its reservations go with it.',
  })
  async deleteMyCommunityEvent(
    @Args('id', { type: () => Int }) id: number,
    @CurrentSeller() sellerId: string | undefined,
  ) {
    return this.eventService.deleteSellerEvent({ sellerId, id });
  }

  // ─── Attending (anyone) ─────────────────────────────────────────────────────

  @Mutation(() => CommunityRegistrationEntity, {
    name: 'registerForCommunityEvent',
    description:
      'Reserve a place. Works signed in (linked to your account) or as a ' +
      'guest. Refuses once the event is full or finished.',
  })
  async registerForCommunityEvent(
    @Args('input') input: RegisterForCommunityEventInput,
    @CurrentSeller() sellerId: string | undefined,
  ) {
    return this.eventService.registerForEvent({ ...input, sellerId });
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
