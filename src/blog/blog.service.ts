import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlogType, BlogReactionType } from '../graphql/enums';
import { PaginationInput } from './dto';
import {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  InternalServerError,
} from '../common/exceptions';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils/pagination';
import {
  BlogCategory,
  BlogCategoryWithPosts,
  BlogPost,
  BlogReaction,
} from '../types';
import { CacheService } from '../common/services';

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getBlogCatalog(): Promise<BlogCategory[]> {
    try {
      // Cache for 5 minutes (300 seconds) - categories don't change often
      return await this.cache.getOrSet(
        'blog:categories:catalog',
        async () => {
          const categories =
            (await this.prisma.blogCategory.findMany()) as BlogCategory[];

          if (!categories || categories.length === 0) {
            throw new NotFoundError('No se encontraron categorías de blogs');
          }

          return categories;
        },
        300,
      );
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Error al intentar obtener el catálogo de blogs:', error);
      throw new InternalServerError('Error al obtener el catálogo de blogs');
    }
  }

  async getBlogCategories(): Promise<BlogCategoryWithPosts[]> {
    // Cache for 2 minutes (120 seconds) - includes posts count
    return await this.cache.getOrSet(
      'blog:categories:with-posts',
      async () => {
        const categories = (await this.prisma.blogCategory.findMany({
          include: {
            posts: true,
          },
        })) as BlogCategoryWithPosts[];

        if (!categories || categories.length === 0) {
          throw new NotFoundError('No se encontraron categorías de blogs');
        }

        return categories;
      },
      120,
    );
  }

  async getBlogs(input: PaginationInput) {
    try {
      const { page = 1, pageSize = 10 } = input;
      const { take, skip } = calculatePrismaParams(page, pageSize);

      const totalCount = (await this.prisma.blogPost.count({
        where: {
          isPublished: true,
        },
      })) as number;

      const blogs = (await this.prisma.blogPost.findMany({
        where: {
          isPublished: true,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take,
        skip,
      })) as BlogPost[];

      if (!blogs || blogs.length === 0) {
        throw new NotFoundError('No se encontraron blogs');
      }

      return createPaginatedResponse(blogs, totalCount, page, pageSize);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Error getting blogs:', error);
      throw new InternalServerError('Error al obtener los blogs');
    }
  }

  async getBlog(id: number) {
    try {
      const parsedId = Number(id);
      if (!parsedId || isNaN(parsedId)) {
        throw new BadRequestError('Se requiere un ID de blog válido');
      }

      const blog = (await this.prisma.blogPost.findFirst({
        where: { id: parsedId },
      })) as BlogPost | null;

      if (!blog) {
        throw new NotFoundError('Blog no encontrado');
      }

      return blog;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      console.error('Error getting blog:', error);
      throw new InternalServerError('Error al obtener el blog');
    }
  }

  async getBlogsByCategory(category: BlogType, input: PaginationInput) {
    try {
      const { page = 1, pageSize = 10 } = input;
      const { take, skip } = calculatePrismaParams(page, pageSize);

      const totalCount = (await this.prisma.blogPost.count({
        where: {
          isPublished: true,
          type: category,
        },
      })) as number;

      const blogs = (await this.prisma.blogPost.findMany({
        where: {
          isPublished: true,
          type: category,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take,
        skip,
      })) as BlogPost[];

      return createPaginatedResponse(blogs, totalCount, page, pageSize);
    } catch (error) {
      console.error('Error getting blogs by category:', error);
      throw new InternalServerError('Error al obtener los blogs por categoría');
    }
  }

  async getBlogsByAuthor(authorId: string, input: PaginationInput) {
    try {
      const { page = 1, pageSize = 10 } = input;
      const { take, skip } = calculatePrismaParams(page, pageSize);

      const totalCount = (await this.prisma.blogPost.count({
        where: {
          authorId,
        },
      })) as number;

      const blogs = (await this.prisma.blogPost.findMany({
        where: {
          authorId,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take,
        skip,
      })) as BlogPost[];

      return createPaginatedResponse(blogs, totalCount, page, pageSize);
    } catch (error) {
      console.error('Error getting blogs by author:', error);
      throw new InternalServerError(
        'Error al obtener los blogs del administrador',
      );
    }
  }

  async likeBlog(id: number, sellerId: string): Promise<boolean> {
    try {
      if (!sellerId) {
        throw new UnauthorizedError('No autorizado');
      }

      const checkExisting = await this.prisma.blogReaction.findFirst({
        where: {
          blogPostId: id,
          sellerId,
        },
      });

      if (checkExisting?.reaction === BlogReactionType.LIKE) {
        await this.prisma.blogReaction.delete({
          where: {
            id: checkExisting.id,
          },
        });
        return true;
      }

      if (checkExisting?.reaction === BlogReactionType.DISLIKE) {
        await this.prisma.blogReaction.update({
          where: {
            id: checkExisting.id,
          },
          data: {
            reaction: BlogReactionType.LIKE,
          },
        });
        return true;
      }

      await this.prisma.blogReaction.create({
        data: {
          blogPostId: id,
          sellerId,
          reaction: BlogReactionType.LIKE,
          updatedAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      console.error('Error liking blog:', error);
      throw new InternalServerError('Error al dar me gusta al blog');
    }
  }

  async dislikeBlog(id: number, sellerId: string): Promise<boolean> {
    try {
      if (!sellerId) {
        throw new UnauthorizedError('No autorizado');
      }

      const checkExisting = (await this.prisma.blogReaction.findFirst({
        where: {
          blogPostId: id,
          sellerId,
        },
      })) as BlogReaction | null;

      if (checkExisting?.reaction === BlogReactionType.DISLIKE) {
        await this.prisma.blogReaction.delete({
          where: {
            id: checkExisting.id,
          },
        });
        return true;
      }

      if (checkExisting?.reaction === BlogReactionType.LIKE) {
        await this.prisma.blogReaction.update({
          where: {
            id: checkExisting.id,
          },
          data: {
            reaction: BlogReactionType.DISLIKE,
          },
        });
        return true;
      }

      await this.prisma.blogReaction.create({
        data: {
          blogPostId: id,
          sellerId,
          reaction: BlogReactionType.DISLIKE,
          updatedAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      console.error('Error disliking blog:', error);
      throw new InternalServerError('Error al dar no me gusta al blog');
    }
  }
}
