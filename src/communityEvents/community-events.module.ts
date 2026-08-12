import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommunityEventService } from './community-event.service';
import { CommunityEventResolver } from './community-event.resolver';
import { CommunityEventPublicResolver } from './community-event-public.resolver';

/**
 * Community Events Module — two surfaces over the same CommunityPost table:
 * the platform-admin CRUD (`CommunityEventResolver`) and the app-facing one
 * (`CommunityEventPublicResolver`), where business accounts organise events and
 * everyone else reserves a place.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    CommunityEventService,
    CommunityEventResolver,
    CommunityEventPublicResolver,
  ],
  exports: [CommunityEventService],
})
export class CommunityEventsModule {}
