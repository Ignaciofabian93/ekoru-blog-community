import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('BlogCategoryTranslation')
export class BlogCategoryTranslation {
  @Field(() => Int, {
    description: 'Unique identifier for the blog category translation',
  })
  id: number;

  @Field(() => String, { description: 'Name of the blog category' })
  name: string;

  @Field(() => String, { description: 'Slug for the blog category' })
  slug: string;

  @Field(() => String, { description: 'Description of the blog category' })
  description: string;

  @Field(() => String, {
    description: 'href for the blog category',
    nullable: true,
  })
  href: string | null;
}
