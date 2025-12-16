import { InputType, Field, Int, ID } from '@nestjs/graphql';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { BlogType } from '../../graphql/enums';

@InputType()
export class UpdateBlogPostInput {
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

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @Field(() => BlogType, { nullable: true })
  @IsOptional()
  type?: BlogType;
}
