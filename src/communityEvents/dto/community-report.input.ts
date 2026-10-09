import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import { CommunityReportReason, CommunityReportStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CommunityReportAction } from '../../graphql/enums';

/** A signed-in account flags an event. */
@InputType()
export class ReportCommunityEventInput {
  @Field(() => Int)
  @IsInt()
  eventId: number;

  @Field(() => CommunityReportReason)
  @IsEnum(CommunityReportReason)
  reason: CommunityReportReason;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string | null;
}

@ArgsType()
export class CommunityReportsArgs {
  @Field(() => CommunityReportStatus, {
    nullable: true,
    description: 'Defaults to OPEN, the moderation queue',
  })
  @IsOptional()
  @IsEnum(CommunityReportStatus)
  status?: CommunityReportStatus;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  page: number;

  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize: number;
}

@ArgsType()
export class ResolveCommunityReportArgs {
  @Field(() => Int)
  @IsInt()
  id: number;

  @Field(() => CommunityReportAction)
  @IsEnum(CommunityReportAction)
  action: CommunityReportAction;

  @Field(() => String, {
    nullable: true,
    description:
      'Kept on the report; when cancelling, it is also the reason registrants read',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
