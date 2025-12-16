import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogResolver } from './blog.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BlogService, BlogResolver],
  exports: [BlogService],
})
export class BlogModule {}
