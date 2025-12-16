import { ObjectType, Field } from '@nestjs/graphql';
import { CommunityComment } from './community-comment.entity';
import { PageInfo } from '../../blog/entities/page-info.entity';

@ObjectType()
export class CommunityCommentsConnection {
  @Field(() => [CommunityComment])
  nodes: CommunityComment[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
