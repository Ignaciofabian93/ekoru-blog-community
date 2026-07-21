import { ObjectType, Field, Int } from '@nestjs/graphql';

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

  @Field(() => String, { description: 'Organizing admin id' })
  authorId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
