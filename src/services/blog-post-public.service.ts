import { Injectable, Logger } from '@nestjs/common';
import { Language, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils';
import { BlogPostEntity } from '../catalog-v2/entities/blog-post.entity';

/**
 * Public, read-only reads over blog posts for the web app. Only published posts
 * that have a translation in the requested language are returned, each carrying
 * exactly that one translation. Authoring stays admin-only (BlogPostService).
 */
@Injectable()
export class BlogPostPublicService {
  private readonly logger = new Logger(BlogPostPublicService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPostsByCategory({
    categorySlug,
    language,
    page,
    pageSize,
  }: {
    categorySlug: string;
    language: Language;
    page: number;
    pageSize: number;
  }) {
    return this.getPosts({ categorySlug, language, page, pageSize });
  }

  /**
   * Published posts, newest first, across every category or, with
   * `categorySlug`, in one category. Backs the post list on /blog.
   */
  async getPosts({
    categorySlug,
    language,
    page,
    pageSize,
  }: {
    categorySlug?: string;
    language: Language;
    page: number;
    pageSize: number;
  }) {
    this.logger.debug(
      `getPosts - slug: ${categorySlug ?? '(all)'}, language: ${language}`,
    );

    // Resolve the category from its translated slug; a miss yields an empty page
    // rather than an error so the client can render its own empty state.
    let blogCategoryId: number | undefined;
    if (categorySlug) {
      const categoryTranslation =
        await this.prisma.blogCategoryTranslation.findFirst({
          where: { slug: categorySlug, language },
          select: { blogCategoryId: true },
        });
      if (!categoryTranslation) {
        return createPaginatedResponse<BlogPostEntity>([], 0, page, pageSize);
      }
      blogCategoryId = categoryTranslation.blogCategoryId;
    }

    const { skip, take } = calculatePrismaParams(page, pageSize);
    const where: Prisma.BlogPostWhereInput = {
      ...this.publishedWhere(language),
      ...(blogCategoryId !== undefined && { blogCategoryId }),
    };

    const [count, rows] = await Promise.all([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        include: { translations: { where: { language }, take: 1 } },
      }),
    ]);

    const nodes = rows.map((row) => this.toPublic(row));
    return createPaginatedResponse(nodes, count, page, pageSize);
  }

  /**
   * Published posts per category, counted over exactly the posts `getPosts`
   * lists. Backs the category tiles on /blog; empty categories are omitted.
   */
  async getPostCountsByCategory(
    language: Language,
  ): Promise<{ blogCategoryId: number; count: number }[]> {
    this.logger.debug(`getPostCountsByCategory - language: ${language}`);

    const groups = await this.prisma.blogPost.groupBy({
      by: ['blogCategoryId'],
      where: this.publishedWhere(language),
      _count: { _all: true },
    });

    return groups.map((group) => ({
      blogCategoryId: group.blogCategoryId,
      count: group._count._all,
    }));
  }

  /** A post is public once published and translated into the language. */
  private publishedWhere(language: Language): Prisma.BlogPostWhereInput {
    return { isPublished: true, translations: { some: { language } } };
  }

  async getPostBySlug({
    slug,
    language,
  }: {
    slug: string;
    language: Language;
  }): Promise<BlogPostEntity | null> {
    this.logger.debug(`getPostBySlug - slug: ${slug}, language: ${language}`);

    const post = await this.prisma.blogPost.findFirst({
      where: {
        isPublished: true,
        translations: { some: { slug, language } },
      },
      include: { translations: { where: { language }, take: 1 } },
    });

    return post ? this.toPublic(post) : null;
  }

  private toPublic(
    row: Prisma.BlogPostGetPayload<{ include: { translations: true } }>,
  ): BlogPostEntity {
    return {
      id: row.id,
      blogCategoryId: row.blogCategoryId,
      coverImage: row.coverImage,
      likes: row.likes,
      publishedAt: row.publishedAt,
      translation: row.translations[0] ?? null,
    };
  }
}
