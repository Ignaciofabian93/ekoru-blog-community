import { ObjectType, Field, ID, Directive } from '@nestjs/graphql';

// Federated Seller type - external reference from users subgraph
@ObjectType()
@Directive('@key(fields: "id")')
@Directive('@extends')
export class Seller {
  @Field(() => ID)
  @Directive('@external')
  id: string;
}
