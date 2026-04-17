import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from '../common/i18n';
import { BlogCatalogRepository } from '../repositories/blog-catalog.repository';
import { Language } from '../types/enums';
import { BlogCatalog } from '../types/blog-catalog';

@Injectable()
export class BlogCatalogService {
  private readonly logger = new Logger(BlogCatalogService.name);

  constructor(
    private readonly blogCatalogRepository: BlogCatalogRepository,
    private readonly i18nService: I18nService,
  ) {}

  async getBlogCatalog(language?: Language): Promise<BlogCatalog[]> {
    const lang = language ?? this.i18nService.getDefaultLanguage();

    this.logger.debug(`Fetching blog catalog for language: ${lang}`);

    return this.blogCatalogRepository.getBlogCatalog(lang);
  }
}
