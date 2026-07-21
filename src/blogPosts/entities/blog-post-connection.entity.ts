import { ObjectType, Field } from '@nestjs/graphql';
import { PageInfoEntity } from '../../common/entities/page-info.entity';
import { BlogPostEntity } from './blog-post.entity';

@ObjectType('AdminBlogPostConnection')
export class BlogPostConnectionEntity {
  @Field(() => [BlogPostEntity])
  nodes: BlogPostEntity[];

  @Field(() => PageInfoEntity)
  pageInfo: PageInfoEntity;
}
