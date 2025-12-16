import { ObjectType, Field } from '@nestjs/graphql';
import { BlogPost } from './blog-post.entity';
import { PageInfo } from './page-info.entity';

@ObjectType()
export class BlogPostsConnection {
  @Field(() => [BlogPost])
  nodes: BlogPost[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
