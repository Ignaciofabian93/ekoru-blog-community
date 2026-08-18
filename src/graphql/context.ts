import { Request, Response } from 'express';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../common/i18n';
import { BlogCategoryRepository } from '../repositories/blog-category.repository';
import { CommunityCategoryRepository } from '../repositories/community-category.repository';
import type { GraphQLContext } from '../types/graphql-context.interface';
import { resolveIdentity } from '../common/identity';

/**
 * GraphQL Context Factory
 *
 * Creates a fresh context object for each request. Language is resolved once
 * from the Accept-Language header and stored in context.language. DataLoaders
 * are created fresh per request to prevent stale cache across requests.
 */
export function createGraphQLContext(
  req: Request,
  res: Response,
  moduleRef: ModuleRef,
): GraphQLContext {
  const prisma = moduleRef.get(PrismaService, { strict: false });
  const blogCategoryRepository = moduleRef.get(BlogCategoryRepository, {
    strict: false,
  });
  const communityCategoryRepository = moduleRef.get(
    CommunityCategoryRepository,
    { strict: false },
  );

  // Parse Accept-Language header once per request
  const i18nService = moduleRef.get(I18nService, { strict: false });
  const language = i18nService.parseAcceptLanguage(
    req.headers['accept-language'],
  );
  // Identity comes from the verified access token, not from the gateway's
  // `x-seller-id` / `x-admin-id` headers — those are unsigned and were
  // believed unconditionally. See ../common/identity.
  const { sellerId, adminId, adminRole, adminType, adminSellerId, token } =
    resolveIdentity(req.headers);

  // DataLoaders MUST be fresh per request to prevent stale cache
  const loaders = {
    blogCategoryTranslation: blogCategoryRepository.createTranslationLoader(),
    blogCategoryById: blogCategoryRepository.createBlogCategoryLoader(),
    communityCategoryTranslation:
      communityCategoryRepository.createTranslationLoader(),
    communityCategoryById:
      communityCategoryRepository.createCommunityCategoryLoader(),
    communitySubCategories:
      communityCategoryRepository.createSubCategoryByCategoryLoader(),
    communitySubCategoryTranslation:
      communityCategoryRepository.createSubCategoryTranslationLoader(),
  };

  return {
    req,
    res,
    language,
    prisma,
    blogCategoryRepository,
    communityCategoryRepository,
    loaders,
    sellerId,
    adminId,
    adminRole,
    adminType,
    adminSellerId,
    token,
  };
}

/**
 * Context factory wrapper for GraphQLModule configuration.
 */
export function createContextFactory(moduleRef: ModuleRef) {
  return ({ req, res }: { req: Request; res: Response }): GraphQLContext => {
    return createGraphQLContext(req, res, moduleRef);
  };
}
