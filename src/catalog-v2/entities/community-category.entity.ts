import { Directive, ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('CommunityCategory')
@Directive('@key(fields: "id")')
export class CommunityCategory {
  @Field(() => Int, {
    description: 'Unique identifier for the community category',
  })
  id: number;

  @Field(() => Boolean, {
    description: 'Whether the community category is active',
  })
  isActive: boolean;

  @Field(() => Int, { description: 'Sort order of the community category' })
  sortOrder: number;
}
