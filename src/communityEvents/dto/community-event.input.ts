import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import { CommunityEventLocationType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

@ArgsType()
export class AdminCommunityEventsArgs {
  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  page: number;

  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize: number;

  @Field(() => String, {
    nullable: true,
    description: 'Filters events whose title contains this text',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

@ArgsType()
export class CommunityRegistrationsArgs {
  @Field(() => Int)
  @IsInt()
  eventId: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  page: number;

  @Field(() => Int, { defaultValue: 50 })
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize: number;
}

@InputType()
export class CreateCommunityEventInput {
  @Field(() => String)
  @IsString()
  title: string;

  @Field(() => String)
  @IsString()
  content: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  coverImage?: string | null;

  @Field(() => Date, {
    nullable: true,
    description: 'Event start (single-date events use this only)',
  })
  @IsOptional()
  startDate?: Date | null;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  endDate?: Date | null;

  @Field(() => Int, {
    nullable: true,
    description: 'Available places. Null = unlimited.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number | null;

  @Field(() => Int, {
    nullable: true,
    description: 'Community subcategory (kind of event). Required.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  communitySubCategoryId?: number | null;

  @Field(() => CommunityEventLocationType, {
    nullable: true,
    description: 'IN_PERSON (default), ONLINE or HYBRID',
  })
  @IsOptional()
  @IsEnum(CommunityEventLocationType)
  locationType?: CommunityEventLocationType;

  @Field(() => String, {
    nullable: true,
    description: 'Street address. Required for IN_PERSON and HYBRID.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @Field(() => Int, {
    nullable: true,
    description: 'County (comuna) id. Required for IN_PERSON and HYBRID.',
  })
  @IsOptional()
  @IsInt()
  countyId?: number | null;

  @Field(() => String, {
    nullable: true,
    description: 'Join link (http/https). Required for ONLINE and HYBRID.',
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  onlineUrl?: string | null;
}

@InputType()
export class UpdateCommunityEventInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  content?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  coverImage?: string | null;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  startDate?: Date | null;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  endDate?: Date | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number | null;

  @Field(() => Int, {
    nullable: true,
    description: 'Community subcategory (kind of event). Cannot be cleared.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  communitySubCategoryId?: number | null;

  @Field(() => CommunityEventLocationType, {
    nullable: true,
    description: 'IN_PERSON, ONLINE or HYBRID',
  })
  @IsOptional()
  @IsEnum(CommunityEventLocationType)
  locationType?: CommunityEventLocationType;

  @Field(() => String, {
    nullable: true,
    description: 'Street address. Required for IN_PERSON and HYBRID.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @Field(() => Int, {
    nullable: true,
    description: 'County (comuna) id. Required for IN_PERSON and HYBRID.',
  })
  @IsOptional()
  @IsInt()
  countyId?: number | null;

  @Field(() => String, {
    nullable: true,
    description: 'Join link (http/https). Required for ONLINE and HYBRID.',
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  onlineUrl?: string | null;
}

@ArgsType()
export class CancelCommunityEventArgs {
  @Field(() => Int)
  @IsInt()
  id: number;

  @Field(() => String, {
    nullable: true,
    description: 'Shown to registrants in the cancellation email',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
