import { BlogReactionType } from '../graphql/enums';

// Prisma types for Blog entities (matching Prisma schema exactly)
export interface BlogPost {
  id: number;
  title: string;
  content: string;
  authorId: string;
  blogCategoryId: number;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogCategory {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
}

export interface BlogReaction {
  id: number;
  blogPostId: number;
  sellerId: string;
  reaction: BlogReactionType;
  createdAt: Date;
  updatedAt: Date;
}

// Extended types with relations
export interface BlogCategoryWithPosts extends BlogCategory {
  posts: BlogPost[];
}

export interface BlogPostWithCategory extends BlogPost {
  blogCategory: BlogCategory;
}

export interface BlogPostWithReactions extends BlogPost {
  reactions: BlogReaction[];
}

// Utility types for service methods
export interface BlogPostCountOptions {
  where?: {
    isPublished?: boolean;
    authorId?: string;
  };
}

export interface BlogPostFindManyOptions {
  where?: {
    isPublished?: boolean;
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
    reaction: BlogReaction;
  };
}

export interface BlogReactionCreateInput {
  blogPostId: number;
  sellerId: string;
  reaction: BlogReaction;
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
  isPublished?: boolean;
  publishedAt?: Date | null;
  updatedAt: Date;
}
