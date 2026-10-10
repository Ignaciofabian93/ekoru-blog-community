import { ObjectType, Field, Int } from '@nestjs/graphql';

/** One registration, as the event's organiser sees it to take attendance. */
@ObjectType('CommunityEventAttendee')
export class EventAttendeeEntity {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  email: string;

  @Field(() => Boolean, {
    description:
      'Whether the person registered with an Ekoru account (only they earn points).',
  })
  hasAccount: boolean;

  @Field(() => Date, {
    nullable: true,
    description: 'When the organiser confirmed the person came.',
  })
  attendedAt?: Date | null;

  @Field(() => Date)
  createdAt: Date;
}
