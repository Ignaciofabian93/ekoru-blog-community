import { ObjectType, Field, ID } from '@nestjs/graphql';
import { BlogReactionType } from '../../graphql/enums';

@ObjectType()
export class BlogReaction {
  @Field(() => ID)
  id: number;

  @Field(() => ID)
  blogPostId: number;

  @Field(() => ID)
  sellerId: string;

  @Field(() => BlogReactionType)
  reaction: BlogReactionType;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
