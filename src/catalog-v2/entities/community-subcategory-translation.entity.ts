import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('CommunitySubCategoryTranslation')
export class CommunitySubCategoryTranslation {
  @Field(() => Int, {
    description: 'Unique identifier for the community subcategory translation',
  })
  id: number;

  @Field(() => String, { description: 'Name of the community subcategory' })
  subCategory: string;

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
