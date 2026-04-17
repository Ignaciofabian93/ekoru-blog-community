import {
  Resolver,
  ResolveField,
  Parent,
  Context,
  Query,
  Args,
} from '@nestjs/graphql';
import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import type {
  CommunitySubCategory,
  CommunitySubCategoryTranslation,
} from '../types/community-category';
import type { GraphQLContext } from '../types/graphql-context.interface';
import { CommunitySubCategory as CommunitySubCategoryEntity } from '../catalog-v2/entities/community-subcategory.entity';
import { CommunitySubCategoryTranslation as CommunitySubCategoryTranslationEntity } from '../catalog-v2/entities/community-subcategory-translation.entity';
import { CommunityCatalogService } from '../services/community-catalog.service';

/**
 * Community Sub-Category GraphQL Resolver
 *
 * Handles queries and field resolutions for community sub-categories.
 * Uses DataLoaders from context to efficiently batch translations.
 */
@Injectable()
@Resolver(() => CommunitySubCategoryEntity)
export class CommunitySubCategoryResolver {
  private readonly logger = new Logger(CommunitySubCategoryResolver.name);

  constructor(
    private readonly communityCatalogService: CommunityCatalogService,
  ) {}

  @Query(() => CommunitySubCategoryEntity, { nullable: true })
  async getCommunitySubCategoryBySlug(
    @Args('slug') slug: string,
    @Args('language', { type: () => Language, nullable: true })
    language: Language,
    @Context() context: GraphQLContext,
  ): Promise<CommunitySubCategory | null> {
    this.logger.debug(
      `Query: getCommunitySubCategoryBySlug - slug: ${slug}, language: ${language}`,
    );
    context.language = language;
    return this.communityCatalogService.getCommunitySubCategoryBySlug(
      slug,
      language,
    );
  }

  /**
   * Field Resolver: translation — no N+1 via DataLoader
   */
  @ResolveField(() => CommunitySubCategoryTranslationEntity, { nullable: true })
  async translation(
    @Parent() communitySubCategory: CommunitySubCategory,
    @Context() context: GraphQLContext,
  ): Promise<CommunitySubCategoryTranslation | null> {
    const language = context.language;
    this.logger.debug(
      `Resolving translation for CommunitySubCategory ID: ${communitySubCategory.id} in language: ${language}`,
    );
    return context.communityCategoryRepository.getSubCategoryTranslation(
      context.loaders.communitySubCategoryTranslation,
      communitySubCategory.id,
      language,
    );
  }
}
