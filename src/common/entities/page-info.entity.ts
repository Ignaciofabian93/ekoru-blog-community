import { ObjectType, Field, Int } from '@nestjs/graphql';

/**
 * Pagination metadata for the admin connection types. Named uniquely
 * (`BlogCommunityPageInfo`) to avoid a federated-supergraph collision with the
 * `PageInfo` types other subgraphs expose.
 */
@ObjectType('BlogCommunityPageInfo')
export class PageInfoEntity {
  @Field(() => Int)
  currentPage: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => Int)
  totalCount: number;

  @Field(() => Boolean)
  hasNextPage: boolean;

  @Field(() => Boolean)
  hasPreviousPage: boolean;

  @Field(() => Int)
  pageSize: number;
}
