import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogResolver } from './blog.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheService } from '../common/services';

@Module({
  imports: [PrismaModule],
  providers: [BlogService, BlogResolver, CacheService],
  exports: [BlogService],
})
export class BlogModule {}
