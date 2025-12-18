import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import {
  CommunityPostResolver,
  CommunityCommentResolver,
} from './community.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheService } from '../common/services';

@Module({
  imports: [PrismaModule],
  providers: [
    CommunityService,
    CommunityPostResolver,
    CommunityCommentResolver,
    CacheService,
  ],
  exports: [CommunityService],
})
export class CommunityModule {}
