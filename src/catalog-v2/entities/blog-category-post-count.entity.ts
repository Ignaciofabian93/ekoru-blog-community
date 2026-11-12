import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * How many published posts a blog category holds in one language — the same
 * posts `getBlogPosts` lists. Categories with none are left out.
 */
@ObjectType('BlogCategoryPostCount')
export class BlogCategoryPostCountEntity {
  @Field(() => Int)
  blogCategoryId: number;

  @Field(() => Int)
  count: number;
}
