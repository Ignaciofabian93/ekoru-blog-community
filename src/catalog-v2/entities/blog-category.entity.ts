import { Directive, ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('BlogCategory')
@Directive('@key(fields: "id")')
export class BlogCategory {
  @Field(() => Int, { description: 'Unique identifier for the blog category' })
  id: number;

  @Field(() => String, { description: 'Icon representing the blog category' })
  icon: string;

  @Field(() => Boolean, { description: 'Whether the blog category is active' })
  isActive: boolean;

  @Field(() => Int, { description: 'Sort order of the blog category' })
  sortOrder: number;
}
