import { Directive, ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('CommunitySubCategory')
@Directive('@key(fields: "id")')
export class CommunitySubCategory {
  @Field(() => Int, {
    description: 'Unique identifier for the community subcategory',
  })
  id: number;

  @Field(() => Int, { description: 'ID of the parent community category' })
  communityCategoryId: number;

  @Field(() => Boolean, {
    description: 'Whether the community subcategory is active',
  })
  isActive: boolean;

  @Field(() => Int, { description: 'Sort order of the community subcategory' })
  sortOrder: number;
}
