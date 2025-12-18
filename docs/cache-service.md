# Cache Service Documentation

## Overview

The `CacheService` is an in-memory caching utility that provides a simple key-value store with automatic expiration. It's used throughout the application to improve performance by caching frequently accessed data.

## Location

```
src/common/services/cache.service.ts
```

## How It Works

The service maintains an internal `Map` that stores cache entries with expiration timestamps. Each entry contains:

- **data**: The cached value
- **expiresAt**: Unix timestamp indicating when the entry expires

## Methods

### `get<T>(key: string): T | null`

Retrieves cached data for a given key.

**Parameters:**

- `key`: The cache key to lookup

**Returns:**

- The cached data if found and not expired
- `null` if not found or expired

**Behavior:**

- Automatically removes expired entries when accessed
- Type-safe with generic return type

**Example:**

```typescript
const categories = this.cache.get<Category[]>('community:categories');
if (categories) {
  return categories;
}
```

### `set<T>(key: string, data: T, ttlSeconds: number = 60): void`

Stores data in the cache with an expiration time.

**Parameters:**

- `key`: The cache key
- `data`: The data to cache
- `ttlSeconds`: Time to live in seconds (default: 60)

**Example:**

```typescript
this.cache.set('community:categories', categories, 300); // 5 minutes
```

### `getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds: number = 60): Promise<T>`

Implements the cache-aside pattern. Checks cache first, and if not found, executes the provided function and caches the result.

**Parameters:**

- `key`: The cache key
- `fetchFn`: Async function to execute on cache miss
- `ttlSeconds`: Time to live in seconds (default: 60)

**Returns:**

- Cached data if available
- Result of `fetchFn` if cache miss (which is then cached)

**Example:**

```typescript
return await this.cache.getOrSet(
  'community:catalog',
  async () => {
    return await this.prisma.communityCategory.findMany({
      include: { subcategories: true },
    });
  },
  300, // Cache for 5 minutes
);
```

### `delete(key: string): void`

Removes a specific cache entry.

**Parameters:**

- `key`: The cache key to delete

**Example:**

```typescript
this.cache.delete('community:post:123');
```

### `invalidateByPattern(pattern: string): void`

Removes all cache entries whose keys start with the given pattern.

**Parameters:**

- `pattern`: The key prefix to match

**Example:**

```typescript
// Invalidate all community-related caches
this.cache.invalidateByPattern('community:');

// Invalidate all caches for a specific post
this.cache.invalidateByPattern('community:post:123');
```

### `clear(): void`

Removes all entries from the cache.

**Example:**

```typescript
this.cache.clear();
```

## Usage in Services

### Setup

Import and inject the `CacheService` in your module:

```typescript
import { CacheService } from '../common/services';

@Module({
  providers: [YourService, CacheService],
})
export class YourModule {}
```

Inject it in your service constructor:

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly cache: CacheService,
) {}
```

### Common Patterns

#### 1. Simple Cache-Aside Pattern

```typescript
async getCategories() {
  return await this.cache.getOrSet(
    'categories',
    async () => await this.prisma.category.findMany(),
    600 // 10 minutes
  );
}
```

#### 2. Cache with Manual Invalidation

```typescript
async createPost(data: CreatePostInput) {
  const post = await this.prisma.post.create({ data });

  // Invalidate related caches
  this.cache.invalidateByPattern('posts:');

  return post;
}

async updatePost(id: string, data: UpdatePostInput) {
  const post = await this.prisma.post.update({
    where: { id },
    data,
  });

  // Invalidate specific post cache and list caches
  this.cache.delete(`post:${id}`);
  this.cache.invalidateByPattern('posts:');

  return post;
}
```

#### 3. Parameterized Cache Keys

```typescript
async getPostById(id: string) {
  return await this.cache.getOrSet(
    `post:${id}`,
    async () => await this.prisma.post.findUnique({ where: { id } }),
    300
  );
}

async getPostsByCategory(categoryId: string, page: number) {
  return await this.cache.getOrSet(
    `posts:category:${categoryId}:page:${page}`,
    async () => {
      return await this.prisma.post.findMany({
        where: { categoryId },
        skip: (page - 1) * 10,
        take: 10,
      });
    },
    180 // 3 minutes
  );
}
```

## Cache Key Naming Conventions

Use descriptive, hierarchical keys to make invalidation easier:

```
[resource]:[identifier]:[sub-resource]:[params]
```

Examples:

- `community:catalog` - Community catalog data
- `community:post:123` - Specific community post
- `community:posts:category:456:page:1` - Paginated posts for a category
- `blog:post:789:reactions` - Reactions for a blog post

## TTL Guidelines

Choose appropriate TTL values based on data volatility:

- **High volatility** (user activity, real-time data): 30-60 seconds
- **Medium volatility** (posts, comments): 3-10 minutes
- **Low volatility** (categories, static content): 10-60 minutes
- **Very stable** (configuration, metadata): 1+ hours

## Limitations

- **In-memory only**: Cache is lost on application restart
- **No persistence**: Not suitable for critical data
- **Single instance**: Not shared across multiple server instances
- **No size limits**: Unbounded cache growth (manual management required)

## Best Practices

1. **Always set appropriate TTL values** to prevent stale data
2. **Invalidate on mutations** when data is created, updated, or deleted
3. **Use pattern-based invalidation** for related data
4. **Namespace your keys** to avoid collisions and enable pattern matching
5. **Monitor cache size** in production environments
6. **Use getOrSet** for simpler code and atomic cache-aside pattern
7. **Don't cache sensitive data** unless absolutely necessary

## Future Improvements

Consider these enhancements for production use:

- Integration with Redis for distributed caching
- Cache metrics and monitoring
- Configurable size limits with LRU eviction
- Cache warming strategies
- Compression for large values
