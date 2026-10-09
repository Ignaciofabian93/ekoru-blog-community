import { ObjectType, Field, Int } from '@nestjs/graphql';
import { BlogPostTranslationEntity } from './blog-post-translation.entity';

/**
 * Admin view of a blog post — the row exactly as stored (every translation,
 * unpublished included). `likes`/`dislikes` are read-only counts driven by
 * BlogReaction from the web app.
 */
@ObjectType('AdminBlogPost')
export class BlogPostEntity {
  @Field(() => Int)
  id: number;

  @Field(() => String, { description: 'Authoring admin id' })
  authorId: string;

  @Field(() => Int)
  blogCategoryId: number;

  @Field(() => String, {
    nullable: true,
    description: 'Cover image CDN URL (one image or none)',
  })
  coverImage?: string | null;

  @Field(() => Boolean)
  isPublished: boolean;

  @Field(() => Date, { nullable: true })
  publishedAt?: Date | null;

  @Field(() => Int)
  likes: number;

  @Field(() => Int)
  dislikes: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => [BlogPostTranslationEntity])
  translations: BlogPostTranslationEntity[];
}
