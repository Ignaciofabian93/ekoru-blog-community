import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ID,
  ResolveField,
  Parent,
  ResolveReference,
} from '@nestjs/graphql';
import { CommunityService } from './community.service';
import {
  CommunityPost,
  CommunityCategory,
  CommunityPostsConnection,
  CommunityCommentsConnection,
  CommunityComment,
} from './entities';
import { Seller } from '../blog/entities/seller.entity';
import {
  CreateCommunityPostInput,
  UpdateCommunityPostInput,
  CreateCommunityCommentInput,
  UpdateCommunityCommentInput,
} from './dto';
import { PaginationInput } from '../blog/dto';
import { CurrentSeller } from '../common/decorators/current-seller.decorator';

@Resolver(() => CommunityPost)
export class CommunityPostResolver {
  constructor(private readonly communityService: CommunityService) {}

  @Query(() => [CommunityCategory], { name: 'communityCatalog' })
  getCommunityCatalog() {
    return this.communityService.getCommunityCatalog();
  }

  @Query(() => [CommunityCategory], { name: 'communityCategories' })
  getCommunityCategories() {
    return this.communityService.getCommunityCategories();
  }

  @Query(() => CommunityPostsConnection, { name: 'communityPosts' })
  getCommunityPosts(
    @Args('input', { nullable: true }) input?: PaginationInput,
  ) {
    return this.communityService.getCommunityPosts(input || {});
  }

  @Query(() => CommunityPost, { name: 'communityPost' })
  getCommunityPost(@Args('id', { type: () => Int }) id: number) {
    return this.communityService.getCommunityPost(id);
  }

  @Query(() => CommunityPostsConnection, { name: 'communityPostsByAuthor' })
  getCommunityPostsByAuthor(
    @Args('authorId', { type: () => ID }) authorId: string,
    @Args('input', { nullable: true }) input?: PaginationInput,
  ) {
    return this.communityService.getCommunityPostsByAuthor(
      authorId,
      input || {},
    );
  }

  @Query(() => CommunityCommentsConnection, { name: 'communityComments' })
  getCommunityComments(
    @Args('postId', { type: () => Int }) postId: number,
    @Args('input', { nullable: true }) input?: PaginationInput,
  ) {
    return this.communityService.getCommunityComments(postId, input || {});
  }

  @Mutation(() => CommunityPost)
  createCommunityPost(
    @Args('input') input: CreateCommunityPostInput,
    @CurrentSeller() sellerId: string,
  ) {
    return this.communityService.createCommunityPost(
      input,
      sellerId || 'temp-seller-id',
    );
  }

  @Mutation(() => CommunityPost)
  updateCommunityPost(@Args('input') input: UpdateCommunityPostInput) {
    return this.communityService.updateCommunityPost(input);
  }

  @Mutation(() => Boolean)
  deleteCommunityPost(@Args('id', { type: () => Int }) id: number) {
    return this.communityService.deleteCommunityPost(id);
  }

  @Mutation(() => CommunityPost)
  likeCommunityPost(@Args('id', { type: () => Int }) id: number) {
    return this.communityService.likeCommunityPost(id);
  }

  @Mutation(() => CommunityComment)
  createCommunityComment(
    @Args('input') input: CreateCommunityCommentInput,
    @CurrentSeller() sellerId: string,
  ) {
    return this.communityService.createCommunityComment(
      input,
      sellerId || 'temp-seller-id',
    );
  }

  @Mutation(() => CommunityComment)
  updateCommunityComment(@Args('input') input: UpdateCommunityCommentInput) {
    return this.communityService.updateCommunityComment(input);
  }

  @Mutation(() => Boolean)
  deleteCommunityComment(@Args('id', { type: () => Int }) id: number) {
    return this.communityService.deleteCommunityComment(id);
  }

  @ResolveField(() => Seller, { nullable: true })
  author(@Parent() post: CommunityPost) {
    if (!post.authorId) return null;
    return { __typename: 'Seller', id: post.authorId };
  }

  @ResolveReference()
  resolveReference(reference: { __typename: string; id: number }) {
    return this.communityService.getCommunityPost(reference.id);
  }
}

@Resolver(() => CommunityComment)
export class CommunityCommentResolver {
  constructor(private readonly communityService: CommunityService) {}

  @ResolveField(() => Seller, { nullable: true })
  seller(@Parent() comment: CommunityComment) {
    if (!comment.sellerId) return null;
    return { __typename: 'Seller', id: comment.sellerId };
  }
}
