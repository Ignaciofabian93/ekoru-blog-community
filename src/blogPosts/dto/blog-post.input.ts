import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Language } from '@prisma/client';

/** Args for the paginated admin blog-post list. */
@ArgsType()
export class AdminBlogPostsArgs {
  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  page: number;

  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize: number;

  @Field(() => String, {
    nullable: true,
    description: 'Filters posts whose translation title contains this text',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

@InputType()
export class CreateBlogPostInput {
  @Field(() => Int)
  @IsInt()
  blogCategoryId: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  coverImage?: string | null;

  @Field(() => Boolean, { defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

@InputType()
export class UpdateBlogPostInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  blogCategoryId?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  coverImage?: string | null;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

/**
 * Upsert a single blog-post translation (matched by (blogPostId, language)).
 * `content` is the long-form body; the rest are SEO/meta fields.
 */
@InputType()
export class UpsertBlogPostTranslationInput {
  @Field(() => Int)
  @IsInt()
  blogPostId: number;

  @Field(() => Language)
  @IsEnum(Language)
  language: Language;

  @Field(() => String)
  @IsString()
  title: string;

  @Field(() => String)
  @IsString()
  slug: string;

  @Field(() => String)
  @IsString()
  content: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  excerpt?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  metaDescription?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  metaKeywords?: string[];
}
