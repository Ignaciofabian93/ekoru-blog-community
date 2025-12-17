import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import {
  CommunityPostResolver,
  CommunityCommentResolver,
} from './community.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    CommunityService,
    CommunityPostResolver,
    CommunityCommentResolver,
  ],
  exports: [CommunityService],
})
export class CommunityModule {}
