import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlogType, BlogReactionType } from '../graphql/enums';
import { CreateBlogPostInput, UpdateBlogPostInput, PaginationInput } from './dto';
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

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async getBlogCatalog() {
    try {
      const categories = await this.prisma.blogCategory.findMany();

      if (!categories || categories.length === 0) {
        throw new NotFoundError('No se encontraron categorías de blogs');
      }

      return categories;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Error al intentar obtener el catálogo de blogs:', error);
      throw new InternalServerError('Error al obtener el catálogo de blogs');
    }
  }

  async getBlogCategories() {
    const categories = await this.prisma.blogCategory.findMany({
      include: {
        posts: true,
      },
    });

    if (!categories || categories.length === 0) {
      throw new NotFoundError('No se encontraron categorías de blogs');
    }

    return categories;
  }

  async getBlogs(input: PaginationInput) {
    try {
      const { page = 1, pageSize = 10 } = input;
      const { take, skip } = calculatePrismaParams(page, pageSize);

      const totalCount = await this.prisma.blogPost.count({
        where: {
          isPublished: true,
        },
      });

      const blogs = await this.prisma.blogPost.findMany({
        where: {
          isPublished: true,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take,
        skip,
      });

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

      const blog = await this.prisma.blogPost.findFirst({
        where: { id: parsedId },
      });

      if (!blog) {
        throw new NotFoundError('Blog no encontrado');
      }

      return blog;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof BadRequestError
      ) {
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

      const totalCount = await this.prisma.blogPost.count({
        where: {
          isPublished: true,
          type: category,
        },
      });

      const blogs = await this.prisma.blogPost.findMany({
        where: {
          isPublished: true,
          type: category,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take,
        skip,
      });

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

      const totalCount = await this.prisma.blogPost.count({
        where: {
          authorId,
        },
      });

      const blogs = await this.prisma.blogPost.findMany({
        where: {
          authorId,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take,
        skip,
      });

      return createPaginatedResponse(blogs, totalCount, page, pageSize);
    } catch (error) {
      console.error('Error getting blogs by author:', error);
      throw new InternalServerError(
        'Error al obtener los blogs del administrador',
      );
    }
  }

  async likeBlog(id: number, sellerId: string) {
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

  async dislikeBlog(id: number, sellerId: string) {
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

  async createBlogPost(input: CreateBlogPostInput, authorId: string) {
    try {
      const blog = await this.prisma.blogPost.create({
        data: {
          title: input.title,
          content: input.content,
          blogCategoryId: input.categoryId,
          type: input.type,
          authorId,
          updatedAt: new Date(),
        },
      });

      return blog;
    } catch (error) {
      console.error('Error creating blog post:', error);
      throw new InternalServerError('Error al crear la publicación del blog');
    }
  }

  async updateBlogPost(input: UpdateBlogPostInput) {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.categoryId !== undefined) {
        updateData.blogCategory = { connect: { id: input.categoryId } };
      }
      if (input.type !== undefined) updateData.type = input.type;

      const blog = await this.prisma.blogPost.update({
        where: { id: input.id },
        data: updateData,
      });

      return blog;
    } catch (error) {
      console.error('Error updating blog post:', error);
      throw new InternalServerError(
        'Error al actualizar la publicación del blog',
      );
    }
  }

  async publishBlogPost(id: number) {
    try {
      const blog = await this.prisma.blogPost.update({
        where: { id },
        data: {
          isPublished: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return blog;
    } catch (error) {
      console.error('Error publishing blog post:', error);
      throw new InternalServerError('Error al publicar la publicación del blog');
    }
  }

  async unpublishBlogPost(id: number) {
    try {
      const blog = await this.prisma.blogPost.update({
        where: { id },
        data: {
          isPublished: false,
          publishedAt: null,
          updatedAt: new Date(),
        },
      });

      return blog;
    } catch (error) {
      console.error('Error unpublishing blog post:', error);
      throw new InternalServerError(
        'Error al despublicar la publicación del blog',
      );
    }
  }

  async deleteBlogPost(id: number) {
    try {
      await this.prisma.blogPost.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      console.error('Error deleting blog post:', error);
      throw new InternalServerError(
        'Error al eliminar la publicación del blog',
      );
    }
  }

  async getBlogLikes(blogPostId: number): Promise<number> {
    return this.prisma.blogReaction.count({
      where: {
        blogPostId,
        reaction: BlogReactionType.LIKE,
      },
    });
  }

  async getBlogDislikes(blogPostId: number): Promise<number> {
    return this.prisma.blogReaction.count({
      where: {
        blogPostId,
        reaction: BlogReactionType.DISLIKE,
      },
    });
  }
}
