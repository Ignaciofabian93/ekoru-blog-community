import { InputType, Field, ID } from '@nestjs/graphql';
import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';

@InputType()
export class UpdateCommunityPostInput {
  @Field(() => ID)
  @IsNumber()
  id: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  content?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  images?: string[];
}
