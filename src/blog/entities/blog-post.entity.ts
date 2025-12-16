import { ObjectType, Field, ID, Int, Directive } from '@nestjs/graphql';
import { BlogType } from '../../graphql/enums';
import { Admin } from './admin.entity';

@ObjectType()
@Directive('@key(fields: "id")')
export class BlogPost {
  @Field(() => ID)
  id: number;

  @Field()
  title: string;

  @Field()
  content: string;

  @Field()
  authorId: string;

  @Field()
  isPublished: boolean;

  @Field(() => Date, { nullable: true })
  publishedAt?: Date | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Admin, { nullable: true })
  author?: Admin;

  @Field(() => Int, { nullable: true })
  likes?: number;

  @Field(() => Int, { nullable: true })
  dislikes?: number;

  @Field(() => BlogType)
  type: BlogType;
}
