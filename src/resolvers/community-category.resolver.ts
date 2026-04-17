import {
  Resolver,
  Query,
  ResolveField,
  Parent,
  Args,
  Context,
  Int,
} from '@nestjs/graphql';
import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import type {
  CommunityCategory,
  CommunityCategoryTranslation,
  CommunitySubCategory,
} from '../types/community-category';
import type { GraphQLContext } from '../types/graphql-context.interface';
import { CommunityCategory as CommunityCategoryEntity } from '../catalog-v2/entities/community-category.entity';
import { CommunityCategoryTranslation as CommunityCategoryTranslationEntity } from '../catalog-v2/entities/community-category-translation.entity';
import { CommunitySubCategory as CommunitySubCategoryEntity } from '../catalog-v2/entities/community-subcategory.entity';
import { CommunityCatalogService } from '../services/community-catalog.service';

/**
 * Community Category GraphQL Resolver
 *
 * Handles queries and field resolutions for community categories.
 * Uses DataLoaders from context to efficiently batch translations and subcategories.
 */
@Injectable()
@Resolver(() => CommunityCategoryEntity)
export class CommunityCategoryResolver {
  private readonly logger = new Logger(CommunityCategoryResolver.name);

  constructor(
    private readonly communityCatalogService: CommunityCatalogService,
  ) {}

  @Query(() => CommunityCategoryEntity, { nullable: true })
  async getCommunityCategoryBySlug(
    @Args('slug') slug: string,
    @Args('language', { type: () => Language }) language: Language,
    @Context() context: GraphQLContext,
  ): Promise<CommunityCategory> {
    this.logger.debug(
      `Query: getCommunityCategoryBySlug - slug: ${slug}, language: ${language}`,
    );
    context.language = language;
    return this.communityCatalogService.getCommunityCategoryBySlug(
      slug,
      language,
    );
  }

  @Query(() => [CommunityCategoryEntity])
  async getCommunityCategoryList(
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Context() context: GraphQLContext,
  ): Promise<CommunityCategory[]> {
    this.logger.debug(
      `Query: getCommunityCategoryList - limit: ${limit}, offset: ${offset}, language: ${language}`,
    );

    context.language = language;

    const categories =
      await this.communityCatalogService.getCommunityCategories(limit, offset);

    // Prime category translation cache
    if (categories.length > 0) {
      const categoryIds = categories.map((cat) => cat.id);
      await context.communityCategoryRepository.primeTranslations(
        context.loaders.communityCategoryTranslation,
        categoryIds,
        language,
      );
    }

    return categories;
  }

  /**
   * Field Resolver: translation — no N+1 via DataLoader
   */
  @ResolveField(() => CommunityCategoryTranslationEntity, { nullable: true })
  async translation(
    @Parent() communityCategory: CommunityCategory,
    @Context() context: GraphQLContext,
  ): Promise<CommunityCategoryTranslation | null> {
    const language = context.language;
    this.logger.debug(
      `ResolveField: translation - communityCategoryId: ${communityCategory.id}, language: ${language}`,
    );
    return context.communityCategoryRepository.getTranslation(
      context.loaders.communityCategoryTranslation,
      communityCategory.id,
      language,
    );
  }

  /**
   * Field Resolver: subcategories — loads via DataLoader and primes sub-translation cache
   */
  @ResolveField(() => [CommunitySubCategoryEntity])
  async subcategories(
    @Parent() communityCategory: CommunityCategory,
    @Context() context: GraphQLContext,
  ): Promise<CommunitySubCategory[]> {
    const language = context.language;
    this.logger.debug(
      `ResolveField: CommunityCategory.subcategories(id: ${communityCategory.id}) - language: ${language}`,
    );

    const subCategories = await context.loaders.communitySubCategories.load(
      communityCategory.id,
    );

    // Prime sub-category translation cache
    if (subCategories.length > 0) {
      const subCategoryIds = subCategories.map((sub) => sub.id);
      await context.communityCategoryRepository.primeSubCategoryTranslations(
        context.loaders.communitySubCategoryTranslation,
        subCategoryIds,
        language,
      );
    }

    return subCategories;
  }
}
