import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Language } from '@prisma/client';

@ObjectType('AdminBlogPostTranslation')
export class BlogPostTranslationEntity {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  blogPostId: number;

  @Field(() => Language)
  language: Language;

  @Field(() => String)
  title: string;

  @Field(() => String)
  slug: string;

  @Field(() => String)
  content: string;

  @Field(() => String, { nullable: true })
  excerpt?: string | null;

  @Field(() => String, { nullable: true })
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  metaDescription?: string | null;

  @Field(() => [String])
  metaKeywords: string[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
