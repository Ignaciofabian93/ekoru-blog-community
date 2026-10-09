export type BlogPost = {
  id: number;
  authorId: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  blogCatalogId: number;
  dislikes: number;
  likes: number;
  blogCategory: string;
  blogReactions: [];
};
