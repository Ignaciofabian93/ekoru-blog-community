import { BlogPost } from './blog-post';
import { Language } from './enums';

export type BlogCategory = {
  id: number;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  featuredFrom: Date | null;
  featuredUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  posts: BlogPost[];
  translations: BlogCategoryTranslation[];
};

export type BlogCategoryTranslation = {
  id: number;
  blogCategoryId: number;
  language: Language;
  name: string;
  slug: string;
  description: string;
  href: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
  blogCategory: BlogCategory;
};
