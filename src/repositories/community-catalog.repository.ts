import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Language } from '../types/enums';

@Injectable()
export class CommunityCatalogRepository {
  private readonly logger = new Logger(CommunityCatalogRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCommunityCatalog(language: Language) {
    try {
      const categories = await this.prisma.communityCategory.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        include: {
          translations: {
            where: { language: language },
            select: {
              id: true,
              category: true,
              slug: true,
              href: true,
              description: true,
            },
          },
          subcategories: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              translations: {
                where: { language: language },
                select: {
                  id: true,
                  subCategory: true,
                  slug: true,
                  href: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      return categories.map((cat) => ({
        id: cat.id,
        category: cat.translations[0]?.category || '',
        slug: cat.translations[0]?.slug || '',
        href: cat.translations[0]?.href || null,
        description: cat.translations[0]?.description || null,
        subcategories: cat.subcategories.map((sub) => ({
          id: sub.id,
          subcategory: sub.translations[0]?.subCategory || '',
          slug: sub.translations[0]?.slug || '',
          href: sub.translations[0]?.href || null,
          description: sub.translations[0]?.description || null,
        })),
      }));
    } catch (error) {
      this.logger.error(
        `Error getting community catalog: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
