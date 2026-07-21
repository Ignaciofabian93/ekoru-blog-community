import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommunityEventService } from './community-event.service';
import { CommunityEventResolver } from './community-event.resolver';

/**
 * Community Events Module — platform-admin CRUD over community events (the
 * CommunityPost table) plus read/management of their registrations.
 */
@Module({
  imports: [PrismaModule],
  providers: [CommunityEventService, CommunityEventResolver],
  exports: [CommunityEventService],
})
export class CommunityEventsModule {}
