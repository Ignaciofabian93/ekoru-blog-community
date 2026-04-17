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
  BlogCategory,
  BlogCategoryTranslation,
} from '../types/blog-category';
import type { GraphQLContext } from '../types/graphql-context.interface';
import { BlogCategory as BlogCategoryEntity } from '../catalog-v2/entities/blog-category.entity';
import { BlogCategoryTranslation as BlogCategoryTranslationEntity } from '../catalog-v2/entities/blog-category-translation.entity';
import { BlogCatalogService } from '../catalog-v2/blog-catalog.service';

/**
 * Blog Category GraphQL Resolver
 *
 * Handles queries and field resolutions for blog categories.
 * Uses DataLoaders from context to efficiently batch translations.
 */
@Injectable()
@Resolver(() => BlogCategoryEntity)
export class BlogCategoryResolver {
  private readonly logger = new Logger(BlogCategoryResolver.name);

  constructor(private readonly blogCatalogService: BlogCatalogService) {}

  @Query(() => BlogCategoryEntity, { nullable: true })
  async getBlogCategoryBySlug(
    @Args('slug') slug: string,
    @Args('language', { type: () => Language }) language: Language,
    @Context() context: GraphQLContext,
  ): Promise<BlogCategory> {
    this.logger.debug(
      `Query: getBlogCategoryBySlug - slug: ${slug}, language: ${language}`,
    );
    context.language = language;
    return this.blogCatalogService.getBlogCategoryBySlug(slug, language);
  }

  @Query(() => [BlogCategoryEntity])
  async getBlogCategoryList(
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Context() context: GraphQLContext,
  ): Promise<BlogCategory[]> {
    this.logger.debug(
      `Query: getBlogCategoryList - limit: ${limit}, offset: ${offset}, language: ${language}`,
    );

    context.language = language;

    const categories = await this.blogCatalogService.getBlogCategories(
      limit,
      offset,
    );

    // Prime translation cache to avoid N+1 on translation ResolveField
    if (categories.length > 0) {
      const categoryIds = categories.map((cat) => cat.id);
      await context.blogCategoryRepository.primeTranslations(
        context.loaders.blogCategoryTranslation,
        categoryIds,
        language,
      );
    }

    return categories;
  }

  /**
   * Field Resolver: translation — no N+1 via DataLoader
   */
  @ResolveField(() => BlogCategoryTranslationEntity, { nullable: true })
  async translation(
    @Parent() blogCategory: BlogCategory,
    @Context() context: GraphQLContext,
  ): Promise<BlogCategoryTranslation | null> {
    const language = context.language;
    this.logger.debug(
      `ResolveField: translation - blogCategoryId: ${blogCategory.id}, language: ${language}`,
    );
    return context.blogCategoryRepository.getTranslation(
      context.loaders.blogCategoryTranslation,
      blogCategory.id,
      language,
    );
  }
}
