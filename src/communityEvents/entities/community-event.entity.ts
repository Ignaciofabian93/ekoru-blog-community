import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  CommunityEventLocationType,
  CommunityEventStatus,
} from '@prisma/client';

/**
 * Admin view of a community event (backed by the CommunityPost table).
 * `registrationCount` and `remainingCapacity` are computed from the
 * registrations relation; `remainingCapacity` is null when capacity is null
 * (unlimited).
 */
@ObjectType('AdminCommunityEvent')
export class CommunityEventEntity {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  title: string;

  @Field(() => String)
  content: string;

  @Field(() => String, {
    nullable: true,
    description: 'Cover/wallpaper image CDN URL (one image or none)',
  })
  coverImage?: string | null;

  @Field(() => Date, {
    nullable: true,
    description: 'Event start (a single-date event uses this only)',
  })
  startDate?: Date | null;

  @Field(() => Date, { nullable: true, description: 'Event end (for ranges)' })
  endDate?: Date | null;

  @Field(() => Int, {
    nullable: true,
    description: 'Available tickets/places. Null = unlimited.',
  })
  capacity?: number | null;

  @Field(() => Int, { description: 'Number of registrations' })
  registrationCount: number;

  @Field(() => Int, {
    nullable: true,
    description:
      'Remaining places (capacity − registrations); null if unlimited',
  })
  remainingCapacity?: number | null;

  @Field(() => Int)
  likes: number;

  @Field(() => String, {
    nullable: true,
    description:
      'Admin who created the event in the panel; null for events a business published',
  })
  authorId?: string | null;

  @Field(() => String, {
    nullable: true,
    description:
      'Seller id of the organising business; null for events EKORU runs itself',
  })
  organizerId?: string | null;

  @Field(() => Int, {
    nullable: true,
    description: 'Community subcategory (kind of event)',
  })
  communitySubCategoryId?: number | null;

  @Field(() => Int, {
    nullable: true,
    description: 'Community category of the subcategory',
  })
  communityCategoryId?: number | null;

  @Field(() => CommunityEventStatus)
  status: CommunityEventStatus;

  @Field(() => Date, { nullable: true })
  cancelledAt?: Date | null;

  @Field(() => String, { nullable: true })
  cancellationReason?: string | null;

  @Field(() => CommunityEventLocationType)
  locationType: CommunityEventLocationType;

  @Field(() => String, { nullable: true, description: 'Street address' })
  address?: string | null;

  @Field(() => Int, { nullable: true, description: 'County (comuna) id' })
  countyId?: number | null;

  @Field(() => String, { nullable: true, description: 'County (comuna) name' })
  countyName?: string | null;

  @Field(() => String, { nullable: true, description: 'City name' })
  cityName?: string | null;

  @Field(() => String, { nullable: true, description: 'Region name' })
  regionName?: string | null;

  @Field(() => Int, { nullable: true, description: 'City id of the county' })
  cityId?: number | null;

  @Field(() => Int, { nullable: true, description: 'Region id of the county' })
  regionId?: number | null;

  @Field(() => String, { nullable: true, description: 'Join link' })
  onlineUrl?: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
