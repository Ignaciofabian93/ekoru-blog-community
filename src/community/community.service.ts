import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCommunityPostInput,
  UpdateCommunityPostInput,
  CreateCommunityCommentInput,
  UpdateCommunityCommentInput,
} from './dto';
import { PaginationInput } from '../blog/dto';
import {
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '../common/exceptions';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../common/utils/pagination';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async getCommunityCatalog() {
    try {
      const categories = await this.prisma.communityCategory.findMany({
        include: {
          subcategories: true,
        },
      });

      if (!categories || categories.length === 0) {
        throw new NotFoundError('No se encontró el catálogo de comunidad');
      }

      return categories;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error(
        'Error al intentar obtener el catálogo de comunidad:',
        error,
      );
      throw new InternalServerError(
        'Error al obtener el catálogo de comunidad',
      );
    }
  }

  async getCommunityCategories() {
    try {
      const categories = await this.prisma.communityCategory.findMany({
        include: {
          subcategories: true,
        },
      });

      if (!categories || categories.length === 0) {
        throw new NotFoundError('No se encontraron categorías de comunidad');
      }

      return categories;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Error getting community categories:', error);
      throw new InternalServerError(
        'Error al obtener las categorías de comunidad',
      );
    }
  }

  async getCommunityPosts(input: PaginationInput) {
    try {
      const { page = 1, pageSize = 10 } = input;
      const { take, skip } = calculatePrismaParams(page, pageSize);

      const totalCount = await this.prisma.communityPost.count();

      const posts = await this.prisma.communityPost.findMany({
        include: {
          author: true,
          communityComment: {
            include: {
              seller: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take,
        skip,
      });

      if (!posts || posts.length === 0) {
        throw new NotFoundError('No se encontraron publicaciones de comunidad');
      }

      return createPaginatedResponse(posts, totalCount, page, pageSize);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Error getting community posts:', error);
      throw new InternalServerError(
        'Error al obtener las publicaciones de comunidad',
      );
    }
  }

  async getCommunityPost(id: number) {
    try {
      if (!id) {
        throw new BadRequestError('Se requiere un ID de publicación válido');
      }

      const post = await this.prisma.communityPost.findFirst({
        where: { id },
        include: {
          author: true,
          communityComment: {
            include: {
              seller: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!post) {
        throw new NotFoundError('Publicación de comunidad no encontrada');
      }

      return post;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      console.error('Error getting community post:', error);
      throw new InternalServerError(
        'Error al obtener la publicación de comunidad',
      );
    }
  }

  async getCommunityPostsByAuthor(authorId: string, input: PaginationInput) {
    try {
      const { page = 1, pageSize = 10 } = input;
      const { take, skip } = calculatePrismaParams(page, pageSize);

      const totalCount = await this.prisma.communityPost.count({
        where: {
          authorId,
        },
      });

      const posts = await this.prisma.communityPost.findMany({
        where: {
          authorId,
        },
        include: {
          author: true,
          communityComment: {
            include: {
              seller: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take,
        skip,
      });

      return createPaginatedResponse(posts, totalCount, page, pageSize);
    } catch (error) {
      console.error('Error getting community posts by author:', error);
      throw new InternalServerError(
        'Error al obtener las publicaciones de comunidad del autor',
      );
    }
  }

  async getCommunityComments(postId: number, input: PaginationInput) {
    try {
      const { page = 1, pageSize = 10 } = input;
      const { take, skip } = calculatePrismaParams(page, pageSize);

      const totalCount = await this.prisma.communityComment.count({
        where: {
          communityPostId: postId,
        },
      });

      const comments = await this.prisma.communityComment.findMany({
        where: {
          communityPostId: postId,
        },
        include: {
          seller: true,
          communityPost: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take,
        skip,
      });

      return createPaginatedResponse(comments, totalCount, page, pageSize);
    } catch (error) {
      console.error('Error getting community comments:', error);
      throw new InternalServerError(
        'Error al obtener los comentarios de la comunidad',
      );
    }
  }

  async createCommunityPost(input: CreateCommunityPostInput, authorId: string) {
    try {
      const post = await this.prisma.communityPost.create({
        data: {
          title: input.title,
          content: input.content,
          images: input.images || [],
          authorId,
          updatedAt: new Date(),
        },
        include: {
          author: true,
          communityComment: {
            include: {
              seller: true,
            },
          },
        },
      });

      return post;
    } catch (error) {
      console.error('Error creating community post:', error);
      throw new InternalServerError(
        'Error al crear la publicación de comunidad',
      );
    }
  }

  async updateCommunityPost(input: UpdateCommunityPostInput) {
    try {
      const updateData: {
        updatedAt: Date;
        title?: string;
        content?: string;
        images?: string[];
      } = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.images !== undefined) updateData.images = input.images;

      const post = await this.prisma.communityPost.update({
        where: { id: input.id },
        data: updateData,
        include: {
          author: true,
          communityComment: {
            include: {
              seller: true,
            },
          },
        },
      });

      return post;
    } catch (error) {
      console.error('Error updating community post:', error);
      throw new InternalServerError(
        'Error al actualizar la publicación de comunidad',
      );
    }
  }

  async deleteCommunityPost(id: number) {
    try {
      await this.prisma.communityPost.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      console.error('Error deleting community post:', error);
      throw new InternalServerError(
        'Error al eliminar la publicación de comunidad',
      );
    }
  }

  async likeCommunityPost(id: number) {
    try {
      const post = await this.prisma.communityPost.update({
        where: { id },
        data: {
          likes: {
            increment: 1,
          },
          updatedAt: new Date(),
        },
        include: {
          author: true,
          communityComment: {
            include: {
              seller: true,
            },
          },
        },
      });

      return post;
    } catch (error) {
      console.error('Error liking community post:', error);
      throw new InternalServerError(
        'Error al dar me gusta a la publicación de comunidad',
      );
    }
  }

  async createCommunityComment(
    input: CreateCommunityCommentInput,
    sellerId: string,
  ) {
    try {
      // First increment the comment count on the post
      await this.prisma.communityPost.update({
        where: { id: input.postId },
        data: {
          comments: {
            increment: 1,
          },
          updatedAt: new Date(),
        },
      });

      const comment = await this.prisma.communityComment.create({
        data: {
          communityPostId: input.postId,
          sellerId,
          content: input.content,
          updatedAt: new Date(),
        },
        include: {
          seller: true,
          communityPost: {
            include: {
              author: true,
            },
          },
        },
      });

      return comment;
    } catch (error) {
      console.error('Error creating community comment:', error);
      throw new InternalServerError(
        'Error al crear el comentario de comunidad',
      );
    }
  }

  async updateCommunityComment(input: UpdateCommunityCommentInput) {
    try {
      const comment = await this.prisma.communityComment.update({
        where: { id: input.id },
        data: {
          content: input.content,
          updatedAt: new Date(),
        },
        include: {
          seller: true,
          communityPost: {
            include: {
              author: true,
            },
          },
        },
      });

      return comment;
    } catch (error) {
      console.error('Error updating community comment:', error);
      throw new InternalServerError(
        'Error al actualizar el comentario de comunidad',
      );
    }
  }

  async deleteCommunityComment(id: number) {
    try {
      // Get the comment to find the post ID for decrementing count
      const comment = await this.prisma.communityComment.findUnique({
        where: { id },
      });

      if (!comment) {
        throw new NotFoundError('Comentario no encontrado');
      }

      // Delete the comment and decrement the count on the post
      await this.prisma.$transaction([
        this.prisma.communityComment.delete({
          where: { id },
        }),
        this.prisma.communityPost.update({
          where: { id: comment.communityPostId },
          data: {
            comments: {
              decrement: 1,
            },
            updatedAt: new Date(),
          },
        }),
      ]);

      return true;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Error deleting community comment:', error);
      throw new InternalServerError(
        'Error al eliminar el comentario de comunidad',
      );
    }
  }
}
