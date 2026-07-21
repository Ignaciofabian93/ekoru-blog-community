import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Language } from '@prisma/client';
import { PageInfoEntity } from '../../common/entities/page-info.entity';

/**
 * Raw, admin-only views of the blog/community catalog tables.
 *
 * Unlike the web-facing `catalog-v2` entities (single active-language
 * `translation` field, active rows only), these return each row exactly as
 * stored — every translation, all meta fields, inactive rows included — so the
 * admin panel can drive CRUD screens and XLSX export/import directly.
 *
 * ObjectType names are `Admin*`-prefixed to stay unique in the federated
 * supergraph alongside the web-facing `BlogCategoryTranslation` etc.
 */

@ObjectType('AdminBlogCategoryTranslation')
export class AdminBlogCategoryTranslationEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  blogCategoryId: number;

  @Field(() => Language)
  language: Language;

  @Field(() => String)
  name: string;

  @Field(() => String)
  slug: string;

  @Field(() => String)
  description: string;

  @Field(() => String, { nullable: true })
  href?: string | null;

  @Field(() => String, { nullable: true })
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  metaDescription?: string | null;

  @Field(() => [String])
  metaKeywords: string[];
}

@ObjectType('AdminBlogCategory')
export class AdminBlogCategoryEntity {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  icon: string;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => Date, { nullable: true })
  featuredFrom?: Date | null;

  @Field(() => Date, { nullable: true })
  featuredUntil?: Date | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => [AdminBlogCategoryTranslationEntity])
  translations: AdminBlogCategoryTranslationEntity[];
}

@ObjectType('AdminCommunityCategoryTranslation')
export class AdminCommunityCategoryTranslationEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  communityCategoryId: number;

  @Field(() => Language)
  language: Language;

  @Field(() => String)
  category: string;

  @Field(() => String)
  slug: string;

  @Field(() => String, { nullable: true })
  href?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  metaDescription?: string | null;

  @Field(() => [String])
  metaKeywords: string[];
}

@ObjectType('AdminCommunityCategory')
export class AdminCommunityCategoryEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => Date, { nullable: true })
  featuredFrom?: Date | null;

  @Field(() => Date, { nullable: true })
  featuredUntil?: Date | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => [AdminCommunityCategoryTranslationEntity])
  translations: AdminCommunityCategoryTranslationEntity[];
}

@ObjectType('AdminCommunitySubCategoryTranslation')
export class AdminCommunitySubCategoryTranslationEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  communitySubCategoryId: number;

  @Field(() => Language)
  language: Language;

  @Field(() => String)
  subCategory: string;

  @Field(() => String)
  slug: string;

  @Field(() => String, { nullable: true })
  href?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  metaDescription?: string | null;

  @Field(() => [String])
  metaKeywords: string[];
}

@ObjectType('AdminCommunitySubCategory')
export class AdminCommunitySubCategoryEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  communityCategoryId: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => Date, { nullable: true })
  featuredFrom?: Date | null;

  @Field(() => Date, { nullable: true })
  featuredUntil?: Date | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => [AdminCommunitySubCategoryTranslationEntity])
  translations: AdminCommunitySubCategoryTranslationEntity[];
}

// ─── Connections ──────────────────────────────────────────────────────────────

@ObjectType('AdminBlogCategoryConnection')
export class AdminBlogCategoryConnectionEntity {
  @Field(() => [AdminBlogCategoryEntity])
  nodes: AdminBlogCategoryEntity[];

  @Field(() => PageInfoEntity)
  pageInfo: PageInfoEntity;
}

@ObjectType('AdminCommunityCategoryConnection')
export class AdminCommunityCategoryConnectionEntity {
  @Field(() => [AdminCommunityCategoryEntity])
  nodes: AdminCommunityCategoryEntity[];

  @Field(() => PageInfoEntity)
  pageInfo: PageInfoEntity;
}

@ObjectType('AdminCommunitySubCategoryConnection')
export class AdminCommunitySubCategoryConnectionEntity {
  @Field(() => [AdminCommunitySubCategoryEntity])
  nodes: AdminCommunitySubCategoryEntity[];

  @Field(() => PageInfoEntity)
  pageInfo: PageInfoEntity;
}

// ─── Bulk upsert result ───────────────────────────────────────────────────────

/**
 * Per-row failure inside a bulk upsert. `index` is the 0-based position of the
 * offending row in the submitted array so the admin panel can point at the
 * exact spreadsheet line.
 */
@ObjectType('BlogCommunityBulkRowError')
export class BulkRowErrorEntity {
  @Field(() => Int)
  index: number;

  @Field(() => Int, { nullable: true })
  id?: number | null;

  @Field(() => String)
  message: string;
}

/**
 * Outcome of a bulk upsert. Rows are processed independently: one bad row is
 * reported in `errors` without aborting the rest of the batch.
 */
@ObjectType('BlogCommunityBulkUpsertResult')
export class BulkUpsertResultEntity {
  @Field(() => Int)
  created: number;

  @Field(() => [Int], {
    description: 'ids of the rows created by this batch, in submission order',
  })
  createdIds: number[];

  @Field(() => Int)
  updated: number;

  @Field(() => Int)
  failed: number;

  @Field(() => [BulkRowErrorEntity])
  errors: BulkRowErrorEntity[];
}
