import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Language } from '../types/enums';

@Injectable()
export class BlogCatalogRepository {
  private readonly logger = new Logger(BlogCatalogRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBlogCatalog(language: Language) {
    try {
      const categories = await this.prisma.blogCategory.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        include: {
          translations: {
            where: {
              language: language,
            },
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              href: true,
            },
          },
        },
      });

      return categories.map((category) => ({
        id: category.id,
        icon: category.icon,
        name: category.translations[0]?.name || '',
        description: category.translations[0]?.description || '',
        slug: category.translations[0]?.slug || '',
        href: category.translations[0]?.href || null,
      }));
    } catch (error) {
      this.logger.error(
        `Error getting blog catalog: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
