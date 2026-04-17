import { Language } from '@prisma/client';

type TranslationMap = Record<string, string>;

export const translations: Partial<Record<Language, TranslationMap>> = {
  [Language.ES]: {
    'errors.blog_category_not_found':
      "Categoría de blog con slug '{{slug}}' no encontrada",
    'errors.community_category_not_found':
      "Categoría de comunidad con slug '{{slug}}' no encontrada",
    'errors.community_subcategory_not_found':
      "Subcategoría de comunidad con slug '{{slug}}' no encontrada",
    'errors.limit_out_of_range': 'El límite debe estar entre {{min}} y {{max}}',
    'errors.offset_negative': 'El offset no puede ser negativo',
  },
  [Language.EN]: {
    'errors.blog_category_not_found':
      "Blog category with slug '{{slug}}' not found",
    'errors.community_category_not_found':
      "Community category with slug '{{slug}}' not found",
    'errors.community_subcategory_not_found':
      "Community sub-category with slug '{{slug}}' not found",
    'errors.limit_out_of_range': 'Limit must be between {{min}} and {{max}}',
    'errors.offset_negative': 'Offset must be non-negative',
  },
};
