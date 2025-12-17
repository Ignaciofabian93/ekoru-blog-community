# Ekoru Blog & Community Subgraph

A NestJS GraphQL Federation subgraph providing blog and community features for the Ekoru platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Testing](#testing)
- [Database](#database)
- [Caching](#caching)
- [Docker](#docker)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Contributing](#contributing)

## 🎯 Overview

This subgraph handles all blog and community-related functionality for the Ekoru ecosystem, including:

- **Blog Posts**: Create, read, update, delete blog posts with categories
- **Blog Reactions**: Like/dislike functionality for blog posts
- **Community Posts**: User-generated community content
- **Community Comments**: Threaded discussions on community posts
- **Content Moderation**: Admin controls for content management

## 🛠 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) v11
- **GraphQL**: [Apollo Federation](https://www.apollographql.com/docs/federation/) v2
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/) v5
- **Language**: TypeScript v5
- **Runtime**: Node.js v22+
- **Caching**: In-memory caching with TTL
- **Testing**: Jest
- **Linting**: ESLint + Prettier

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: `>= 22.14.0`
- **npm**: `>= 10.0.0`
- **PostgreSQL**: `>= 14.0`
- **Docker** (optional, for containerized deployment)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ekoru-blog-community
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration (see [Environment Variables](#environment-variables)).

### 4. Set Up the Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db seed
```

### 5. Start the Development Server

```bash
npm run start:dev
```

The subgraph will be available at `http://localhost:9004/graphql`.

## 📁 Project Structure

```
ekoru-blog-community/
├── prisma/
│   └── schema.prisma           # Database schema
├── src/
│   ├── app.module.ts           # Root application module
│   ├── main.ts                 # Application entry point
│   ├── blog/                   # Blog feature module
│   │   ├── blog.module.ts
│   │   ├── blog.service.ts
│   │   ├── blog.resolver.ts
│   │   ├── dto/                # Data transfer objects
│   │   └── entities/           # GraphQL entities
│   ├── community/              # Community feature module
│   │   ├── community.module.ts
│   │   ├── community.service.ts
│   │   ├── community.resolver.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── common/                 # Shared utilities
│   │   ├── decorators/         # Custom decorators
│   │   ├── exceptions/         # Custom exceptions
│   │   ├── services/           # Shared services (cache)
│   │   └── utils/              # Utility functions
│   ├── config/                 # Configuration
│   │   └── configuration.ts
│   ├── graphql/                # GraphQL configuration
│   │   ├── enums/              # GraphQL enums
│   │   └── scalars/            # Custom scalars
│   ├── prisma/                 # Prisma module
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   └── types/                  # TypeScript type definitions
│       └── blog.types.ts
├── test/                       # E2E tests
├── .dockerignore
├── .env                        # Environment variables (not in git)
├── .env.example                # Environment template
├── Dockerfile                  # Production container
├── compose.prod.yml            # Production docker compose
├── compose.qa.yml              # QA docker compose
├── DOCKER_RESOURCES.md         # Docker resource guide
└── package.json
```

## 🔐 Environment Variables

Create a `.env` file with the following variables:

```bash
# Application
NODE_ENV=development
PORT=9004

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ekoru_blog_community?schema=public"

# Optional: For production
# DATABASE_POOL_SIZE=10
# DATABASE_TIMEOUT=5000
```

### Environment Files

- `.env` - Development (local)
- `.env.qa` - QA/Staging environment
- `.env.prod` - Production environment

## 💻 Development

### Available Scripts

```bash
# Development
npm run start:dev          # Start with hot-reload
npm run start:debug        # Start with debugger

# Building
npm run build              # Build for production

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run end-to-end tests

# Code Quality
npm run lint               # Lint and fix code
npm run format             # Format code with Prettier

# Database
npx prisma studio          # Open Prisma Studio (database GUI)
npx prisma migrate dev     # Create and apply migrations
npx prisma generate        # Generate Prisma Client
```

### GraphQL Playground

When running in development, access GraphQL Playground at:

```
http://localhost:9004/graphql
```

### Example Queries

**Get Blog Posts:**

```graphql
query GetBlogs {
  getBlogs(input: { page: 1, pageSize: 10 }) {
    edges {
      id
      title
      content
      type
      isPublished
      publishedAt
      createdAt
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      totalCount
    }
  }
}
```

**Create Blog Post:**

```graphql
mutation CreateBlogPost {
  createBlogPost(
    input: {
      title: "My First Blog Post"
      content: "This is the content..."
      categoryId: 1
      type: SUSTAINABILITY
    }
  ) {
    id
    title
    isPublished
  }
}
```

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

Unit tests are located alongside the source files with `.spec.ts` extension.

### E2E Tests

```bash
npm run test:e2e
```

E2E tests are in the `test/` directory.

### Test Coverage

```bash
npm run test:cov
```

Coverage reports are generated in the `coverage/` directory.

## 🗄 Database

### Prisma Schema

The database schema is defined in `prisma/schema.prisma`. It includes:

- **BlogPost**: Blog articles with metadata
- **BlogCategory**: Blog categorization
- **BlogReaction**: User reactions (likes/dislikes)
- **CommunityPost**: User community posts
- **CommunityComment**: Comments on community posts
- **Admin**: Platform and business administrators

### Migrations

```bash
# Create a new migration
npx prisma migrate dev --name description_of_changes

# Apply migrations in production
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Database GUI

```bash
# Open Prisma Studio
npx prisma studio
```

Access at `http://localhost:5555`

## ⚡ Caching

This subgraph implements in-memory caching to reduce database load:

### Cached Queries

- **Blog Categories** - 5 minutes TTL
- **Blog Categories with Posts** - 2 minutes TTL

### Cache Invalidation

Cache is automatically invalidated on:

- Blog post creation
- Blog post updates
- Blog post deletion
- Blog post publish/unpublish

### Cache Service

Located in `src/common/services/cache.service.ts`, provides:

```typescript
// Get or fetch and cache
await cache.getOrSet(key, fetchFn, ttlSeconds);

// Manual operations
cache.get(key);
cache.set(key, data, ttlSeconds);
cache.delete(key);
cache.invalidateByPattern(pattern);
```

For production scaling, consider migrating to Redis.

## 🐳 Docker

### Development

```bash
# Build image
docker build -t ekoru-blog-community:dev .

# Run container
docker run -p 9004:9004 --env-file .env ekoru-blog-community:dev
```

### Production

```bash
# Using docker compose
docker compose -f compose.prod.yml up -d

# View logs
docker logs ekoru-blog-community -f

# Check resources
docker stats ekoru-blog-community
```

### QA/Staging

```bash
docker compose -f compose.qa.yml up -d
```

### Resource Limits

- **Production**: 1 CPU / 512MB RAM
- **QA**: 0.75 CPU / 384MB RAM

See [DOCKER_RESOURCES.md](./DOCKER_RESOURCES.md) for detailed resource configuration.

## 📚 API Documentation

### GraphQL Schema

The schema is auto-generated from TypeScript decorators. Key types:

#### Blog

```graphql
type BlogPost {
  id: ID!
  title: String!
  content: String!
  type: BlogType!
  isPublished: Boolean!
  publishedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
  author: Admin
  likes: Int
  dislikes: Int
}

type BlogCategory {
  id: ID!
  name: String!
  icon: String
  description: String
  posts: [BlogPost!]!
}

enum BlogType {
  RECYCLING
  POLLUTION
  SUSTAINABILITY
  CIRCULAR_ECONOMY
  ECO_TIPS
  # ... more types
}
```

#### Community

```graphql
type CommunityPost {
  id: ID!
  title: String!
  content: String!
  authorId: String!
  categoryId: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type CommunityComment {
  id: ID!
  content: String!
  postId: Int!
  authorId: String!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### Federation

This subgraph extends the following types from other subgraphs:

```graphql
extend type Admin @key(fields: "id") {
  id: ID! @external
}

extend type Seller @key(fields: "id") {
  id: ID! @external
}
```

## 🏗 Architecture

### Module Structure

The application follows NestJS modular architecture:

```
AppModule
├── BlogModule
│   ├── BlogService (business logic)
│   ├── BlogResolver (GraphQL API)
│   └── CacheService (caching)
├── CommunityModule
│   ├── CommunityService
│   └── CommunityResolver
└── PrismaModule
    └── PrismaService (database)
```

### Design Patterns

- **Service Layer**: Business logic separation
- **Repository Pattern**: Database abstraction via Prisma
- **Decorator Pattern**: Custom GraphQL decorators
- **Cache-Aside Pattern**: Caching strategy
- **Federation Pattern**: GraphQL microservices

### Error Handling

Custom exceptions in `src/common/exceptions/`:

```typescript
throw new NotFoundError('Blog not found');
throw new BadRequestError('Invalid input');
throw new UnauthorizedError('Not authorized');
throw new InternalServerError('Server error');
```

### Authentication

Authentication is handled at the gateway level. This subgraph receives:

```typescript
@Context() context: {
  sellerId?: string;   // From x-seller-id header
  token?: string;      // From Authorization header
}
```

Use the `@CurrentSeller()` decorator to get the current user:

```typescript
@Mutation(() => BlogPost)
async createBlogPost(
  @Args('input') input: CreateBlogPostInput,
  @CurrentSeller() sellerId: string,
) {
  return this.blogService.createBlogPost(input, sellerId);
}
```

## 🤝 Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `npm run test`
4. Run linter: `npm run lint`
5. Commit with descriptive message
6. Push and create a pull request

### Code Style

- Follow existing code patterns
- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Write tests for new features

### Commit Messages

Follow conventional commits:

```
feat: add blog post search functionality
fix: resolve cache invalidation bug
docs: update API documentation
refactor: simplify blog service logic
test: add unit tests for reactions
```

## 📝 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Apollo Federation](https://www.apollographql.com/docs/federation/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Docker Resources Guide](./DOCKER_RESOURCES.md)

## 📧 Support

For questions or issues, contact:

- **Author**: Ignacio Rodríguez Rulas
- **Role**: EKORU CTO
- **Repository**: [GitHub Issues](repository-url/issues)

## 📄 License

UNLICENSED - Private/Proprietary

---

**Happy Coding! 🚀**
