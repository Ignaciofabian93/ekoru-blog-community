import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsNumber, Min } from 'class-validator';

@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pageSize?: number = 10;
}
