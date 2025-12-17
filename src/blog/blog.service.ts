import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlogType, BlogReactionType } from '../graphql/enums';
import {
  CreateBlogPostInput,
  UpdateBlogPostInput,
  PaginationInput,
} from './dto';
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
  PrismaBlogCategory,
  PrismaBlogCategoryWithPosts,
  PrismaBlogPost,
  PrismaBlogReaction,
  BlogPostUpdateData,
} from '../types';
import { CacheService } from '../common/services';

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getBlogCatalog(): Promise<PrismaBlogCategory[]> {
    try {
      // Cache for 5 minutes (300 seconds) - categories don't change often
      return await this.cache.getOrSet(
        'blog:categories:catalog',
        async () => {
          const categories =
            (await this.prisma.blogCategory.findMany()) as PrismaBlogCategory[];

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

  async getBlogCategories(): Promise<PrismaBlogCategoryWithPosts[]> {
    // Cache for 2 minutes (120 seconds) - includes posts count
    return await this.cache.getOrSet(
      'blog:categories:with-posts',
      async () => {
        const categories = (await this.prisma.blogCategory.findMany({
          include: {
            posts: true,
          },
        })) as PrismaBlogCategoryWithPosts[];

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
      })) as PrismaBlogPost[];

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
      })) as PrismaBlogPost | null;

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
      })) as PrismaBlogPost[];

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
      })) as PrismaBlogPost[];

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
      })) as PrismaBlogReaction | null;

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

  async createBlogPost(
    input: CreateBlogPostInput,
    authorId: string,
  ): Promise<PrismaBlogPost> {
    try {
      const blog = (await this.prisma.blogPost.create({
        data: {
          title: input.title,
          content: input.content,
          blogCategoryId: input.categoryId,
          type: input.type,
          authorId,
          updatedAt: new Date(),
        },
      })) as PrismaBlogPost;

      // Invalidate relevant caches
      this.cache.invalidateByPattern('blog:categories');
      this.cache.invalidateByPattern('blog:posts');

      return blog;
    } catch (error) {
      console.error('Error creating blog post:', error);
      throw new InternalServerError('Error al crear la publicación del blog');
    }
  }

  async updateBlogPost(input: UpdateBlogPostInput): Promise<PrismaBlogPost> {
    try {
      const updateData: BlogPostUpdateData = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.categoryId !== undefined) {
        updateData.blogCategory = { connect: { id: input.categoryId } };
      }
      if (input.type !== undefined) updateData.type = input.type;

      const blog = (await this.prisma.blogPost.update({
        where: { id: input.id },
        data: updateData,
      })) as PrismaBlogPost;

      // Invalidate caches
      this.cache.delete(`blog:post:${input.id}`);
      this.cache.invalidateByPattern('blog:categories');
      this.cache.invalidateByPattern('blog:posts');

      return blog;
    } catch (error) {
      console.error('Error updating blog post:', error);
      throw new InternalServerError(
        'Error al actualizar la publicación del blog',
      );
    }
  }

  async publishBlogPost(id: number): Promise<PrismaBlogPost> {
    try {
      const blog = (await this.prisma.blogPost.update({
        where: { id },
        data: {
          isPublished: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      })) as PrismaBlogPost;

      // Invalidate caches
      this.cache.delete(`blog:post:${id}`);
      this.cache.invalidateByPattern('blog:categories');
      this.cache.invalidateByPattern('blog:posts');

      return blog;
    } catch (error) {
      console.error('Error publishing blog post:', error);
      throw new InternalServerError(
        'Error al publicar la publicación del blog',
      );
    }
  }

  async unpublishBlogPost(id: number): Promise<PrismaBlogPost> {
    try {
      const blog = (await this.prisma.blogPost.update({
        where: { id },
        data: {
          isPublished: false,
          publishedAt: null,
          updatedAt: new Date(),
        },
      })) as PrismaBlogPost;

      // Invalidate caches
      this.cache.delete(`blog:post:${id}`);
      this.cache.invalidateByPattern('blog:categories');
      this.cache.invalidateByPattern('blog:posts');

      return blog;
    } catch (error) {
      console.error('Error unpublishing blog post:', error);
      throw new InternalServerError(
        'Error al despublicar la publicación del blog',
      );
    }
  }

  async deleteBlogPost(id: number): Promise<boolean> {
    try {
      await this.prisma.blogPost.delete({
        where: { id },
      });

      // Invalidate caches
      this.cache.delete(`blog:post:${id}`);
      this.cache.invalidateByPattern('blog:categories');
      this.cache.invalidateByPattern('blog:posts');

      return true;
    } catch (error) {
      console.error('Error deleting blog post:', error);
      throw new InternalServerError(
        'Error al eliminar la publicación del blog',
      );
    }
  }

  async getBlogLikes(blogPostId: number): Promise<number> {
    return (await this.prisma.blogReaction.count({
      where: {
        blogPostId,
        reaction: BlogReactionType.LIKE,
      },
    })) as number;
  }

  async getBlogDislikes(blogPostId: number): Promise<number> {
    try {
      const count = (await this.prisma.blogReaction.count({
        where: {
          blogPostId,
          reaction: BlogReactionType.DISLIKE,
        },
      })) as number;
      return count;
    } catch (error) {
      console.error('Error getting blog dislikes:', error);
      throw new InternalServerError('Error al obtener los dislikes del blog');
    }
  }
}
