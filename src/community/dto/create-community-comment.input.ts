import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

@InputType()
export class CreateCommunityCommentInput {
  @Field(() => Int)
  @IsNumber()
  postId: number;

  @Field()
  @IsNotEmpty()
  @IsString()
  content: string;
}
