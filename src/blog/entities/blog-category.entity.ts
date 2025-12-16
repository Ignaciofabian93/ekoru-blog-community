import { ObjectType, Field, ID } from '@nestjs/graphql';
import { BlogPost } from './blog-post.entity';

@ObjectType()
export class BlogCategory {
  @Field(() => ID)
  id: number;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  icon?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => [BlogPost])
  posts: BlogPost[];

  @Field(() => String, { nullable: true })
  href?: string | null;
}
