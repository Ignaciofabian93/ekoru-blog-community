import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from '../common/i18n';
import { BlogCatalogRepository } from '../repositories/blog-catalog.repository';
import { BlogCategoryRepository } from '../repositories/blog-category.repository';
import { Language } from '@prisma/client';
import { BlogCatalog } from '../types/blog-catalog';
import type { BlogCategory } from '../types/blog-category';

@Injectable()
export class BlogCatalogService {
  private readonly logger = new Logger(BlogCatalogService.name);

  constructor(
    private readonly blogCatalogRepository: BlogCatalogRepository,
    private readonly blogCategoryRepository: BlogCategoryRepository,
    private readonly i18nService: I18nService,
  ) {}

  async getBlogCatalog(language?: Language): Promise<BlogCatalog[]> {
    const lang = language ?? this.i18nService.getDefaultLanguage();
    this.logger.debug(`Fetching blog catalog for language: ${lang}`);
    return this.blogCatalogRepository.getBlogCatalog(lang);
  }

  async getBlogCategoryBySlug({
    slug,
    language,
  }: {
    slug: string;
    language: Language;
  }): Promise<BlogCategory | null> {
    this.logger.debug(
      `getBlogCategoryBySlug - slug: ${slug}, language: ${language}`,
    );
    return this.blogCategoryRepository.findBySlug(slug, language);
  }

  async getBlogCategories({
    limit,
    offset,
  }: {
    limit: number;
    offset: number;
  }): Promise<BlogCategory[]> {
    this.logger.debug(`getBlogCategories - limit: ${limit}, offset: ${offset}`);
    return this.blogCategoryRepository.findAll(limit, offset);
  }
}
