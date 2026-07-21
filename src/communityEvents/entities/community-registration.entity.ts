import { ObjectType, Field, Int } from '@nestjs/graphql';

/** An attendee registration for a community event (written by the web app). */
@ObjectType('AdminCommunityRegistration')
export class CommunityRegistrationEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  communityPostId: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  email: string;

  @Field(() => String, {
    nullable: true,
    description: 'Ekoru profile id, if the attendee registered while logged in',
  })
  sellerId?: string | null;

  @Field(() => Date)
  createdAt: Date;
}
