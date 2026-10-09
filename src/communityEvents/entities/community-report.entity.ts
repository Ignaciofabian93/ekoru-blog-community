import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  CommunityEventStatus,
  CommunityReportReason,
  CommunityReportStatus,
} from '@prisma/client';
import { PageInfoEntity } from '../../common/entities/page-info.entity';

/** A report on a community event, as moderators see it. */
@ObjectType('CommunityEventReport')
export class CommunityReportEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  communityPostId: number;

  @Field(() => String)
  eventTitle: string;

  @Field(() => CommunityEventStatus)
  eventStatus: CommunityEventStatus;

  @Field(() => String, {
    nullable: true,
    description: 'Seller id of the organising business',
  })
  eventOrganizerId?: string | null;

  @Field(() => Int, { description: 'Open reports on the same event' })
  openReportsOnEvent: number;

  @Field(() => CommunityReportReason)
  reason: CommunityReportReason;

  @Field(() => String, { nullable: true })
  details?: string | null;

  @Field(() => CommunityReportStatus)
  status: CommunityReportStatus;

  @Field(() => String, { description: 'Seller id of the reporting account' })
  reporterId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date, { nullable: true })
  resolvedAt?: Date | null;

  @Field(() => String, { nullable: true })
  resolutionNote?: string | null;
}

@ObjectType('CommunityEventReportConnection')
export class CommunityReportConnectionEntity {
  @Field(() => [CommunityReportEntity])
  nodes: CommunityReportEntity[];

  @Field(() => PageInfoEntity)
  pageInfo: PageInfoEntity;
}
