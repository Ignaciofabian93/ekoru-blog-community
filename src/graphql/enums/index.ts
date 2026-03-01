import { registerEnumType } from '@nestjs/graphql';
import { BlogType } from '@prisma/client';

export { BlogType };

export enum BlogReactionType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

// Register enums with GraphQL
registerEnumType(BlogType, {
  name: 'BlogType',
  description: 'Blog post category types',
});

registerEnumType(BlogReactionType, {
  name: 'BlogReactionType',
  description: 'Blog reaction types',
});
