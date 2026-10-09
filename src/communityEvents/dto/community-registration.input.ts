import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

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

  // Every field needs a class-validator decorator: the global ValidationPipe runs
  // with forbidNonWhitelisted, so an undecorated field is rejected as unknown.
  @Field(() => Boolean, {
    defaultValue: false,
    description: 'Include events that already finished.',
  })
  @IsBoolean()
  includePast: boolean = false;

  @Field(() => Int, {
    nullable: true,
    description: 'Only events of this community category.',
  })
  @IsOptional()
  @IsInt()
  communityCategoryId?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Only events of this community subcategory.',
  })
  @IsOptional()
  @IsInt()
  communitySubCategoryId?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Only events organised by this business (seller id).',
  })
  @IsOptional()
  @IsString()
  organizerId?: string;

  @Field(() => String, {
    nullable: true,
    deprecationReason: 'Use organizerId.',
    description: 'Deprecated alias of organizerId.',
  })
  @IsOptional()
  @IsString()
  authorId?: string;
}
