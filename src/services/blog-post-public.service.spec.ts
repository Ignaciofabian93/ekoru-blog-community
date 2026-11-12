import { Language } from '@prisma/client';
import { BlogPostPublicService } from './blog-post-public.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BlogPostPublicService', () => {
  let prisma: {
    blogCategoryTranslation: { findFirst: jest.Mock };
    blogPost: { count: jest.Mock; findMany: jest.Mock; groupBy: jest.Mock };
  };
  let service: BlogPostPublicService;

  const row = {
    id: 1,
    blogCategoryId: 3,
    coverImage: null,
    likes: 0,
    publishedAt: new Date('2026-11-01'),
    translations: [{ id: 10, language: 'ES', title: 'Hola', slug: 'hola' }],
  };

  beforeEach(() => {
    prisma = {
      blogCategoryTranslation: { findFirst: jest.fn() },
      blogPost: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([row]),
        groupBy: jest.fn().mockResolvedValue([
          { blogCategoryId: 1, _count: { _all: 2 } },
          { blogCategoryId: 3, _count: { _all: 1 } },
        ]),
      },
    };
    service = new BlogPostPublicService(prisma as unknown as PrismaService);
  });

  it('lists published posts from every category when no slug is given', async () => {
    const page = await service.getPosts({
      language: Language.ES,
      page: 1,
      pageSize: 12,
    });

    expect(prisma.blogCategoryTranslation.findFirst).not.toHaveBeenCalled();
    const { where, orderBy } = prisma.blogPost.findMany.mock.calls[0][0];
    expect(where).toEqual({
      isPublished: true,
      translations: { some: { language: Language.ES } },
    });
    expect(orderBy).toEqual([{ publishedAt: 'desc' }, { id: 'desc' }]);
    expect(page.nodes).toEqual([
      expect.objectContaining({ id: 1, blogCategoryId: 3 }),
    ]);
    expect(page.nodes[0].translation).toMatchObject({ slug: 'hola' });
  });

  it("narrows to the slug's category", async () => {
    prisma.blogCategoryTranslation.findFirst.mockResolvedValue({
      blogCategoryId: 3,
    });

    await service.getPosts({
      categorySlug: 'reciclaje',
      language: Language.ES,
      page: 1,
      pageSize: 12,
    });

    expect(prisma.blogCategoryTranslation.findFirst).toHaveBeenCalledWith({
      where: { slug: 'reciclaje', language: Language.ES },
      select: { blogCategoryId: true },
    });
    expect(prisma.blogPost.findMany.mock.calls[0][0].where).toMatchObject({
      blogCategoryId: 3,
    });
  });

  it('returns an empty page for an unknown slug', async () => {
    prisma.blogCategoryTranslation.findFirst.mockResolvedValue(null);

    const page = await service.getPostsByCategory({
      categorySlug: 'nope',
      language: Language.ES,
      page: 1,
      pageSize: 12,
    });

    expect(page.nodes).toEqual([]);
    expect(page.pageInfo.totalCount).toBe(0);
    expect(prisma.blogPost.findMany).not.toHaveBeenCalled();
  });

  it('counts posts per category over the same posts the list shows', async () => {
    await service.getPosts({ language: Language.EN, page: 1, pageSize: 12 });
    const counts = await service.getPostCountsByCategory(Language.EN);

    const { by, where } = prisma.blogPost.groupBy.mock.calls[0][0];
    expect(by).toEqual(['blogCategoryId']);
    expect(where).toEqual(prisma.blogPost.findMany.mock.calls[0][0].where);
    expect(counts).toEqual([
      { blogCategoryId: 1, count: 2 },
      { blogCategoryId: 3, count: 1 },
    ]);
  });
});
