import { registerEnumType } from '@nestjs/graphql';

export enum BlogReactionType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

export enum BlogType {
  RECYCLING = 'RECYCLING',
  POLLUTION = 'POLLUTION',
  SUSTAINABILITY = 'SUSTAINABILITY',
  CIRCULAR_ECONOMY = 'CIRCULAR_ECONOMY',
  USED_PRODUCTS = 'USED_PRODUCTS',
  REUSE = 'REUSE',
  ENVIRONMENT = 'ENVIRONMENT',
  UPCYCLING = 'UPCYCLING',
  RESPONSIBLE_CONSUMPTION = 'RESPONSIBLE_CONSUMPTION',
  ECO_TIPS = 'ECO_TIPS',
  ENVIRONMENTAL_IMPACT = 'ENVIRONMENTAL_IMPACT',
  SUSTAINABLE_LIVING = 'SUSTAINABLE_LIVING',
  OTHER = 'OTHER',
  SECURITY = 'SECURITY',
}

// Register enums with GraphQL
registerEnumType(BlogReactionType, {
  name: 'BlogReactionType',
  description: 'Blog reaction types',
});

registerEnumType(BlogType, {
  name: 'BlogType',
  description: 'Blog post category types',
});
