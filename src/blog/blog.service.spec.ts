import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BlogService', () => {
  let service: BlogService;
  let prisma: PrismaService;

  const mockPrismaService = {
    blogCategory: {
      findMany: jest.fn(),
    },
    blogPost: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    blogReaction: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBlogCatalog', () => {
    it('should return blog categories', async () => {
      const mockCategories = [
        { id: 1, name: 'Category 1' },
        { id: 2, name: 'Category 2' },
      ];
      mockPrismaService.blogCategory.findMany.mockResolvedValue(mockCategories);

      const result = await service.getBlogCatalog();

      expect(result).toEqual(mockCategories);
      expect(prisma.blogCategory.findMany).toHaveBeenCalled();
    });
  });

  describe('getBlog', () => {
    it('should return a blog post by id', async () => {
      const mockBlog = {
        id: 1,
        title: 'Test Blog',
        content: 'Test content',
      };
      mockPrismaService.blogPost.findFirst.mockResolvedValue(mockBlog);

      const result = await service.getBlog(1);

      expect(result).toEqual(mockBlog);
      expect(prisma.blogPost.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('likeBlog', () => {
    it('should create a like reaction', async () => {
      mockPrismaService.blogReaction.findFirst.mockResolvedValue(null);
      mockPrismaService.blogReaction.create.mockResolvedValue({
        id: 1,
        blogPostId: 1,
        sellerId: 'seller-1',
        reaction: 'LIKE',
      });

      const result = await service.likeBlog(1, 'seller-1');

      expect(result).toBe(true);
      expect(prisma.blogReaction.create).toHaveBeenCalled();
    });
  });
});
