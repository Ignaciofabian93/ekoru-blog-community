import { Test, TestingModule } from '@nestjs/testing';
import { CommunityService } from './community.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CommunityService', () => {
  let service: CommunityService;
  let prisma: PrismaService;

  const mockPrismaService = {
    communityCategory: {
      findMany: jest.fn(),
    },
    communityPost: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    communityComment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CommunityService>(CommunityService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCommunityCatalog', () => {
    it('should return community categories with subcategories', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Category 1',
          subcategories: [{ id: 1, name: 'Sub 1' }],
        },
      ];
      mockPrismaService.communityCategory.findMany.mockResolvedValue(
        mockCategories,
      );

      const result = await service.getCommunityCatalog();

      expect(result).toEqual(mockCategories);
      expect(prisma.communityCategory.findMany).toHaveBeenCalledWith({
        include: { subcategories: true },
      });
    });
  });

  describe('getCommunityPost', () => {
    it('should return a community post by id', async () => {
      const mockPost = {
        id: 1,
        title: 'Test Post',
        content: 'Test content',
        authorId: 'author-1',
      };
      mockPrismaService.communityPost.findFirst.mockResolvedValue(mockPost);

      const result = await service.getCommunityPost(1);

      expect(result).toEqual(mockPost);
    });
  });

  describe('createCommunityPost', () => {
    it('should create a community post', async () => {
      const input = {
        title: 'New Post',
        content: 'Post content',
        images: [],
      };
      const mockPost = {
        id: 1,
        ...input,
        authorId: 'author-1',
      };
      mockPrismaService.communityPost.create.mockResolvedValue(mockPost);

      const result = await service.createCommunityPost(input, 'author-1');

      expect(result).toEqual(mockPost);
      expect(prisma.communityPost.create).toHaveBeenCalled();
    });
  });

  describe('likeCommunityPost', () => {
    it('should increment likes on a post', async () => {
      const mockPost = {
        id: 1,
        likes: 1,
      };
      mockPrismaService.communityPost.update.mockResolvedValue(mockPost);

      const result = await service.likeCommunityPost(1);

      expect(result).toEqual(mockPost);
      expect(prisma.communityPost.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          likes: { increment: 1 },
          updatedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });
  });
});
