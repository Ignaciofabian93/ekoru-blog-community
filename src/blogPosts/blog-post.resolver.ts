import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { CurrentAdmin } from '../common/decorators';
import { Language } from '@prisma/client';
import {
  BlogPostEntity,
  BlogPostTranslationEntity,
  BlogPostConnectionEntity,
} from './entities';
import {
  AdminBlogPostsArgs,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  UpsertBlogPostTranslationInput,
} from './dto';
import { BlogPostService } from './blog-post.service';

/**
 * Admin Blog Post Resolver
 *
 * Platform-admin authoring surface for blog posts. Every write requires the
 * x-admin-id header set by the gateway; the service rejects anonymous/seller
 * traffic. Reactions (like/dislike) are read-only counts here — the actual
 * reaction happens in the web app.
 */
@Resolver(() => BlogPostEntity)
export class BlogPostResolver {
  private readonly logger = new Logger(BlogPostResolver.name);

  constructor(private readonly blogPostService: BlogPostService) {}

  @Query(() => BlogPostConnectionEntity, {
    name: 'adminBlogPosts',
    description:
      'Paginated blog posts with every translation (unpublished included). Admins only.',
  })
  async adminBlogPosts(
    @Args() { page, pageSize, search }: AdminBlogPostsArgs,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Query: adminBlogPosts(page: ${page})`);
    return this.blogPostService.getBlogPosts({
      adminId,
      page,
      pageSize,
      search,
    });
  }

  @Query(() => BlogPostEntity, { name: 'adminBlogPost', nullable: true })
  async adminBlogPost(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Query: adminBlogPost(${id})`);
    return this.blogPostService.getBlogPost({ adminId, id });
  }

  @Mutation(() => BlogPostEntity, {
    description: 'Create a blog post (base row). Admins only.',
  })
  async createBlogPost(
    @Args('input') input: CreateBlogPostInput,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.blogPostService.createBlogPost({ adminId, input });
  }

  @Mutation(() => BlogPostEntity, {
    description: 'Update a blog post (base row). Admins only.',
  })
  async updateBlogPost(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateBlogPostInput,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.blogPostService.updateBlogPost({ adminId, id, input });
  }

  @Mutation(() => Boolean, {
    description:
      'Delete a blog post (translations + reactions cascade). Admins only.',
  })
  async deleteBlogPost(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.blogPostService.deleteBlogPost({ adminId, id });
  }

  @Mutation(() => BlogPostTranslationEntity, {
    description:
      'Create or update a blog post translation, matched by (blogPostId, language). Admins only.',
  })
  async upsertBlogPostTranslation(
    @Args('input') input: UpsertBlogPostTranslationInput,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.blogPostService.upsertTranslation({ adminId, input });
  }

  @Mutation(() => Boolean, {
    description: 'Delete a single blog post translation. Admins only.',
  })
  async deleteBlogPostTranslation(
    @Args('blogPostId', { type: () => Int }) blogPostId: number,
    @Args('language', { type: () => Language }) language: Language,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.blogPostService.deleteTranslation({
      adminId,
      blogPostId,
      language,
    });
  }
}
