import { ObjectType, Field, ID, Directive } from '@nestjs/graphql';
import { Seller } from '../../blog/entities/seller.entity';

@ObjectType()
@Directive('@key(fields: "id")')
export class CommunityComment {
  @Field(() => ID)
  id: number;

  @Field(() => ID)
  communityPostId: number;

  @Field(() => ID)
  sellerId: string;

  @Field()
  content: string;

  @Field(() => Seller, { nullable: true })
  seller?: Seller;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
