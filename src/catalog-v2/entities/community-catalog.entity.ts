import { Directive, ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('CommunityCatalogSubcategoryItem')
export class CommunityCatalogSubcategoryEntity {
  @Field(() => Int, {
    description: 'Unique identifier for the community subcategory',
  })
  id: number;

  @Field(() => String, { description: 'Name of the community subcategory' })
  subcategory: string;

  @Field(() => String, { description: 'Slug for the community subcategory' })
  slug: string;

  @Field(() => String, {
    description: 'href for the community subcategory',
    nullable: true,
  })
  href: string | null;

  @Field(() => String, {
    description: 'Description of the community subcategory',
    nullable: true,
  })
  description: string | null;
}

@ObjectType('CommunityCatalogItem')
@Directive('@key(fields: "id")')
export class CommunityCatalogEntity {
  @Field(() => Int, {
    description: 'Unique identifier for the community category',
  })
  id: number;

  @Field(() => String, { description: 'Name of the community category' })
  category: string;

  @Field(() => String, { description: 'Slug for the community category' })
  slug: string;

  @Field(() => String, {
    description: 'href for the community category',
    nullable: true,
  })
  href: string | null;

  @Field(() => String, {
    description: 'Description of the community category',
    nullable: true,
  })
  description: string | null;

  @Field(() => [CommunityCatalogSubcategoryEntity], {
    description: 'Subcategories of the community category',
  })
  subcategories: CommunityCatalogSubcategoryEntity[];
}
