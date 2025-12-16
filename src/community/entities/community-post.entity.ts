import { ObjectType, Field, ID, Int, Directive } from '@nestjs/graphql';
import { Seller } from '../../blog/entities/seller.entity';
import { CommunityComment } from './community-comment.entity';

@ObjectType()
@Directive('@key(fields: "id")')
export class CommunityPost {
  @Field(() => ID)
  id: number;

  @Field()
  title: string;

  @Field()
  content: string;

  @Field(() => [String], { nullable: true })
  images?: string[];

  @Field(() => ID)
  authorId: string;

  @Field(() => Seller, { nullable: true })
  author?: Seller;

  @Field(() => Int)
  likes: number;

  @Field(() => Int)
  comments: number;

  @Field(() => [CommunityComment], { nullable: true })
  communityComment?: CommunityComment[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
