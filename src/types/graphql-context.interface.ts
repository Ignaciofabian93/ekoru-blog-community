import DataLoader from 'dataloader';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { Language } from '@prisma/client';
import type { BlogCategory, BlogCategoryTranslation } from './blog-category';
import type {
  CommunityCategory,
  CommunityCategoryTranslation,
  CommunitySubCategory,
  CommunitySubCategoryTranslation,
} from './community-category';
import type { BlogCategoryRepository } from '../repositories/blog-category.repository';
import type { CommunityCategoryRepository } from '../repositories/community-category.repository';

/**
 * GraphQL Context Interface
 *
 * Defines the per-request context available to all resolvers.
 *
 * `language` is resolved from the Accept-Language header and can be overridden
 * by resolvers that accept an explicit `language` argument.
 */
export interface GraphQLContext {
  req: Request;
  res: Response;

  // Mutable per-request — resolvers may override for explicit language args
  language: Language;

  prisma: PrismaService;

  // Repositories
  blogCategoryRepository: BlogCategoryRepository;
  communityCategoryRepository: CommunityCategoryRepository;

  // DataLoaders - Fresh per request to prevent stale data
  loaders: {
    blogCategoryTranslation: DataLoader<string, BlogCategoryTranslation | null>;
    blogCategoryById: DataLoader<number, BlogCategory | null>;
    communityCategoryTranslation: DataLoader<
      string,
      CommunityCategoryTranslation | null
    >;
    communityCategoryById: DataLoader<number, CommunityCategory | null>;
    communitySubCategories: DataLoader<number, CommunitySubCategory[]>;
    communitySubCategoryTranslation: DataLoader<
      string,
      CommunitySubCategoryTranslation | null
    >;
  };

  sellerId?: string;
  token?: string;
}

export function isValidGraphQLContext(context: any): context is GraphQLContext {
  return (
    context &&
    typeof context === 'object' &&
    'loaders' in context &&
    'language' in context &&
    'prisma' in context
  );
}
