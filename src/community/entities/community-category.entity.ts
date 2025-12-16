import { ObjectType, Field, ID } from '@nestjs/graphql';
import { CommunitySubCategory } from './community-subcategory.entity';

@ObjectType()
export class CommunityCategory {
  @Field(() => ID)
  id: number;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  icon?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => [CommunitySubCategory])
  subcategories: CommunitySubCategory[];

  @Field(() => String, { nullable: true })
  href?: string | null;
}
