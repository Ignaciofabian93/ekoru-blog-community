import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { CommunityCategoryRepository } from '../repositories/community-category.repository';
import { CommunityCatalogRepository } from '../repositories/community-catalog.repository';
import { I18nService } from '../common/i18n';
import type {
  CommunityCategory,
  CommunitySubCategory,
} from '../types/community-category';
import type { CommunityCatalog } from '../types/community-catalog';

@Injectable()
export class CommunityCatalogService {
  private readonly logger = new Logger(CommunityCatalogService.name);

  constructor(
    private readonly communityCategoryRepository: CommunityCategoryRepository,
    private readonly communityCatalogRepository: CommunityCatalogRepository,
    private readonly i18nService: I18nService,
  ) {}

  async getCommunityCatalog(language?: Language): Promise<CommunityCatalog[]> {
    const lang = language ?? this.i18nService.getDefaultLanguage();
    this.logger.debug(`getCommunityCatalog - language: ${lang}`);
    return this.communityCatalogRepository.getCommunityCatalog(lang as any);
  }

  async getCommunityCategoryBySlug(
    slug: string,
    language: Language,
  ): Promise<CommunityCategory> {
    this.logger.debug(
      `getCommunityCategoryBySlug - slug: ${slug}, language: ${language}`,
    );
    return this.communityCategoryRepository.findBySlug(slug, language);
  }

  async getCommunityCategories(
    limit: number,
    offset: number,
  ): Promise<CommunityCategory[]> {
    this.logger.debug(
      `getCommunityCategories - limit: ${limit}, offset: ${offset}`,
    );
    return this.communityCategoryRepository.findAll(limit, offset);
  }

  async getCommunitySubCategoryBySlug(
    slug: string,
    language: Language,
  ): Promise<CommunitySubCategory> {
    this.logger.debug(
      `getCommunitySubCategoryBySlug - slug: ${slug}, language: ${language}`,
    );
    return this.communityCategoryRepository.findSubCategoryBySlug(
      slug,
      language,
    );
  }
}
