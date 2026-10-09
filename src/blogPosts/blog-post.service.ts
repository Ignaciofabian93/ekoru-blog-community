import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertAdminCan } from '../common/admin-access';
import { NotFoundError, BadRequestError } from '../common/exceptions';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils';
import {
  CreateBlogPostInput,
  UpdateBlogPostInput,
  UpsertBlogPostTranslationInput,
} from './dto';

/**
 * Blog Post Service — admin CRUD over blog posts and their translations.
 *
 * Writes require an authenticated admin (the admin panel is the only authoring
 * surface for now); the post's `authorId` is the acting admin. Reads return
 * rows exactly as stored (every translation, unpublished included).
 */
@Injectable()
export class BlogPostService {
  private readonly logger = new Logger(BlogPostService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Platform admin with WRITE_BLOG (matches the panel's blog screens). */
  private requireAdmin(adminId?: string): Promise<string> {
    return assertAdminCan(this.prisma, adminId, 'WRITE_BLOG');
  }

  async getBlogPosts({
    adminId,
    page,
    pageSize,
    search,
  }: {
    adminId?: string;
    page: number;
    pageSize: number;
    search?: string;
  }) {
    await this.requireAdmin(adminId);
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const where: Prisma.BlogPostWhereInput = search?.trim()
      ? {
          translations: {
            some: { title: { contains: search.trim(), mode: 'insensitive' } },
          },
        }
      : {};

    const [count, rows] = await Promise.all([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take,
        include: { translations: { orderBy: { language: 'asc' } } },
      }),
    ]);

    return createPaginatedResponse(rows, count, page, pageSize);
  }

  async getBlogPost({ adminId, id }: { adminId?: string; id: number }) {
    await this.requireAdmin(adminId);
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: { translations: { orderBy: { language: 'asc' } } },
    });
    if (!post) throw new NotFoundError('Blog post not found');
    return post;
  }

  async createBlogPost({
    adminId,
    input,
  }: {
    adminId?: string;
    input: CreateBlogPostInput;
  }) {
    const author = await this.requireAdmin(adminId);
    try {
      return await this.prisma.blogPost.create({
        data: {
          authorId: author,
          blogCategoryId: input.blogCategoryId,
          coverImage: input.coverImage ?? null,
          isPublished: input.isPublished ?? false,
          publishedAt: input.isPublished ? new Date() : null,
        },
        include: { translations: true },
      });
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async updateBlogPost({
    adminId,
    id,
    input,
  }: {
    adminId?: string;
    id: number;
    input: UpdateBlogPostInput;
  }) {
    await this.requireAdmin(adminId);
    const existing = await this.prisma.blogPost.findUnique({
      where: { id },
      select: { id: true, isPublished: true },
    });
    if (!existing) throw new NotFoundError('Blog post not found');

    // Stamp publishedAt the first time a post flips to published.
    const publishedAt =
      input.isPublished === true && !existing.isPublished
        ? new Date()
        : undefined;

    try {
      return await this.prisma.blogPost.update({
        where: { id },
        data: {
          ...(input.blogCategoryId !== undefined && {
            blogCategoryId: input.blogCategoryId,
          }),
          ...(input.coverImage !== undefined && {
            coverImage: input.coverImage,
          }),
          ...(input.isPublished !== undefined && {
            isPublished: input.isPublished,
          }),
          ...(publishedAt !== undefined && { publishedAt }),
        },
        include: { translations: { orderBy: { language: 'asc' } } },
      });
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async deleteBlogPost({ adminId, id }: { adminId?: string; id: number }) {
    await this.requireAdmin(adminId);
    try {
      // Translations and reactions cascade.
      await this.prisma.blogPost.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async upsertTranslation({
    adminId,
    input,
  }: {
    adminId?: string;
    input: UpsertBlogPostTranslationInput;
  }) {
    await this.requireAdmin(adminId);
    const post = await this.prisma.blogPost.findUnique({
      where: { id: input.blogPostId },
      select: { id: true },
    });
    if (!post) throw new NotFoundError('Blog post not found');

    const data = {
      title: input.title,
      slug: input.slug,
      content: input.content,
      excerpt: input.excerpt ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      metaKeywords: input.metaKeywords ?? [],
    };

    try {
      return await this.prisma.blogPostTranslation.upsert({
        where: {
          blogPostId_language: {
            blogPostId: input.blogPostId,
            language: input.language,
          },
        },
        update: data,
        create: {
          blogPostId: input.blogPostId,
          language: input.language,
          ...data,
        },
      });
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async deleteTranslation({
    adminId,
    blogPostId,
    language,
  }: {
    adminId?: string;
    blogPostId: number;
    language: UpsertBlogPostTranslationInput['language'];
  }) {
    await this.requireAdmin(adminId);
    try {
      await this.prisma.blogPostTranslation.delete({
        where: { blogPostId_language: { blogPostId, language } },
      });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  /** Translates Prisma constraint errors into admin-facing messages. */
  private friendlyError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const target = Array.isArray(error.meta?.target)
        ? ` (${(error.meta.target as string[]).join(', ')})`
        : '';
      switch (error.code) {
        case 'P2002':
          return new BadRequestError(
            `Duplicate value violates a unique constraint${target}`,
          );
        case 'P2003':
          return new BadRequestError(
            'Invalid relation: the referenced id does not exist',
          );
        case 'P2025':
          return new NotFoundError('Row not found');
        default:
          this.logger.error(`Prisma error ${error.code}`, error);
          return new BadRequestError(`Database error ${error.code}`);
      }
    }
    this.logger.error('Unexpected blog post error', error as Error);
    return error instanceof Error ? error : new Error('Unknown error');
  }
}
