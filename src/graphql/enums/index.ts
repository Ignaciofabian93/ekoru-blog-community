import { registerEnumType } from '@nestjs/graphql';
import {
  BlogType,
  CommunityEventLocationType,
  CommunityEventStatus,
  CommunityReportReason,
  CommunityReportStatus,
  Language,
} from '@prisma/client';

export {
  BlogType,
  CommunityEventLocationType,
  CommunityEventStatus,
  CommunityReportReason,
  CommunityReportStatus,
};

/** What a moderator does with a report (BLC-7). */
export enum CommunityReportAction {
  DISMISS = 'DISMISS',
  CANCEL_EVENT = 'CANCEL_EVENT',
}

export enum BlogReactionType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

// Register enums with GraphQL
registerEnumType(Language, {
  name: 'Language',
  description: 'Supported languages for multi-language content',
});

registerEnumType(BlogType, {
  name: 'BlogType',
  description: 'Blog post category types',
});

registerEnumType(BlogReactionType, {
  name: 'BlogReactionType',
  description: 'Blog reaction types',
});

registerEnumType(CommunityEventLocationType, {
  name: 'CommunityEventLocationType',
  description:
    'Where a community event happens: IN_PERSON (address + county), ONLINE (link) or HYBRID (both)',
});

registerEnumType(CommunityEventStatus, {
  name: 'CommunityEventStatus',
  description: 'SCHEDULED, or CANCELLED by its organiser or an admin',
});

registerEnumType(CommunityReportReason, {
  name: 'CommunityReportReason',
  description: 'Why someone flagged a community event',
});

registerEnumType(CommunityReportStatus, {
  name: 'CommunityReportStatus',
  description: 'OPEN until a moderator DISMISSES it or ACTIONS the event',
});

registerEnumType(CommunityReportAction, {
  name: 'CommunityReportAction',
  description: 'DISMISS the report, or CANCEL_EVENT and tell its registrants',
});
