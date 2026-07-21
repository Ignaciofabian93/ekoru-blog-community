import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { CurrentAdmin } from '../common/decorators';
import {
  CommunityEventEntity,
  CommunityEventConnectionEntity,
  CommunityRegistrationConnectionEntity,
} from './entities';
import {
  AdminCommunityEventsArgs,
  CommunityRegistrationsArgs,
  CreateCommunityEventInput,
  UpdateCommunityEventInput,
} from './dto';
import { CommunityEventService } from './community-event.service';

/**
 * Admin Community Event Resolver
 *
 * Platform-admin authoring surface for community events. Registrations are
 * created by the web app when users register — here admins only list and
 * remove them. Every write requires the x-admin-id header.
 */
@Resolver(() => CommunityEventEntity)
export class CommunityEventResolver {
  private readonly logger = new Logger(CommunityEventResolver.name);

  constructor(private readonly eventService: CommunityEventService) {}

  @Query(() => CommunityEventConnectionEntity, {
    name: 'adminCommunityEvents',
    description: 'Paginated community events with capacity math. Admins only.',
  })
  async adminCommunityEvents(
    @Args() { page, pageSize, search }: AdminCommunityEventsArgs,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Query: adminCommunityEvents(page: ${page})`);
    return this.eventService.getEvents({ adminId, page, pageSize, search });
  }

  @Query(() => CommunityEventEntity, {
    name: 'adminCommunityEvent',
    nullable: true,
  })
  async adminCommunityEvent(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Query: adminCommunityEvent(${id})`);
    return this.eventService.getEvent({ adminId, id });
  }

  @Query(() => CommunityRegistrationConnectionEntity, {
    name: 'communityEventRegistrations',
    description: 'Paginated registrations for one event. Admins only.',
  })
  async communityEventRegistrations(
    @Args() { eventId, page, pageSize }: CommunityRegistrationsArgs,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Query: communityEventRegistrations(${eventId})`);
    return this.eventService.getRegistrations({
      adminId,
      eventId,
      page,
      pageSize,
    });
  }

  @Mutation(() => CommunityEventEntity, {
    description: 'Create a community event. Admins only.',
  })
  async createCommunityEvent(
    @Args('input') input: CreateCommunityEventInput,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.eventService.createEvent({ adminId, input });
  }

  @Mutation(() => CommunityEventEntity, {
    description: 'Update a community event. Admins only.',
  })
  async updateCommunityEvent(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateCommunityEventInput,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.eventService.updateEvent({ adminId, id, input });
  }

  @Mutation(() => Boolean, {
    description:
      'Delete a community event (registrations cascade). Admins only.',
  })
  async deleteCommunityEvent(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.eventService.deleteEvent({ adminId, id });
  }

  @Mutation(() => Boolean, {
    description:
      'Delete a single event registration (moderation). Admins only.',
  })
  async deleteCommunityRegistration(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.eventService.deleteRegistration({ adminId, id });
  }
}
