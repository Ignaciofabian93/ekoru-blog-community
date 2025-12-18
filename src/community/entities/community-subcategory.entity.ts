import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class CommunitySubCategory {
  @Field(() => ID)
  id: number;

  @Field()
  subCategory: string;

  @Field(() => String, { nullable: true })
  icon?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => ID)
  communityCategoryId: number;

  @Field(() => String, { nullable: true })
  href?: string | null;
}
