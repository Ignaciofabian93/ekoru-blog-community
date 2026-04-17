import { Injectable, Logger } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Language } from '@prisma/client';
import { CommunityCatalogEntity } from '../catalog-v2/entities/community-catalog.entity';
import { CommunityCatalogService } from '../services/community-catalog.service';
import type { CommunityCatalog } from '../types/community-catalog';

@Injectable()
@Resolver(() => CommunityCatalogEntity)
export class CommunityCatalogResolver {
  private readonly logger = new Logger(CommunityCatalogResolver.name);

  constructor(
    private readonly communityCatalogService: CommunityCatalogService,
  ) {}

  @Query(() => [CommunityCatalogEntity], {
    name: 'getCommunityCatalog',
    description: 'Fetches the community catalog with subcategories',
  })
  async getCommunityCatalog(
    @Args('language', {
      type: () => Language,
      defaultValue: Language.ES,
      description: 'Language for the community catalog translations',
    })
    language: Language,
  ): Promise<CommunityCatalog[]> {
    this.logger.debug(
      `Received request to fetch community catalog with language: ${language}`,
    );

    return this.communityCatalogService.getCommunityCatalog(language);
  }
}
