import { Language } from '@prisma/client';

export type CommunityCategory = {
  id: number;
  isActive: boolean;
  sortOrder: number;
  featuredFrom: Date | null;
  featuredUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CommunityCategoryTranslation = {
  id: number;
  communityCategoryId: number;
  language: Language;
  category: string;
  slug: string;
  description: string | null;
  href: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type CommunitySubCategory = {
  id: number;
  communityCategoryId: number;
  isActive: boolean;
  sortOrder: number;
  featuredFrom: Date | null;
  featuredUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CommunitySubCategoryTranslation = {
  id: number;
  communitySubCategoryId: number;
  language: Language;
  subCategory: string;
  slug: string;
  description: string | null;
  href: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
};
