import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import {
  BlogPostConnectionEntity,
  BlogPostEntity,
} from '../catalog-v2/entities/blog-post.entity';
import { BlogPostPublicService } from '../services/blog-post-public.service';

/**
 * Public Blog Post Resolver
 *
 * Read-only, published-post access for the web app. Authoring lives in the
 * admin-only BlogPostResolver; nothing here requires authentication.
 */
@Injectable()
@Resolver(() => BlogPostEntity)
export class BlogPostPublicResolver {
  private readonly logger = new Logger(BlogPostPublicResolver.name);

  constructor(private readonly blogPostPublicService: BlogPostPublicService) {}

  @Query(() => BlogPostConnectionEntity, {
    name: 'getBlogPostsByCategory',
    description:
      'Published blog posts in a category (by translated slug), for the given language.',
  })
  async getBlogPostsByCategory(
    @Args('categorySlug') categorySlug: string,
    @Args('language', { type: () => Language }) language: Language,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 12 }) pageSize: number,
  ) {
    this.logger.debug(
      `Query: getBlogPostsByCategory - slug: ${categorySlug}, language: ${language}`,
    );
    return this.blogPostPublicService.getPostsByCategory({
      categorySlug,
      language,
      page,
      pageSize,
    });
  }

  @Query(() => BlogPostEntity, {
    name: 'getBlogPostBySlug',
    nullable: true,
    description: 'A single published blog post by translated slug + language.',
  })
  async getBlogPostBySlug(
    @Args('slug') slug: string,
    @Args('language', { type: () => Language }) language: Language,
  ) {
    this.logger.debug(
      `Query: getBlogPostBySlug - slug: ${slug}, language: ${language}`,
    );
    return this.blogPostPublicService.getPostBySlug({ slug, language });
  }
}
