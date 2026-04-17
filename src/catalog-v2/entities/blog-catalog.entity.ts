import { Directive, ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('BlogCatalogItem')
@Directive('@key(fields: "id")')
export class BlogCatalogEntity {
  @Field(() => Int, { description: 'Unique identifier for the blog category' })
  id: number;

  @Field(() => String, { description: 'Icon representing the blog category' })
  icon: string;

  @Field(() => String, { description: 'Name of the blog category' })
  name: string;

  @Field(() => String, { description: 'Description of the blog category' })
  description: string;

  @Field(() => String, { description: 'Slug for the blog category' })
  slug: string;

  @Field(() => String, {
    description: 'href for the blog category',
    nullable: true,
  })
  href: string | null;
}
