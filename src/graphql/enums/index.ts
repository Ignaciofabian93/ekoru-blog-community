import { registerEnumType } from '@nestjs/graphql';
import { BlogType, Language } from '@prisma/client';

export { BlogType };

export enum BlogReactionType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

// Register enums with GraphQL
registerEnumType(Language, {
  name: 'Language',
  description: 'Supported languages for multi-language content',
});

registerEnumType(BlogType, {
  name: 'BlogType',
  description: 'Blog post category types',
});

registerEnumType(BlogReactionType, {
  name: 'BlogReactionType',
  description: 'Blog reaction types',
});
