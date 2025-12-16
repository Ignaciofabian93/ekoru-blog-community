import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

@InputType()
export class UpdateCommunityCommentInput {
  @Field(() => ID)
  @IsNumber()
  id: number;

  @Field()
  @IsNotEmpty()
  @IsString()
  content: string;
}
