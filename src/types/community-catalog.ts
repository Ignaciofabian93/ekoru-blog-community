export type CommunityCatalogSubcategory = {
  id: number;
  subcategory: string;
  slug: string;
  href: string | null;
  description: string | null;
};

export type CommunityCatalog = {
  id: number;
  category: string;
  slug: string;
  href: string | null;
  description: string | null;
  subcategories: CommunityCatalogSubcategory[];
};
