import { BlogType } from './enums';

export type BlogPost = {
  id: number;
  authorId: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  blogCatalogId: number;
  type: BlogType;
  dislikes: number;
  likes: number;
  blogCategory: string;
  blogReactions: [];
};
