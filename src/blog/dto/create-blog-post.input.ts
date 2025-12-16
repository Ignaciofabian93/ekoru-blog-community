import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { BlogType } from '../../graphql/enums';

@InputType()
export class CreateBlogPostInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  title: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  content: string;

  @Field(() => Int)
  @IsNumber()
  categoryId: number;

  @Field(() => BlogType)
  type: BlogType;
}
