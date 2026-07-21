import { ObjectType, Field } from '@nestjs/graphql';
import { PageInfoEntity } from '../../common/entities/page-info.entity';
import { CommunityEventEntity } from './community-event.entity';
import { CommunityRegistrationEntity } from './community-registration.entity';

@ObjectType('AdminCommunityEventConnection')
export class CommunityEventConnectionEntity {
  @Field(() => [CommunityEventEntity])
  nodes: CommunityEventEntity[];

  @Field(() => PageInfoEntity)
  pageInfo: PageInfoEntity;
}

@ObjectType('AdminCommunityRegistrationConnection')
export class CommunityRegistrationConnectionEntity {
  @Field(() => [CommunityRegistrationEntity])
  nodes: CommunityRegistrationEntity[];

  @Field(() => PageInfoEntity)
  pageInfo: PageInfoEntity;
}
