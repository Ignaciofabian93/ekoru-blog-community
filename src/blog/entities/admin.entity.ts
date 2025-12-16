import { ObjectType, Field, ID, Directive } from '@nestjs/graphql';

// Federated Admin type - external reference from users subgraph
@ObjectType()
@Directive('@key(fields: "id")')
@Directive('@extends')
export class Admin {
  @Field(() => ID)
  @Directive('@external')
  id: string;
}
