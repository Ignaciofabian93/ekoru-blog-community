import { ObjectType, Field } from '@nestjs/graphql';
import { CommunityPost } from './community-post.entity';
import { PageInfo } from '../../blog/entities/page-info.entity';

@ObjectType()
export class CommunityPostsConnection {
  @Field(() => [CommunityPost])
  nodes: CommunityPost[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
