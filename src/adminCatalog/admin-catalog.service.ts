import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertAdminCan, AdminPermissionName } from '../common/admin-access';
import { BadRequestError } from '../common/exceptions';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils';
import {
  BlogCategoryUpsertRowInput,
  BlogCategoryTranslationUpsertRowInput,
  CommunityCategoryUpsertRowInput,
  CommunityCategoryTranslationUpsertRowInput,
  CommunitySubCategoryUpsertRowInput,
  CommunitySubCategoryTranslationUpsertRowInput,
} from './dto';

type BulkOutcome = { outcome: 'created' | 'updated'; id: number };

type BulkResult = {
  created: number;
  updated: number;
  failed: number;
  createdIds: number[];
  errors: { index: number; id?: number | null; message: string }[];
};

/**
 * Admin Blog/Community Catalog Service — raw reads and write operations over the
 * blog & community category tables (blog categories, community categories,
 * community sub categories and their translations) for the platform admin panel.
 *
 * Reads return rows exactly as stored (all translations, inactive included).
 * Writes are bulk upserts designed for XLSX imports; a single-row array is the
 * row-by-row edit path of the admin panel. Rows are processed independently so
 * one bad spreadsheet line never aborts the whole import.
 */
@Injectable()
export class AdminCatalogService {
  private readonly logger = new Logger(AdminCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Raw reads ──────────────────────────────────────────────────────────────

  async getRawBlogCategories({
    adminId,
    id,
    page,
    pageSize,
    search,
  }: {
    adminId?: string;
    id?: number;
    page: number;
    pageSize: number;
    search?: string;
  }) {
    await this.requireAdmin(adminId, 'WRITE_BLOG');
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const where: Prisma.BlogCategoryWhereInput = {
      ...(id != null && { id }),
      ...(search?.trim() && {
        translations: {
          some: { name: { contains: search.trim(), mode: 'insensitive' } },
        },
      }),
    };

    const [count, rows] = await Promise.all([
      this.prisma.blogCategory.count({ where }),
      this.prisma.blogCategory.findMany({
        where,
        orderBy: { id: 'asc' },
        skip,
        take,
        include: { translations: { orderBy: { language: 'asc' } } },
      }),
    ]);

    return createPaginatedResponse(rows, count, page, pageSize);
  }

  async getRawCommunityCategories({
    adminId,
    id,
    page,
    pageSize,
    search,
  }: {
    adminId?: string;
    id?: number;
    page: number;
    pageSize: number;
    search?: string;
  }) {
    await this.requireAdmin(adminId, 'MODERATE_CONTENT');
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const where: Prisma.CommunityCategoryWhereInput = {
      ...(id != null && { id }),
      ...(search?.trim() && {
        translations: {
          some: { category: { contains: search.trim(), mode: 'insensitive' } },
        },
      }),
    };

    const [count, rows] = await Promise.all([
      this.prisma.communityCategory.count({ where }),
      this.prisma.communityCategory.findMany({
        where,
        orderBy: { id: 'asc' },
        skip,
        take,
        include: { translations: { orderBy: { language: 'asc' } } },
      }),
    ]);

    return createPaginatedResponse(rows, count, page, pageSize);
  }

  async getRawCommunitySubCategories({
    adminId,
    id,
    page,
    pageSize,
    search,
    communityCategoryId,
  }: {
    adminId?: string;
    id?: number;
    page: number;
    pageSize: number;
    search?: string;
    communityCategoryId?: number;
  }) {
    await this.requireAdmin(adminId, 'MODERATE_CONTENT');
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const where: Prisma.CommunitySubCategoryWhereInput = {
      ...(id != null && { id }),
      ...(communityCategoryId != null && { communityCategoryId }),
      ...(search?.trim() && {
        translations: {
          some: {
            subCategory: { contains: search.trim(), mode: 'insensitive' },
          },
        },
      }),
    };

    const [count, rows] = await Promise.all([
      this.prisma.communitySubCategory.count({ where }),
      this.prisma.communitySubCategory.findMany({
        where,
        orderBy: { id: 'asc' },
        skip,
        take,
        include: { translations: { orderBy: { language: 'asc' } } },
      }),
    ]);

    return createPaginatedResponse(rows, count, page, pageSize);
  }

  // ─── Bulk upserts: blog categories ────────────────────────────────────────────

  async bulkUpsertBlogCategories({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: BlogCategoryUpsertRowInput[];
  }): Promise<BulkResult> {
    await this.requireAdmin(adminId, 'WRITE_BLOG');

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        icon: row.icon,
        isActive: row.isActive,
        sortOrder: row.sortOrder,
        featuredFrom: row.featuredFrom,
        featuredUntil: row.featuredUntil,
      });

      if (row.id != null) {
        await this.prisma.blogCategory.update({ where: { id: row.id }, data });
        return { outcome: 'updated', id: row.id };
      }

      this.requireFields(row, ['icon']);
      const created = await this.prisma.blogCategory.create({
        data: { ...data, icon: row.icon! },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertBlogCategoryTranslations({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: BlogCategoryTranslationUpsertRowInput[];
  }): Promise<BulkResult> {
    await this.requireAdmin(adminId, 'WRITE_BLOG');

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        blogCategoryId: row.blogCategoryId,
        language: row.language,
        name: row.name,
        slug: row.slug,
        description: row.description,
        href: row.href,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        metaKeywords: row.metaKeywords,
      });

      if (row.id != null) {
        await this.prisma.blogCategoryTranslation.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      const { blogCategoryId, language } = row;
      if (blogCategoryId == null || !language) {
        throw new BadRequestError(
          'blogCategoryId and language are required when no id is provided',
        );
      }

      const existing = await this.prisma.blogCategoryTranslation.findUnique({
        where: { blogCategoryId_language: { blogCategoryId, language } },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.blogCategoryTranslation.update({
          where: { id: existing.id },
          data,
        });
        return { outcome: 'updated', id: existing.id };
      }

      this.requireFields(row, ['name', 'slug', 'description']);
      const created = await this.prisma.blogCategoryTranslation.create({
        data: {
          blogCategoryId,
          language,
          name: row.name!,
          slug: row.slug!,
          description: row.description!,
          href: row.href,
          metaTitle: row.metaTitle,
          metaDescription: row.metaDescription,
          metaKeywords: row.metaKeywords ?? [],
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  // ─── Bulk upserts: community categories ────────────────────────────────────────

  async bulkUpsertCommunityCategories({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: CommunityCategoryUpsertRowInput[];
  }): Promise<BulkResult> {
    await this.requireAdmin(adminId, 'MODERATE_CONTENT');

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        isActive: row.isActive,
        sortOrder: row.sortOrder,
        featuredFrom: row.featuredFrom,
        featuredUntil: row.featuredUntil,
      });

      if (row.id != null) {
        await this.prisma.communityCategory.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      const created = await this.prisma.communityCategory.create({ data });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertCommunityCategoryTranslations({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: CommunityCategoryTranslationUpsertRowInput[];
  }): Promise<BulkResult> {
    await this.requireAdmin(adminId, 'MODERATE_CONTENT');

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        communityCategoryId: row.communityCategoryId,
        language: row.language,
        category: row.category,
        slug: row.slug,
        href: row.href,
        description: row.description,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        metaKeywords: row.metaKeywords,
      });

      if (row.id != null) {
        await this.prisma.communityCategoryTranslation.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      const { communityCategoryId, language } = row;
      if (communityCategoryId == null || !language) {
        throw new BadRequestError(
          'communityCategoryId and language are required when no id is provided',
        );
      }

      const existing =
        await this.prisma.communityCategoryTranslation.findUnique({
          where: {
            communityCategoryId_language: { communityCategoryId, language },
          },
          select: { id: true },
        });

      if (existing) {
        await this.prisma.communityCategoryTranslation.update({
          where: { id: existing.id },
          data,
        });
        return { outcome: 'updated', id: existing.id };
      }

      this.requireFields(row, ['category', 'slug']);
      const created = await this.prisma.communityCategoryTranslation.create({
        data: {
          communityCategoryId,
          language,
          category: row.category!,
          slug: row.slug!,
          href: row.href,
          description: row.description,
          metaTitle: row.metaTitle,
          metaDescription: row.metaDescription,
          metaKeywords: row.metaKeywords ?? [],
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  // ─── Bulk upserts: community sub categories ────────────────────────────────────

  async bulkUpsertCommunitySubCategories({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: CommunitySubCategoryUpsertRowInput[];
  }): Promise<BulkResult> {
    await this.requireAdmin(adminId, 'MODERATE_CONTENT');

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        communityCategoryId: row.communityCategoryId,
        isActive: row.isActive,
        sortOrder: row.sortOrder,
        featuredFrom: row.featuredFrom,
        featuredUntil: row.featuredUntil,
      });

      if (row.id != null) {
        await this.prisma.communitySubCategory.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      if (row.communityCategoryId == null) {
        throw new BadRequestError(
          'communityCategoryId is required when no id is provided',
        );
      }

      const created = await this.prisma.communitySubCategory.create({
        data: { ...data, communityCategoryId: row.communityCategoryId },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertCommunitySubCategoryTranslations({
    adminId,
    rows,
  }: {
    adminId?: string;
    rows: CommunitySubCategoryTranslationUpsertRowInput[];
  }): Promise<BulkResult> {
    await this.requireAdmin(adminId, 'MODERATE_CONTENT');

    return this.processRows(rows, async (row) => {
      const data = this.pickDefined({
        communitySubCategoryId: row.communitySubCategoryId,
        language: row.language,
        subCategory: row.subCategory,
        slug: row.slug,
        href: row.href,
        description: row.description,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        metaKeywords: row.metaKeywords,
      });

      if (row.id != null) {
        await this.prisma.communitySubCategoryTranslation.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      const { communitySubCategoryId, language } = row;
      if (communitySubCategoryId == null || !language) {
        throw new BadRequestError(
          'communitySubCategoryId and language are required when no id is provided',
        );
      }

      const existing =
        await this.prisma.communitySubCategoryTranslation.findUnique({
          where: {
            communitySubCategoryId_language: {
              communitySubCategoryId,
              language,
            },
          },
          select: { id: true },
        });

      if (existing) {
        await this.prisma.communitySubCategoryTranslation.update({
          where: { id: existing.id },
          data,
        });
        return { outcome: 'updated', id: existing.id };
      }

      this.requireFields(row, ['subCategory', 'slug']);
      const created = await this.prisma.communitySubCategoryTranslation.create({
        data: {
          communitySubCategoryId,
          language,
          subCategory: row.subCategory!,
          slug: row.slug!,
          href: row.href,
          description: row.description,
          metaTitle: row.metaTitle,
          metaDescription: row.metaDescription,
          metaKeywords: row.metaKeywords ?? [],
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  // ─── Deletes ────────────────────────────────────────────────────────────────

  async deleteBlogCategory({ adminId, id }: { adminId?: string; id: number }) {
    await this.requireAdmin(adminId, 'WRITE_BLOG');
    try {
      // Translations cascade; blog posts referencing this category restrict.
      await this.prisma.blogCategory.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async deleteBlogCategoryTranslation({
    adminId,
    id,
  }: {
    adminId?: string;
    id: number;
  }) {
    await this.requireAdmin(adminId, 'WRITE_BLOG');
    try {
      await this.prisma.blogCategoryTranslation.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async deleteCommunityCategory({
    adminId,
    id,
  }: {
    adminId?: string;
    id: number;
  }) {
    await this.requireAdmin(adminId, 'MODERATE_CONTENT');
    try {
      // Translations cascade; sub categories restrict.
      await this.prisma.communityCategory.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async deleteCommunityCategoryTranslation({
    adminId,
    id,
  }: {
    adminId?: string;
    id: number;
  }) {
    await this.requireAdmin(adminId, 'MODERATE_CONTENT');
    try {
      await this.prisma.communityCategoryTranslation.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async deleteCommunitySubCategory({
    adminId,
    id,
  }: {
    adminId?: string;
    id: number;
  }) {
    await this.requireAdmin(adminId, 'MODERATE_CONTENT');
    try {
      await this.prisma.communitySubCategory.delete({ where: { id } });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  async deleteCommunitySubCategoryTranslation({
    adminId,
    id,
  }: {
    adminId?: string;
    id: number;
  }) {
    await this.requireAdmin(adminId, 'MODERATE_CONTENT');
    try {
      await this.prisma.communitySubCategoryTranslation.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      throw this.friendlyError(error);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Platform admin with `permission` (blog: WRITE_BLOG, community: MODERATE_CONTENT). */
  private requireAdmin(
    adminId: string | undefined,
    permission: AdminPermissionName,
  ): Promise<string> {
    return assertAdminCan(this.prisma, adminId, permission);
  }

  /** Throws when any of the listed fields is missing on a create row. */
  private requireFields<T extends object>(row: T, fields: (keyof T)[]): void {
    const missing = fields.filter(
      (f) => row[f] == null || row[f] === '',
    ) as string[];
    if (missing.length > 0) {
      throw new BadRequestError(
        `Missing required field(s) for create: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * Keeps only the keys that were actually provided so an update never
   * overwrites columns the row didn't mention. Explicit null passes through
   * to clear nullable columns.
   */
  private pickDefined<T extends Record<string, unknown>>(obj: T): T {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as T;
  }

  /**
   * Runs the handler per row, tallying outcomes. A row failure is recorded
   * with its 0-based index (and id when present) instead of aborting the batch.
   */
  private async processRows<T extends { id?: number | null }>(
    rows: T[],
    handler: (row: T) => Promise<BulkOutcome>,
  ): Promise<BulkResult> {
    const result: BulkResult = {
      created: 0,
      updated: 0,
      failed: 0,
      createdIds: [],
      errors: [],
    };

    for (const [index, row] of rows.entries()) {
      try {
        const { outcome, id } = await handler(row);
        result[outcome] += 1;
        if (outcome === 'created') result.createdIds.push(id);
      } catch (error) {
        result.failed += 1;
        result.errors.push({
          index,
          id: row.id ?? null,
          message: this.errorMessage(error),
        });
      }
    }

    if (result.failed > 0) {
      this.logger.warn(
        `Bulk upsert finished with ${result.failed} failed row(s): ` +
          result.errors
            .map(
              (e) => `#${e.index}${e.id ? ` (id ${e.id})` : ''}: ${e.message}`,
            )
            .join(' | '),
      );
    }

    return result;
  }

  /** Translates Prisma error codes into messages an admin can act on. */
  private errorMessage(error: unknown): string {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const target = Array.isArray(error.meta?.target)
        ? ` (${(error.meta.target as string[]).join(', ')})`
        : '';
      switch (error.code) {
        case 'P2002':
          return `Duplicate value violates a unique constraint${target}`;
        case 'P2003':
          return 'Invalid relation: the referenced id does not exist, or dependent rows still reference this one';
        case 'P2025':
          return 'Row not found';
        default:
          return `Database error ${error.code}`;
      }
    }
    if (error instanceof Error) return error.message;
    return 'Unknown error';
  }

  private friendlyError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return new BadRequestError(this.errorMessage(error));
    }
    return error instanceof Error ? error : new Error('Unknown error');
  }
}
