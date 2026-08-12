import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import { IsEmail, IsInt, IsString, MaxLength, Min } from 'class-validator';

/**
 * What an attendee gives when reserving a place. The organiser needs a name and
 * a way to reach them; a signed-in attendee is additionally linked by session,
 * which is what makes "my reservations" and self-cancel possible.
 */
@InputType()
export class RegisterForCommunityEventInput {
  @Field(() => Int)
  @IsInt()
  eventId: number;

  @Field(() => String)
  @IsString()
  @MaxLength(120)
  name: string;

  @Field(() => String)
  @IsEmail()
  email: string;
}

@ArgsType()
export class PublicCommunityEventsArgs {
  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  page: number = 1;

  @Field(() => Int, { defaultValue: 12 })
  @IsInt()
  @Min(1)
  pageSize: number = 12;

  @Field(() => Boolean, {
    defaultValue: false,
    description: 'Include events that already finished.',
  })
  includePast: boolean = false;

  @Field(() => String, {
    nullable: true,
    description: 'Only events organised by this business.',
  })
  authorId?: string;
}
