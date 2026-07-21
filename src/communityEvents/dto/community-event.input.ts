import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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
}
