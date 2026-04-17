import { Injectable, Logger } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { BlogCatalogEntity } from '../catalog-v2/entities/blog-catalog.entity';
import { BlogCatalogService } from '../services/blog-catalog.service';
import { Language } from '@prisma/client';
import { BlogCatalog } from '../types/blog-catalog';

@Injectable()
@Resolver(() => BlogCatalogEntity)
export class BlogCatalogResolver {
  private readonly logger = new Logger(BlogCatalogResolver.name);

  constructor(private readonly blogCatalogService: BlogCatalogService) {}

  @Query(() => [BlogCatalogEntity], {
    name: 'getBlogCatalog',
    description: 'Fetches the blog catalog with translations',
  })
  async getBlogCatalog(
    @Args('language', {
      type: () => Language,
      defaultValue: Language.ES,
      description: 'Language for the blog catalog translations',
    })
    language: Language,
  ): Promise<BlogCatalog[]> {
    this.logger.debug(
      `Received request to fetch blog catalog with language: ${language}`,
    );

    return this.blogCatalogService.getBlogCatalog(language);
  }
}
