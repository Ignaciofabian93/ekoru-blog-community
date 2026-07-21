import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BlogPostService } from './blog-post.service';
import { BlogPostResolver } from './blog-post.resolver';

/**
 * Blog Posts Module — platform-admin CRUD over blog posts and their
 * translations (form-based authoring from the admin panel).
 */
@Module({
  imports: [PrismaModule],
  providers: [BlogPostService, BlogPostResolver],
  exports: [BlogPostService],
})
export class BlogPostsModule {}
