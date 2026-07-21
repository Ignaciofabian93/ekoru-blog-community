import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { CurrentAdmin } from '../../common/decorators';
import {
  AdminBlogCategoryConnectionEntity,
  AdminCommunityCategoryConnectionEntity,
  AdminCommunitySubCategoryConnectionEntity,
  BulkUpsertResultEntity,
} from '../entities';
import {
  RawCatalogListArgs,
  RawCommunitySubCategoriesArgs,
  BlogCategoryUpsertRowInput,
  BlogCategoryTranslationUpsertRowInput,
  CommunityCategoryUpsertRowInput,
  CommunityCategoryTranslationUpsertRowInput,
  CommunitySubCategoryUpsertRowInput,
  CommunitySubCategoryTranslationUpsertRowInput,
} from '../dto';
import { AdminCatalogService } from '../admin-catalog.service';

/**
 * Admin Blog/Community Catalog GraphQL Resolver
 *
 * Platform-admin surface over the blog & community category tables. Every
 * operation requires the x-admin-id header set by the gateway; anonymous or
 * seller traffic is rejected by the service.
 *
 * Reads (`rawBlog*`/`rawCommunity*`) return rows exactly as stored so the admin
 * panel can list, edit and export them. Writes are bulk upserts shared by the
 * XLSX import and the row-by-row edit forms (a single-row array), plus per-row
 * deletes.
 */
@Resolver()
export class AdminCatalogResolver {
  private readonly logger = new Logger(AdminCatalogResolver.name);

  constructor(private readonly adminCatalogService: AdminCatalogService) {}

  // ─── Raw reads ──────────────────────────────────────────────────────────────

  @Query(() => AdminBlogCategoryConnectionEntity, {
    name: 'rawBlogCategories',
    description:
      'Paginated, unprocessed blog categories with every translation. Admins only.',
  })
  async getRawBlogCategories(
    @Args() { id, page, pageSize, search }: RawCatalogListArgs,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Query: rawBlogCategories(page: ${page})`);
    return this.adminCatalogService.getRawBlogCategories({
      adminId,
      id,
      page,
      pageSize,
      search,
    });
  }

  @Query(() => AdminCommunityCategoryConnectionEntity, {
    name: 'rawCommunityCategories',
    description:
      'Paginated, unprocessed community categories with every translation. Admins only.',
  })
  async getRawCommunityCategories(
    @Args() { id, page, pageSize, search }: RawCatalogListArgs,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Query: rawCommunityCategories(page: ${page})`);
    return this.adminCatalogService.getRawCommunityCategories({
      adminId,
      id,
      page,
      pageSize,
      search,
    });
  }

  @Query(() => AdminCommunitySubCategoryConnectionEntity, {
    name: 'rawCommunitySubCategories',
    description:
      'Paginated, unprocessed community sub categories with every translation. ' +
      'Optionally filtered by communityCategoryId. Admins only.',
  })
  async getRawCommunitySubCategories(
    @Args()
    {
      id,
      page,
      pageSize,
      search,
      communityCategoryId,
    }: RawCommunitySubCategoriesArgs,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Query: rawCommunitySubCategories(page: ${page})`);
    return this.adminCatalogService.getRawCommunitySubCategories({
      adminId,
      id,
      page,
      pageSize,
      search,
      communityCategoryId,
    });
  }

  // ─── Bulk upserts ───────────────────────────────────────────────────────────

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Creates (rows without id) or updates (rows with id) blog categories. Admins only.',
  })
  async bulkUpsertBlogCategories(
    @Args('rows', { type: () => [BlogCategoryUpsertRowInput] })
    rows: BlogCategoryUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(
      `Mutation: bulkUpsertBlogCategories(${rows.length} rows)`,
    );
    return this.adminCatalogService.bulkUpsertBlogCategories({ adminId, rows });
  }

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Creates or updates blog category translations. Rows without id are ' +
      'matched by (blogCategoryId, language). Admins only.',
  })
  async bulkUpsertBlogCategoryTranslations(
    @Args('rows', { type: () => [BlogCategoryTranslationUpsertRowInput] })
    rows: BlogCategoryTranslationUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(
      `Mutation: bulkUpsertBlogCategoryTranslations(${rows.length} rows)`,
    );
    return this.adminCatalogService.bulkUpsertBlogCategoryTranslations({
      adminId,
      rows,
    });
  }

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Creates (rows without id) or updates (rows with id) community categories. Admins only.',
  })
  async bulkUpsertCommunityCategories(
    @Args('rows', { type: () => [CommunityCategoryUpsertRowInput] })
    rows: CommunityCategoryUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(
      `Mutation: bulkUpsertCommunityCategories(${rows.length} rows)`,
    );
    return this.adminCatalogService.bulkUpsertCommunityCategories({
      adminId,
      rows,
    });
  }

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Creates or updates community category translations. Rows without id are ' +
      'matched by (communityCategoryId, language). Admins only.',
  })
  async bulkUpsertCommunityCategoryTranslations(
    @Args('rows', { type: () => [CommunityCategoryTranslationUpsertRowInput] })
    rows: CommunityCategoryTranslationUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(
      `Mutation: bulkUpsertCommunityCategoryTranslations(${rows.length} rows)`,
    );
    return this.adminCatalogService.bulkUpsertCommunityCategoryTranslations({
      adminId,
      rows,
    });
  }

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Creates (rows without id) or updates (rows with id) community sub ' +
      'categories. Setting communityCategoryId re-parents a sub category. Admins only.',
  })
  async bulkUpsertCommunitySubCategories(
    @Args('rows', { type: () => [CommunitySubCategoryUpsertRowInput] })
    rows: CommunitySubCategoryUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(
      `Mutation: bulkUpsertCommunitySubCategories(${rows.length} rows)`,
    );
    return this.adminCatalogService.bulkUpsertCommunitySubCategories({
      adminId,
      rows,
    });
  }

  @Mutation(() => BulkUpsertResultEntity, {
    description:
      'Creates or updates community sub category translations. Rows without id ' +
      'are matched by (communitySubCategoryId, language). Admins only.',
  })
  async bulkUpsertCommunitySubCategoryTranslations(
    @Args('rows', {
      type: () => [CommunitySubCategoryTranslationUpsertRowInput],
    })
    rows: CommunitySubCategoryTranslationUpsertRowInput[],
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(
      `Mutation: bulkUpsertCommunitySubCategoryTranslations(${rows.length} rows)`,
    );
    return this.adminCatalogService.bulkUpsertCommunitySubCategoryTranslations({
      adminId,
      rows,
    });
  }

  // ─── Deletes ────────────────────────────────────────────────────────────────

  @Mutation(() => Boolean, {
    description:
      'Deletes a blog category (translations cascade; fails while posts reference it). Admins only.',
  })
  async deleteBlogCategory(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Mutation: deleteBlogCategory(${id})`);
    return this.adminCatalogService.deleteBlogCategory({ adminId, id });
  }

  @Mutation(() => Boolean, {
    description: 'Deletes a single blog category translation row. Admins only.',
  })
  async deleteBlogCategoryTranslation(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Mutation: deleteBlogCategoryTranslation(${id})`);
    return this.adminCatalogService.deleteBlogCategoryTranslation({
      adminId,
      id,
    });
  }

  @Mutation(() => Boolean, {
    description:
      'Deletes a community category (translations cascade; fails while sub ' +
      'categories reference it). Admins only.',
  })
  async deleteCommunityCategory(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Mutation: deleteCommunityCategory(${id})`);
    return this.adminCatalogService.deleteCommunityCategory({ adminId, id });
  }

  @Mutation(() => Boolean, {
    description:
      'Deletes a single community category translation row. Admins only.',
  })
  async deleteCommunityCategoryTranslation(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Mutation: deleteCommunityCategoryTranslation(${id})`);
    return this.adminCatalogService.deleteCommunityCategoryTranslation({
      adminId,
      id,
    });
  }

  @Mutation(() => Boolean, {
    description:
      'Deletes a community sub category (translations cascade). Admins only.',
  })
  async deleteCommunitySubCategory(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Mutation: deleteCommunitySubCategory(${id})`);
    return this.adminCatalogService.deleteCommunitySubCategory({ adminId, id });
  }

  @Mutation(() => Boolean, {
    description:
      'Deletes a single community sub category translation row. Admins only.',
  })
  async deleteCommunitySubCategoryTranslation(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId?: string,
  ) {
    this.logger.debug(`Mutation: deleteCommunitySubCategoryTranslation(${id})`);
    return this.adminCatalogService.deleteCommunitySubCategoryTranslation({
      adminId,
      id,
    });
  }
}
