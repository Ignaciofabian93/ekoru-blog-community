import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

@InputType()
export class CreateCommunityPostInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  title: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  content: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  images?: string[];
}
