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
import { BlogService } from './blog.service';
import { BlogPost, BlogCategory, BlogPostsConnection, Admin } from './entities';
import { PaginationInput } from './dto';
import { BlogType } from '../graphql/enums';
import { CurrentSeller } from '../common/decorators/current-seller.decorator';

@Resolver(() => BlogPost)
export class BlogResolver {
  constructor(private readonly blogService: BlogService) {}

  @Query(() => [BlogCategory], { name: 'blogCatalog' })
  getBlogCatalog() {
    return this.blogService.getBlogCatalog();
  }

  @Query(() => [BlogCategory], { name: 'blogCategories' })
  getBlogCategories() {
    return this.blogService.getBlogCategories();
  }

  @Query(() => BlogPostsConnection, { name: 'blogs' })
  getBlogs(@Args('input', { nullable: true }) input?: PaginationInput) {
    return this.blogService.getBlogs(input || {});
  }

  @Query(() => BlogPost, { name: 'blog' })
  getBlog(@Args('id', { type: () => Int }) id: number) {
    return this.blogService.getBlog(id);
  }

  @Query(() => BlogPostsConnection, { name: 'blogsByCategory' })
  getBlogsByCategory(
    @Args('category', { type: () => BlogType }) category: BlogType,
    @Args('input', { nullable: true }) input?: PaginationInput,
  ) {
    return this.blogService.getBlogsByCategory(category, input || {});
  }

  @Query(() => BlogPostsConnection, { name: 'blogsByAuthor' })
  getBlogsByAuthor(
    @Args('authorId', { type: () => ID }) authorId: string,
    @Args('input', { nullable: true }) input?: PaginationInput,
  ) {
    return this.blogService.getBlogsByAuthor(authorId, input || {});
  }

  @Mutation(() => Boolean)
  likeBlog(
    @Args('id', { type: () => Int }) id: number,
    @CurrentSeller() sellerId: string,
  ) {
    return this.blogService.likeBlog(id, sellerId);
  }

  @Mutation(() => Boolean)
  dislikeBlog(
    @Args('id', { type: () => Int }) id: number,
    @CurrentSeller() sellerId: string,
  ) {
    return this.blogService.dislikeBlog(id, sellerId);
  }

  @ResolveField(() => Admin, { nullable: true })
  author(@Parent() blogPost: BlogPost) {
    if (!blogPost.authorId) return null;
    return { __typename: 'Admin', id: blogPost.authorId };
  }

  @ResolveReference()
  resolveReference(reference: { __typename: string; id: number }) {
    return this.blogService.getBlog(reference.id);
  }
}
