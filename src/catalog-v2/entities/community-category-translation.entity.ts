import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('CommunityCategoryTranslation')
export class CommunityCategoryTranslation {
  @Field(() => Int, {
    description: 'Unique identifier for the community category translation',
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
}
