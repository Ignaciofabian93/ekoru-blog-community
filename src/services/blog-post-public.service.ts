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
    this.logger.debug(
      `getPostsByCategory - slug: ${categorySlug}, language: ${language}`,
    );

    // Resolve the category from its translated slug; a miss yields an empty page
    // rather than an error so the client can render its own empty state.
    const categoryTranslation =
      await this.prisma.blogCategoryTranslation.findFirst({
        where: { slug: categorySlug, language },
        select: { blogCategoryId: true },
      });
    if (!categoryTranslation) {
      return createPaginatedResponse<BlogPostEntity>([], 0, page, pageSize);
    }

    const { skip, take } = calculatePrismaParams(page, pageSize);
    const where: Prisma.BlogPostWhereInput = {
      isPublished: true,
      blogCategoryId: categoryTranslation.blogCategoryId,
      translations: { some: { language } },
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
      type: row.type,
      coverImage: row.coverImage,
      likes: row.likes,
      publishedAt: row.publishedAt,
      translation: row.translations[0] ?? null,
    };
  }
}
