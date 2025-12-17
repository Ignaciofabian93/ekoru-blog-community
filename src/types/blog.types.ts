import { BlogType, BlogReactionType } from '../graphql/enums';

// Prisma types for Blog entities (matching Prisma schema exactly)
export interface PrismaBlogPost {
  id: number;
  title: string;
  content: string;
  authorId: string;
  blogCategoryId: number;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  type: BlogType;
}

export interface PrismaBlogCategory {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
}

export interface PrismaBlogReaction {
  id: number;
  blogPostId: number;
  sellerId: string;
  reaction: BlogReactionType;
  createdAt: Date;
  updatedAt: Date;
}

// Extended types with relations
export interface PrismaBlogCategoryWithPosts extends PrismaBlogCategory {
  posts: PrismaBlogPost[];
}

export interface PrismaBlogPostWithCategory extends PrismaBlogPost {
  blogCategory: PrismaBlogCategory;
}

export interface PrismaBlogPostWithReactions extends PrismaBlogPost {
  reactions: PrismaBlogReaction[];
}

// Utility types for service methods
export interface BlogPostCountOptions {
  where?: {
    isPublished?: boolean;
    type?: BlogType;
    authorId?: string;
  };
}

export interface BlogPostFindManyOptions {
  where?: {
    isPublished?: boolean;
    type?: BlogType;
    authorId?: string;
    id?: number;
  };
  orderBy?: {
    publishedAt?: 'asc' | 'desc';
    createdAt?: 'asc' | 'desc';
    updatedAt?: 'asc' | 'desc';
  };
  take?: number;
  skip?: number;
}

export interface BlogCategoryFindManyOptions {
  include?: {
    posts?: boolean;
  };
}

export interface BlogReactionFindFirstOptions {
  where: {
    blogPostId: number;
    sellerId: string;
  };
}

export interface BlogReactionCountOptions {
  where: {
    blogPostId: number;
    reaction: BlogReactionType;
  };
}

export interface BlogReactionCreateInput {
  blogPostId: number;
  sellerId: string;
  reaction: BlogReactionType;
  updatedAt: Date;
}

export interface BlogReactionUpdateInput {
  reaction: BlogReactionType;
}

export interface BlogPostUpdateData {
  title?: string;
  content?: string;
  blogCategory?: {
    connect: {
      id: number;
    };
  };
  type?: BlogType;
  isPublished?: boolean;
  publishedAt?: Date | null;
  updatedAt: Date;
}
