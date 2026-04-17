import { Injectable, Logger } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CommunityCategory,
  CommunityCategoryTranslation,
  CommunitySubCategory,
  CommunitySubCategoryTranslation,
} from '../types/community-category';
import type { Language } from '@prisma/client';

@Injectable()
export class CommunityCategoryRepository {
  private readonly logger = new Logger(CommunityCategoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a DataLoader for community category translations with composite key (id:language)
   */
  createTranslationLoader(): DataLoader<
    string,
    CommunityCategoryTranslation | null
  > {
    return new DataLoader<string, CommunityCategoryTranslation | null>(
      async (compositeKeys: readonly string[]) => {
        try {
          const keyPairs = compositeKeys.map((key) => {
            const [idStr, language] = key.split(':');
            return {
              communityCategoryId: parseInt(idStr, 10),
              language: language as Language,
            };
          });

          const translations =
            await this.prisma.communityCategoryTranslation.findMany({
              where: {
                OR: keyPairs.map(({ communityCategoryId, language }) => ({
                  communityCategoryId,
                  language,
                })),
              },
            });

          const translationMap = new Map<
            string,
            CommunityCategoryTranslation
          >();
          translations.forEach((t) => {
            const key = `${t.communityCategoryId}:${t.language}`;
            translationMap.set(
              key,
              t as unknown as CommunityCategoryTranslation,
            );
          });

          return compositeKeys.map((key) => translationMap.get(key) || null);
        } catch (error) {
          this.logger.error(
            `Error loading community category translations: ${error.message}`,
            error.stack,
          );
          throw error;
        }
      },
      { cacheKeyFn: (key: string) => key },
    );
  }

  /**
   * Creates a DataLoader for community categories by ID
   */
  createCommunityCategoryLoader(): DataLoader<
    number,
    CommunityCategory | null
  > {
    return new DataLoader<number, CommunityCategory | null>(
      async (ids: readonly number[]) => {
        try {
          const categories = await this.prisma.communityCategory.findMany({
            where: { id: { in: [...ids] } },
          });

          const categoryMap = new Map<number, CommunityCategory>();
          categories.forEach((c) => {
            categoryMap.set(c.id, c as unknown as CommunityCategory);
          });

          return ids.map((id) => categoryMap.get(id) || null);
        } catch (error) {
          this.logger.error(
            `Error loading community categories: ${error.message}`,
            error.stack,
          );
          throw error;
        }
      },
    );
  }

  /**
   * Creates a DataLoader that loads subcategories for a given community category ID
   */
  createSubCategoryByCategoryLoader(): DataLoader<
    number,
    CommunitySubCategory[]
  > {
    return new DataLoader<number, CommunitySubCategory[]>(
      async (categoryIds: readonly number[]) => {
        try {
          const subCategories = await this.prisma.communitySubCategory.findMany(
            {
              where: {
                communityCategoryId: { in: [...categoryIds] },
                isActive: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          );

          const subCategoryMap = new Map<number, CommunitySubCategory[]>();
          subCategories.forEach((sub) => {
            const existing = subCategoryMap.get(sub.communityCategoryId) || [];
            existing.push(sub as unknown as CommunitySubCategory);
            subCategoryMap.set(sub.communityCategoryId, existing);
          });

          return categoryIds.map((id) => subCategoryMap.get(id) || []);
        } catch (error) {
          this.logger.error(
            `Error loading community subcategories by category: ${error.message}`,
            error.stack,
          );
          throw error;
        }
      },
    );
  }

  /**
   * Creates a DataLoader for community subcategory translations with composite key (id:language)
   */
  createSubCategoryTranslationLoader(): DataLoader<
    string,
    CommunitySubCategoryTranslation | null
  > {
    return new DataLoader<string, CommunitySubCategoryTranslation | null>(
      async (compositeKeys: readonly string[]) => {
        try {
          const keyPairs = compositeKeys.map((key) => {
            const [idStr, language] = key.split(':');
            return {
              communitySubCategoryId: parseInt(idStr, 10),
              language: language as Language,
            };
          });

          const translations =
            await this.prisma.communitySubCategoryTranslation.findMany({
              where: {
                OR: keyPairs.map(({ communitySubCategoryId, language }) => ({
                  communitySubCategoryId,
                  language,
                })),
              },
            });

          const translationMap = new Map<
            string,
            CommunitySubCategoryTranslation
          >();
          translations.forEach((t) => {
            const key = `${t.communitySubCategoryId}:${t.language}`;
            translationMap.set(
              key,
              t as unknown as CommunitySubCategoryTranslation,
            );
          });

          return compositeKeys.map((key) => translationMap.get(key) || null);
        } catch (error) {
          this.logger.error(
            `Error loading community subcategory translations: ${error.message}`,
            error.stack,
          );
          throw error;
        }
      },
      { cacheKeyFn: (key: string) => key },
    );
  }

  /**
   * Finds a community category by slug and language
   */
  async findBySlug(
    slug: string,
    language: Language,
  ): Promise<CommunityCategory | null> {
    try {
      const translation =
        await this.prisma.communityCategoryTranslation.findUnique({
          where: { slug_language: { slug, language } },
          include: { communityCategory: true },
        });

      return (
        (translation?.communityCategory as unknown as CommunityCategory) || null
      );
    } catch (error) {
      this.logger.error(
        `Error finding community category by slug: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Gets a single community category translation via DataLoader
   */
  async getTranslation(
    loader: DataLoader<string, CommunityCategoryTranslation | null>,
    communityCategoryId: number,
    language: Language,
  ): Promise<CommunityCategoryTranslation | null> {
    return loader.load(`${communityCategoryId}:${language}`);
  }

  /**
   * Primes the community category translation DataLoader cache
   */
  async primeTranslations(
    loader: DataLoader<string, CommunityCategoryTranslation | null>,
    communityCategoryIds: number[],
    language: Language,
  ): Promise<void> {
    const keys = communityCategoryIds.map((id) => `${id}:${language}`);
    await loader.loadMany(keys);
  }

  /**
   * Gets a single community subcategory translation via DataLoader
   */
  async getSubCategoryTranslation(
    loader: DataLoader<string, CommunitySubCategoryTranslation | null>,
    communitySubCategoryId: number,
    language: Language,
  ): Promise<CommunitySubCategoryTranslation | null> {
    return loader.load(`${communitySubCategoryId}:${language}`);
  }

  /**
   * Primes the community subcategory translation DataLoader cache
   */
  async primeSubCategoryTranslations(
    loader: DataLoader<string, CommunitySubCategoryTranslation | null>,
    communitySubCategoryIds: number[],
    language: Language,
  ): Promise<void> {
    const keys = communitySubCategoryIds.map((id) => `${id}:${language}`);
    await loader.loadMany(keys);
  }

  /**
   * Finds all active community categories with pagination
   */
  async findAll(limit: number, offset: number): Promise<CommunityCategory[]> {
    try {
      const categories = await this.prisma.communityCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: limit,
        skip: offset,
      });

      return categories as unknown as CommunityCategory[];
    } catch (error) {
      this.logger.error(
        `Error finding all community categories: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Finds a community subcategory by slug and language
   */
  async findSubCategoryBySlug(
    slug: string,
    language: Language,
  ): Promise<CommunitySubCategory | null> {
    try {
      const translation =
        await this.prisma.communitySubCategoryTranslation.findUnique({
          where: { slug_language: { slug, language } },
          include: { communitySubCategory: true },
        });

      return (
        (translation?.communitySubCategory as unknown as CommunitySubCategory) ||
        null
      );
    } catch (error) {
      this.logger.error(
        `Error finding community subcategory by slug: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
