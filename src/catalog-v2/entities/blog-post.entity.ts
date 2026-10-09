import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Language } from '@prisma/client';
import { PageInfoEntity } from '../../common/entities/page-info.entity';

/**
 * Public, read-only view of a blog post translation — the fields the web app
 * renders. Unlike the admin translation type it never exposes internal-only
 * columns, and a post carries exactly one translation (the requested language).
 */
@ObjectType('BlogPostTranslation')
export class BlogPostTranslationEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Language)
  language: Language;

  @Field(() => String)
  title: string;

  @Field(() => String)
  slug: string;

  @Field(() => String, { description: 'Full article body as authored.' })
  content: string;

  @Field(() => String, { nullable: true })
  excerpt?: string | null;

  @Field(() => String, { nullable: true })
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  metaDescription?: string | null;
}

/**
 * Public, read-only view of a published blog post. Only published posts that
 * have a translation in the requested language are ever returned, so
 * `translation` is populated in practice; it is nullable to stay defensive.
 */
@ObjectType('BlogPost')
export class BlogPostEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  blogCategoryId: number;

  @Field(() => String, {
    nullable: true,
    description: 'Cover image CDN URL (one image or none).',
  })
  coverImage?: string | null;

  @Field(() => Int)
  likes: number;

  @Field(() => Date, { nullable: true })
  publishedAt?: Date | null;

  @Field(() => BlogPostTranslationEntity, { nullable: true })
  translation?: BlogPostTranslationEntity | null;
}

@ObjectType('BlogPostConnection')
export class BlogPostConnectionEntity {
  @Field(() => [BlogPostEntity])
  nodes: BlogPostEntity[];

  @Field(() => PageInfoEntity)
  pageInfo: PageInfoEntity;
}
