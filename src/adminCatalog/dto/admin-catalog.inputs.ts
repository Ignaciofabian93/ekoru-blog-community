import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
// The subgraph's graphql/enums does NOT re-export Language; the
// registered enum object is Prisma's, so import Language from @prisma/client.
import { Language } from '@prisma/client';

/**
 * Admin blog/community-catalog inputs.
 *
 * Every `*UpsertRowInput` follows the same contract, designed for XLSX
 * round-trips AND single-row edits from the admin panel:
 * - `id` present            → update that row (only the provided fields change)
 * - no `id`, translation row → upsert by its (parentId, language) unique key
 * - no `id`, base row        → create
 *
 * Omitted fields are left untouched on update; explicit `null` clears a
 * nullable column.
 */

// ─── Args shared by the raw list queries ─────────────────────────────────────

@ArgsType()
export class RawCatalogListArgs {
  @Field(() => Int, {
    nullable: true,
    description: 'Fetch a single row by id (edit screens)',
  })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, { defaultValue: 1, description: 'Page number (1-based)' })
  @IsInt()
  @Min(1)
  page: number;

  @Field(() => Int, { defaultValue: 50, description: 'Items per page' })
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize: number;

  @Field(() => String, {
    nullable: true,
    description: 'Filters rows whose translation name contains this text',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

@ArgsType()
export class RawCommunitySubCategoriesArgs extends RawCatalogListArgs {
  @Field(() => Int, {
    nullable: true,
    description: 'Filter by parent community category',
  })
  @IsOptional()
  @IsInt()
  communityCategoryId?: number;
}

// ─── Blog categories ──────────────────────────────────────────────────────────

@InputType()
export class BlogCategoryUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Icon name/key. Required when creating (no id).',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  featuredFrom?: Date | null;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  featuredUntil?: Date | null;
}

@InputType()
export class BlogCategoryTranslationUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Required when creating (no id)',
  })
  @IsOptional()
  @IsInt()
  blogCategoryId?: number;

  @Field(() => Language, {
    nullable: true,
    description: 'Required when creating (no id)',
  })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  slug?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating (no id)',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  href?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metaDescription?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  metaKeywords?: string[];
}

// ─── Community categories ─────────────────────────────────────────────────────

@InputType()
export class CommunityCategoryUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  featuredFrom?: Date | null;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  featuredUntil?: Date | null;
}

@InputType()
export class CommunityCategoryTranslationUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Required when creating (no id)',
  })
  @IsOptional()
  @IsInt()
  communityCategoryId?: number;

  @Field(() => Language, {
    nullable: true,
    description: 'Required when creating (no id)',
  })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @Field(() => String, {
    nullable: true,
    description: 'Category display name. Required when creating (no id).',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  slug?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  href?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  description?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metaDescription?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  metaKeywords?: string[];
}

// ─── Community sub categories ─────────────────────────────────────────────────

@InputType()
export class CommunitySubCategoryUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, {
    nullable: true,
    description:
      'Parent community category. Required when creating; on update it ' +
      're-parents the sub category (the fix for wrongly related rows)',
  })
  @IsOptional()
  @IsInt()
  communityCategoryId?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  featuredFrom?: Date | null;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  featuredUntil?: Date | null;
}

@InputType()
export class CommunitySubCategoryTranslationUpsertRowInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Required when creating (no id)',
  })
  @IsOptional()
  @IsInt()
  communitySubCategoryId?: number;

  @Field(() => Language, {
    nullable: true,
    description: 'Required when creating (no id)',
  })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @Field(() => String, {
    nullable: true,
    description: 'Sub category display name. Required when creating (no id).',
  })
  @IsOptional()
  @IsString()
  subCategory?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  slug?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  href?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  description?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metaDescription?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  metaKeywords?: string[];
}
