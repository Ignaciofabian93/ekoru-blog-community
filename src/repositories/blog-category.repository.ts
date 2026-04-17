import { Injectable, Logger } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../prisma/prisma.service';
import type {
  BlogCategory,
  BlogCategoryTranslation,
} from '../types/blog-category';
import type { Language } from '@prisma/client';

@Injectable()
export class BlogCategoryRepository {
  private readonly logger = new Logger(BlogCategoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a DataLoader for blog category translations with composite key (id:language)
   */
  createTranslationLoader(): DataLoader<
    string,
    BlogCategoryTranslation | null
  > {
    return new DataLoader<string, BlogCategoryTranslation | null>(
      async (compositeKeys: readonly string[]) => {
        try {
          const keyPairs = compositeKeys.map((key) => {
            const [idStr, language] = key.split(':');
            return {
              blogCategoryId: parseInt(idStr, 10),
              language: language as Language,
            };
          });

          const translations =
            await this.prisma.blogCategoryTranslation.findMany({
              where: {
                OR: keyPairs.map(({ blogCategoryId, language }) => ({
                  blogCategoryId,
                  language,
                })),
              },
            });

          const translationMap = new Map<string, BlogCategoryTranslation>();
          translations.forEach((t) => {
            const key = `${t.blogCategoryId}:${t.language}`;
            translationMap.set(key, t as unknown as BlogCategoryTranslation);
          });

          return compositeKeys.map((key) => translationMap.get(key) || null);
        } catch (error) {
          this.logger.error(
            `Error loading blog category translations: ${error.message}`,
            error.stack,
          );
          throw error;
        }
      },
      { cacheKeyFn: (key: string) => key },
    );
  }

  /**
   * Creates a DataLoader for blog categories by ID
   */
  createBlogCategoryLoader(): DataLoader<number, BlogCategory | null> {
    return new DataLoader<number, BlogCategory | null>(
      async (ids: readonly number[]) => {
        try {
          const categories = await this.prisma.blogCategory.findMany({
            where: { id: { in: [...ids] } },
          });

          const categoryMap = new Map<number, BlogCategory>();
          categories.forEach((c) => {
            categoryMap.set(c.id, c as unknown as BlogCategory);
          });

          return ids.map((id) => categoryMap.get(id) || null);
        } catch (error) {
          this.logger.error(
            `Error loading blog categories: ${error.message}`,
            error.stack,
          );
          throw error;
        }
      },
    );
  }

  /**
   * Finds a blog category by its translation slug and language
   */
  async findBySlug(
    slug: string,
    language: Language,
  ): Promise<BlogCategory | null> {
    try {
      const translation = await this.prisma.blogCategoryTranslation.findUnique({
        where: { slug_language: { slug, language } },
        include: { blogCategory: true },
      });

      return (translation?.blogCategory as unknown as BlogCategory) || null;
    } catch (error) {
      this.logger.error(
        `Error finding blog category by slug: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Gets a single translation via DataLoader (no N+1)
   */
  async getTranslation(
    loader: DataLoader<string, BlogCategoryTranslation | null>,
    blogCategoryId: number,
    language: Language,
  ): Promise<BlogCategoryTranslation | null> {
    return loader.load(`${blogCategoryId}:${language}`);
  }

  /**
   * Primes the translation DataLoader cache for multiple categories
   */
  async primeTranslations(
    loader: DataLoader<string, BlogCategoryTranslation | null>,
    blogCategoryIds: number[],
    language: Language,
  ): Promise<void> {
    const keys = blogCategoryIds.map((id) => `${id}:${language}`);
    await loader.loadMany(keys);
  }

  /**
   * Finds all active blog categories with pagination
   */
  async findAll(limit: number, offset: number): Promise<BlogCategory[]> {
    try {
      const categories = await this.prisma.blogCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: limit,
        skip: offset,
      });

      return categories as unknown as BlogCategory[];
    } catch (error) {
      this.logger.error(
        `Error finding all blog categories: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
