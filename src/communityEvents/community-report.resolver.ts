import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentAdmin,
  CurrentLanguage,
  CurrentSeller,
} from '../common/decorators';
import {
  CommunityReportsArgs,
  ReportCommunityEventInput,
  ResolveCommunityReportArgs,
} from './dto/community-report.input';
import {
  CommunityReportConnectionEntity,
  CommunityReportEntity,
} from './entities/community-report.entity';
import { CommunityReportService } from './community-report.service';

/** Reporting events (anyone signed in) and the moderation queue (admins). */
@Resolver(() => CommunityReportEntity)
export class CommunityReportResolver {
  constructor(private readonly reports: CommunityReportService) {}

  // Reports are cheap to send and costly to triage; cap them per visitor.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Mutation(() => Boolean, {
    name: 'reportCommunityEvent',
    description:
      'Flag an event for moderators. Needs an account; one report per account per event.',
  })
  async reportCommunityEvent(
    @Args('input') input: ReportCommunityEventInput,
    @CurrentSeller() sellerId: string | undefined,
  ) {
    return this.reports.report({ sellerId, ...input });
  }

  @Query(() => CommunityReportConnectionEntity, {
    name: 'communityEventReports',
    description:
      'Moderation queue (OPEN by default). Requires MODERATE_CONTENT.',
  })
  async communityEventReports(
    @Args() { status, page, pageSize }: CommunityReportsArgs,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.reports.list({ adminId, status, page, pageSize });
  }

  @Mutation(() => CommunityReportEntity, {
    name: 'resolveCommunityEventReport',
    description:
      'DISMISS the report, or CANCEL_EVENT (registrants are told and every open report on the event is closed). Requires MODERATE_CONTENT.',
  })
  async resolveCommunityEventReport(
    @Args() { id, action, note }: ResolveCommunityReportArgs,
    @CurrentAdmin() adminId?: string,
    @CurrentLanguage() language?: string,
  ) {
    return this.reports.resolve({ adminId, id, action, note, language });
  }
}
