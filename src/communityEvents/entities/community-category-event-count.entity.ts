import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * How many upcoming public events a community category holds — the same events
 * `communityEvents` lists by default. Categories with none are left out.
 */
@ObjectType('CommunityCategoryEventCount')
export class CommunityCategoryEventCountEntity {
  @Field(() => Int)
  communityCategoryId: number;

  @Field(() => Int)
  count: number;
}
