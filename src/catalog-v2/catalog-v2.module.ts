import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

// I18n
import { I18nService } from '../common/i18n';

// Repositories
import {
  BlogCatalogRepository,
  BlogCategoryRepository,
  CommunityCatalogRepository,
  CommunityCategoryRepository,
} from '../repositories';

// Services
import { BlogCatalogService } from '../services/blog-catalog.service';
import { CommunityCatalogService } from '../services/community-catalog.service';
import { BlogPostPublicService } from '../services/blog-post-public.service';

// Resolvers
import { BlogCatalogResolver } from '../resolvers/blog-catalog.resolver';
import { BlogCategoryResolver } from '../resolvers/blog-category.resolver';
import { CommunityCatalogResolver } from '../resolvers/community-catalog.resolver';
import { CommunityCategoryResolver } from '../resolvers/community-category.resolver';
import { CommunitySubCategoryResolver } from '../resolvers/community-subcategory.resolver';
import { BlogPostPublicResolver } from '../resolvers/blog-post-public.resolver';

@Module({
  imports: [PrismaModule],
  providers: [
    // I18n
    I18nService,
    // Repositories
    BlogCatalogRepository,
    BlogCategoryRepository,
    CommunityCatalogRepository,
    CommunityCategoryRepository,
    // Services
    BlogCatalogService,
    CommunityCatalogService,
    BlogPostPublicService,
    // Resolvers
    BlogCatalogResolver,
    BlogCategoryResolver,
    CommunityCatalogResolver,
    CommunityCategoryResolver,
    CommunitySubCategoryResolver,
    BlogPostPublicResolver,
  ],
  exports: [
    I18nService,
    BlogCatalogService,
    CommunityCatalogService,
    BlogCategoryRepository,
    CommunityCategoryRepository,
  ],
})
export class CatalogV2Module {}
