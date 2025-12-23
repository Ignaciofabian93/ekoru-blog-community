# Ekoru Blog & Community Subgraph API Reference

This document provides a comprehensive guide to all available queries and mutations in the Blog & Community subgraph, along with examples of how to use them in web applications.

---

## Table of Contents

1. [Blog Queries](#blog-queries)
2. [Blog Mutations](#blog-mutations)
3. [Community Queries](#community-queries)
4. [Community Mutations](#community-mutations)
5. [Web App Integration Examples](#web-app-integration-examples)

---

## Blog Queries

### 1. `blogCatalog`

**Description:** Fetches the complete blog catalog with categories and their associated posts.

**Arguments:** None

**Returns:** `BlogCategory[]`

**Usage:**

```graphql
query GetBlogCatalog {
  blogCatalog {
    id
    name
    description
    blogType
    posts {
      id
      title
      content
      authorId
    }
  }
}
```

**Web App Example (Apollo Client):**

```typescript
import { gql, useQuery } from '@apollo/client';

const GET_BLOG_CATALOG = gql`
  query GetBlogCatalog {
    blogCatalog {
      id
      name
      description
      blogType
      posts {
        id
        title
        content
        authorId
      }
    }
  }
`;

function BlogCatalog() {
  const { loading, error, data } = useQuery(GET_BLOG_CATALOG);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      {data.blogCatalog.map(category => (
        <div key={category.id}>
          <h2>{category.name}</h2>
          <p>{category.description}</p>
          {category.posts.map(post => (
            <article key={post.id}>{post.title}</article>
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

### 2. `blogCategories`

**Description:** Fetches all blog categories without posts.

**Arguments:** None

**Returns:** `BlogCategory[]`

**Usage:**

```graphql
query GetBlogCategories {
  blogCategories {
    id
    name
    description
    blogType
  }
}
```

**Web App Example (Fetch API):**

```typescript
async function fetchBlogCategories() {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query GetBlogCategories {
          blogCategories {
            id
            name
            description
            blogType
          }
        }
      `,
    }),
  });

  const { data } = await response.json();
  return data.blogCategories;
}
```

---

### 3. `blogs`

**Description:** Fetches paginated blog posts.

**Arguments:**

- `input` (PaginationInput, optional):
  - `page` (Int, default: 1): Page number
  - `pageSize` (Int, default: 10): Number of items per page

**Returns:** `BlogPostsConnection`

**Usage:**

```graphql
query GetBlogs($page: Int, $pageSize: Int) {
  blogs(input: { page: $page, pageSize: $pageSize }) {
    edges {
      id
      title
      content
      excerpt
      authorId
      category {
        id
        name
        blogType
      }
      featuredImage
      publishedAt
      likes
      dislikes
      views
    }
    pageInfo {
      currentPage
      pageSize
      totalPages
      totalItems
      hasNextPage
      hasPreviousPage
    }
  }
}
```

**Web App Example (Apollo Client with Variables):**

```typescript
const GET_BLOGS = gql`
  query GetBlogs($page: Int, $pageSize: Int) {
    blogs(input: { page: $page, pageSize: $pageSize }) {
      edges {
        id
        title
        content
        excerpt
        authorId
        featuredImage
        publishedAt
        likes
        dislikes
        views
      }
      pageInfo {
        currentPage
        pageSize
        totalPages
        totalItems
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

function BlogList() {
  const [page, setPage] = useState(1);
  const { loading, error, data } = useQuery(GET_BLOGS, {
    variables: { page, pageSize: 10 }
  });

  return (
    <div>
      {data?.blogs.edges.map(post => (
        <article key={post.id}>
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
          <span>Likes: {post.likes} | Dislikes: {post.dislikes}</span>
        </article>
      ))}
      <button
        disabled={!data?.blogs.pageInfo.hasPreviousPage}
        onClick={() => setPage(p => p - 1)}
      >
        Previous
      </button>
      <button
        disabled={!data?.blogs.pageInfo.hasNextPage}
        onClick={() => setPage(p => p + 1)}
      >
        Next
      </button>
    </div>
  );
}
```

---

### 4. `blog`

**Description:** Fetches a single blog post by ID.

**Arguments:**

- `id` (Int, required): The ID of the blog post

**Returns:** `BlogPost`

**Usage:**

```graphql
query GetBlog($id: Int!) {
  blog(id: $id) {
    id
    title
    content
    excerpt
    authorId
    author {
      id
    }
    category {
      id
      name
      blogType
    }
    featuredImage
    publishedAt
    likes
    dislikes
    views
  }
}
```

**Web App Example (React with Apollo):**

```typescript
const GET_BLOG = gql`
  query GetBlog($id: Int!) {
    blog(id: $id) {
      id
      title
      content
      excerpt
      authorId
      featuredImage
      publishedAt
      likes
      dislikes
      views
      category {
        id
        name
      }
    }
  }
`;

function BlogPost({ blogId }: { blogId: number }) {
  const { loading, error, data } = useQuery(GET_BLOG, {
    variables: { id: blogId }
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const { blog } = data;

  return (
    <article>
      <h1>{blog.title}</h1>
      {blog.featuredImage && <img src={blog.featuredImage} alt={blog.title} />}
      <div dangerouslySetInnerHTML={{ __html: blog.content }} />
      <footer>
        <span>Category: {blog.category.name}</span>
        <span>Likes: {blog.likes} | Dislikes: {blog.dislikes}</span>
        <span>Views: {blog.views}</span>
      </footer>
    </article>
  );
}
```

---

### 5. `blogsByCategory`

**Description:** Fetches paginated blog posts filtered by category.

**Arguments:**

- `category` (BlogType, required): The category type (RECYCLING, POLLUTION, SUSTAINABILITY, etc.)
- `input` (PaginationInput, optional): Pagination parameters

**Returns:** `BlogPostsConnection`

**Available Categories:**

- `RECYCLING`
- `POLLUTION`
- `SUSTAINABILITY`
- `CIRCULAR_ECONOMY`
- `USED_PRODUCTS`
- `REUSE`
- `ENVIRONMENT`
- `UPCYCLING`
- `RESPONSIBLE_CONSUMPTION`
- `ECO_TIPS`
- `ENVIRONMENTAL_IMPACT`
- `SUSTAINABLE_LIVING`
- `SECURITY`
- `OTHER`

**Usage:**

```graphql
query GetBlogsByCategory($category: BlogType!, $page: Int, $pageSize: Int) {
  blogsByCategory(
    category: $category
    input: { page: $page, pageSize: $pageSize }
  ) {
    edges {
      id
      title
      excerpt
      featuredImage
      publishedAt
      likes
    }
    pageInfo {
      currentPage
      totalPages
      hasNextPage
    }
  }
}
```

**Web App Example:**

```typescript
const GET_BLOGS_BY_CATEGORY = gql`
  query GetBlogsByCategory($category: BlogType!, $page: Int) {
    blogsByCategory(category: $category, input: { page: $page, pageSize: 12 }) {
      edges {
        id
        title
        excerpt
        featuredImage
        publishedAt
      }
      pageInfo {
        currentPage
        totalPages
        hasNextPage
      }
    }
  }
`;

function CategoryBlogs({ category }: { category: string }) {
  const [page, setPage] = useState(1);
  const { loading, data } = useQuery(GET_BLOGS_BY_CATEGORY, {
    variables: { category, page }
  });

  return (
    <div>
      <h2>Blogs about {category}</h2>
      <div className="blog-grid">
        {data?.blogsByCategory.edges.map(post => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
```

---

### 6. `blogsByAuthor`

**Description:** Fetches paginated blog posts by a specific author.

**Arguments:**

- `authorId` (ID, required): The author's ID
- `input` (PaginationInput, optional): Pagination parameters

**Returns:** `BlogPostsConnection`

**Usage:**

```graphql
query GetBlogsByAuthor($authorId: ID!, $page: Int) {
  blogsByAuthor(authorId: $authorId, input: { page: $page, pageSize: 10 }) {
    edges {
      id
      title
      excerpt
      featuredImage
      publishedAt
      likes
      dislikes
    }
    pageInfo {
      currentPage
      totalPages
      hasNextPage
    }
  }
}
```

**Web App Example:**

```typescript
const GET_BLOGS_BY_AUTHOR = gql`
  query GetBlogsByAuthor($authorId: ID!) {
    blogsByAuthor(authorId: $authorId, input: { page: 1, pageSize: 20 }) {
      edges {
        id
        title
        excerpt
        publishedAt
      }
      pageInfo {
        totalItems
      }
    }
  }
`;

function AuthorProfile({ authorId }: { authorId: string }) {
  const { data } = useQuery(GET_BLOGS_BY_AUTHOR, {
    variables: { authorId }
  });

  return (
    <div>
      <h2>Author's Blog Posts ({data?.blogsByAuthor.pageInfo.totalItems})</h2>
      <ul>
        {data?.blogsByAuthor.edges.map(post => (
          <li key={post.id}>
            <Link to={`/blog/${post.id}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Blog Mutations

### 1. `likeBlog`

**Description:** Adds a like to a blog post. Requires authentication (seller context).

**Arguments:**

- `id` (Int, required): The blog post ID

**Returns:** `Boolean`

**Usage:**

```graphql
mutation LikeBlog($id: Int!) {
  likeBlog(id: $id)
}
```

**Web App Example:**

```typescript
const LIKE_BLOG = gql`
  mutation LikeBlog($id: Int!) {
    likeBlog(id: $id)
  }
`;

function LikeButton({ blogId }: { blogId: number }) {
  const [likeBlog, { loading }] = useMutation(LIKE_BLOG, {
    variables: { id: blogId },
    // Refetch the blog to update likes count
    refetchQueries: [{ query: GET_BLOG, variables: { id: blogId } }]
  });

  return (
    <button onClick={() => likeBlog()} disabled={loading}>
      👍 Like
    </button>
  );
}
```

---

### 2. `dislikeBlog`

**Description:** Adds a dislike to a blog post. Requires authentication (seller context).

**Arguments:**

- `id` (Int, required): The blog post ID

**Returns:** `Boolean`

**Usage:**

```graphql
mutation DislikeBlog($id: Int!) {
  dislikeBlog(id: $id)
}
```

**Web App Example:**

```typescript
const DISLIKE_BLOG = gql`
  mutation DislikeBlog($id: Int!) {
    dislikeBlog(id: $id)
  }
`;

function DislikeButton({ blogId }: { blogId: number }) {
  const [dislikeBlog] = useMutation(DISLIKE_BLOG, {
    variables: { id: blogId },
    refetchQueries: [{ query: GET_BLOG, variables: { id: blogId } }]
  });

  return (
    <button onClick={() => dislikeBlog()}>
      👎 Dislike
    </button>
  );
}
```

---

## Community Queries

### 1. `communityCatalog`

**Description:** Fetches the complete community catalog with categories, subcategories, and posts.

**Arguments:** None

**Returns:** `CommunityCategory[]`

**Usage:**

```graphql
query GetCommunityCatalog {
  communityCatalog {
    id
    name
    description
    icon
    subcategories {
      id
      name
      description
    }
    posts {
      id
      title
      content
      authorId
      createdAt
      likes
    }
  }
}
```

**Web App Example:**

```typescript
const GET_COMMUNITY_CATALOG = gql`
  query GetCommunityCatalog {
    communityCatalog {
      id
      name
      description
      icon
      subcategories {
        id
        name
        description
      }
    }
  }
`;

function CommunityNavigation() {
  const { data } = useQuery(GET_COMMUNITY_CATALOG);

  return (
    <nav>
      {data?.communityCatalog.map(category => (
        <div key={category.id}>
          <h3>{category.name}</h3>
          <ul>
            {category.subcategories.map(sub => (
              <li key={sub.id}>{sub.name}</li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
```

---

### 2. `communityCategories`

**Description:** Fetches all community categories without nested data.

**Arguments:** None

**Returns:** `CommunityCategory[]`

**Usage:**

```graphql
query GetCommunityCategories {
  communityCategories {
    id
    name
    description
    icon
  }
}
```

---

### 3. `communityPosts`

**Description:** Fetches paginated community posts.

**Arguments:**

- `input` (PaginationInput, optional): Pagination parameters

**Returns:** `CommunityPostsConnection`

**Usage:**

```graphql
query GetCommunityPosts($page: Int, $pageSize: Int) {
  communityPosts(input: { page: $page, pageSize: $pageSize }) {
    edges {
      id
      title
      content
      authorId
      author {
        id
      }
      images
      likes
      commentsCount
      createdAt
      updatedAt
    }
    pageInfo {
      currentPage
      pageSize
      totalPages
      totalItems
      hasNextPage
      hasPreviousPage
    }
  }
}
```

**Web App Example:**

```typescript
const GET_COMMUNITY_POSTS = gql`
  query GetCommunityPosts($page: Int) {
    communityPosts(input: { page: $page, pageSize: 15 }) {
      edges {
        id
        title
        content
        authorId
        images
        likes
        commentsCount
        createdAt
      }
      pageInfo {
        currentPage
        totalPages
        hasNextPage
      }
    }
  }
`;

function CommunityFeed() {
  const [page, setPage] = useState(1);
  const { loading, data } = useQuery(GET_COMMUNITY_POSTS, {
    variables: { page }
  });

  return (
    <div className="community-feed">
      {data?.communityPosts.edges.map(post => (
        <div key={post.id} className="post-card">
          <h3>{post.title}</h3>
          <p>{post.content.substring(0, 150)}...</p>
          {post.images && post.images.length > 0 && (
            <img src={post.images[0]} alt={post.title} />
          )}
          <div className="post-meta">
            <span>❤️ {post.likes}</span>
            <span>💬 {post.commentsCount}</span>
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
      {data?.communityPosts.pageInfo.hasNextPage && (
        <button onClick={() => setPage(p => p + 1)}>Load More</button>
      )}
    </div>
  );
}
```

---

### 4. `communityPost`

**Description:** Fetches a single community post by ID.

**Arguments:**

- `id` (Int, required): The post ID

**Returns:** `CommunityPost`

**Usage:**

```graphql
query GetCommunityPost($id: Int!) {
  communityPost(id: $id) {
    id
    title
    content
    authorId
    author {
      id
    }
    images
    likes
    commentsCount
    createdAt
    updatedAt
  }
}
```

**Web App Example:**

```typescript
const GET_COMMUNITY_POST = gql`
  query GetCommunityPost($id: Int!) {
    communityPost(id: $id) {
      id
      title
      content
      authorId
      images
      likes
      commentsCount
      createdAt
      updatedAt
    }
  }
`;

function CommunityPostDetail({ postId }: { postId: number }) {
  const { loading, data } = useQuery(GET_COMMUNITY_POST, {
    variables: { id: postId }
  });

  if (loading) return <div>Loading...</div>;

  const post = data.communityPost;

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      {post.images?.map((img, i) => (
        <img key={i} src={img} alt={`${post.title} - ${i}`} />
      ))}
      <div className="post-stats">
        <span>❤️ {post.likes} likes</span>
        <span>💬 {post.commentsCount} comments</span>
        <time>{new Date(post.createdAt).toLocaleString()}</time>
      </div>
    </article>
  );
}
```

---

### 5. `communityPostsByAuthor`

**Description:** Fetches paginated community posts by a specific author.

**Arguments:**

- `authorId` (ID, required): The author's ID
- `input` (PaginationInput, optional): Pagination parameters

**Returns:** `CommunityPostsConnection`

**Usage:**

```graphql
query GetCommunityPostsByAuthor($authorId: ID!, $page: Int) {
  communityPostsByAuthor(
    authorId: $authorId
    input: { page: $page, pageSize: 10 }
  ) {
    edges {
      id
      title
      content
      images
      likes
      commentsCount
      createdAt
    }
    pageInfo {
      totalItems
      currentPage
      hasNextPage
    }
  }
}
```

**Web App Example:**

```typescript
const GET_USER_POSTS = gql`
  query GetCommunityPostsByAuthor($authorId: ID!) {
    communityPostsByAuthor(authorId: $authorId, input: { page: 1, pageSize: 50 }) {
      edges {
        id
        title
        likes
        commentsCount
        createdAt
      }
      pageInfo {
        totalItems
      }
    }
  }
`;

function UserPosts({ userId }: { userId: string }) {
  const { data } = useQuery(GET_USER_POSTS, {
    variables: { authorId: userId }
  });

  return (
    <div>
      <h2>My Posts ({data?.communityPostsByAuthor.pageInfo.totalItems})</h2>
      <ul>
        {data?.communityPostsByAuthor.edges.map(post => (
          <li key={post.id}>
            <Link to={`/community/post/${post.id}`}>{post.title}</Link>
            <span>❤️ {post.likes} | 💬 {post.commentsCount}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

### 6. `communityComments`

**Description:** Fetches paginated comments for a specific community post.

**Arguments:**

- `postId` (Int, required): The post ID
- `input` (PaginationInput, optional): Pagination parameters

**Returns:** `CommunityCommentsConnection`

**Usage:**

```graphql
query GetCommunityComments($postId: Int!, $page: Int) {
  communityComments(postId: $postId, input: { page: $page, pageSize: 20 }) {
    edges {
      id
      content
      sellerId
      seller {
        id
      }
      createdAt
      updatedAt
    }
    pageInfo {
      currentPage
      totalPages
      totalItems
      hasNextPage
    }
  }
}
```

**Web App Example:**

```typescript
const GET_COMMENTS = gql`
  query GetCommunityComments($postId: Int!, $page: Int) {
    communityComments(postId: $postId, input: { page: $page, pageSize: 20 }) {
      edges {
        id
        content
        sellerId
        createdAt
      }
      pageInfo {
        totalItems
        hasNextPage
      }
    }
  }
`;

function CommentSection({ postId }: { postId: number }) {
  const [page, setPage] = useState(1);
  const { data } = useQuery(GET_COMMENTS, {
    variables: { postId, page }
  });

  return (
    <div className="comments">
      <h3>Comments ({data?.communityComments.pageInfo.totalItems})</h3>
      {data?.communityComments.edges.map(comment => (
        <div key={comment.id} className="comment">
          <p>{comment.content}</p>
          <small>{new Date(comment.createdAt).toLocaleString()}</small>
        </div>
      ))}
      {data?.communityComments.pageInfo.hasNextPage && (
        <button onClick={() => setPage(p => p + 1)}>Load More Comments</button>
      )}
    </div>
  );
}
```

---

## Community Mutations

### 1. `createCommunityPost`

**Description:** Creates a new community post. Requires authentication (seller context).

**Arguments:**

- `input` (CreateCommunityPostInput, required):
  - `title` (String, required): Post title
  - `content` (String, required): Post content
  - `images` ([String], optional): Array of image URLs

**Returns:** `CommunityPost`

**Usage:**

```graphql
mutation CreateCommunityPost($input: CreateCommunityPostInput!) {
  createCommunityPost(input: $input) {
    id
    title
    content
    images
    authorId
    createdAt
  }
}
```

**Web App Example:**

```typescript
const CREATE_POST = gql`
  mutation CreateCommunityPost($input: CreateCommunityPostInput!) {
    createCommunityPost(input: $input) {
      id
      title
      content
      images
      createdAt
    }
  }
`;

function CreatePostForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const [createPost, { loading }] = useMutation(CREATE_POST, {
    refetchQueries: [{ query: GET_COMMUNITY_POSTS }],
    onCompleted: (data) => {
      console.log('Post created:', data.createCommunityPost);
      // Reset form or redirect
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPost({
      variables: {
        input: { title, content, images: images.length > 0 ? images : undefined }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title"
        required
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Posting...' : 'Create Post'}
      </button>
    </form>
  );
}
```

---

### 2. `updateCommunityPost`

**Description:** Updates an existing community post.

**Arguments:**

- `input` (UpdateCommunityPostInput, required):
  - `id` (ID, required): Post ID
  - `title` (String, optional): New title
  - `content` (String, optional): New content
  - `images` ([String], optional): New array of image URLs

**Returns:** `CommunityPost`

**Usage:**

```graphql
mutation UpdateCommunityPost($input: UpdateCommunityPostInput!) {
  updateCommunityPost(input: $input) {
    id
    title
    content
    images
    updatedAt
  }
}
```

**Web App Example:**

```typescript
const UPDATE_POST = gql`
  mutation UpdateCommunityPost($input: UpdateCommunityPostInput!) {
    updateCommunityPost(input: $input) {
      id
      title
      content
      images
      updatedAt
    }
  }
`;

function EditPostForm({ post }: { post: CommunityPost }) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);

  const [updatePost, { loading }] = useMutation(UPDATE_POST, {
    onCompleted: () => {
      alert('Post updated successfully!');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePost({
      variables: {
        input: { id: post.id, title, content }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      <button type="submit" disabled={loading}>Save Changes</button>
    </form>
  );
}
```

---

### 3. `deleteCommunityPost`

**Description:** Deletes a community post by ID.

**Arguments:**

- `id` (Int, required): Post ID to delete

**Returns:** `Boolean`

**Usage:**

```graphql
mutation DeleteCommunityPost($id: Int!) {
  deleteCommunityPost(id: $id)
}
```

**Web App Example:**

```typescript
const DELETE_POST = gql`
  mutation DeleteCommunityPost($id: Int!) {
    deleteCommunityPost(id: $id)
  }
`;

function DeletePostButton({ postId }: { postId: number }) {
  const [deletePost] = useMutation(DELETE_POST, {
    variables: { id: postId },
    refetchQueries: [{ query: GET_COMMUNITY_POSTS }],
    onCompleted: () => {
      alert('Post deleted successfully');
    }
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this post?')) {
      deletePost();
    }
  };

  return (
    <button onClick={handleDelete} className="btn-danger">
      Delete Post
    </button>
  );
}
```

---

### 4. `likeCommunityPost`

**Description:** Adds a like to a community post.

**Arguments:**

- `id` (Int, required): Post ID

**Returns:** `CommunityPost`

**Usage:**

```graphql
mutation LikeCommunityPost($id: Int!) {
  likeCommunityPost(id: $id) {
    id
    likes
  }
}
```

**Web App Example:**

```typescript
const LIKE_POST = gql`
  mutation LikeCommunityPost($id: Int!) {
    likeCommunityPost(id: $id) {
      id
      likes
    }
  }
`;

function LikePostButton({ postId }: { postId: number }) {
  const [likePost, { loading }] = useMutation(LIKE_POST, {
    variables: { id: postId },
    // Optimistic response for instant UI update
    optimisticResponse: {
      likeCommunityPost: {
        __typename: 'CommunityPost',
        id: postId,
        likes: -1 // Will be replaced with actual value
      }
    }
  });

  return (
    <button onClick={() => likePost()} disabled={loading}>
      ❤️ Like
    </button>
  );
}
```

---

### 5. `createCommunityComment`

**Description:** Creates a new comment on a community post. Requires authentication (seller context).

**Arguments:**

- `input` (CreateCommunityCommentInput, required):
  - `postId` (Int, required): The post ID to comment on
  - `content` (String, required): Comment content

**Returns:** `CommunityComment`

**Usage:**

```graphql
mutation CreateCommunityComment($input: CreateCommunityCommentInput!) {
  createCommunityComment(input: $input) {
    id
    content
    sellerId
    createdAt
  }
}
```

**Web App Example:**

```typescript
const CREATE_COMMENT = gql`
  mutation CreateCommunityComment($input: CreateCommunityCommentInput!) {
    createCommunityComment(input: $input) {
      id
      content
      sellerId
      createdAt
    }
  }
`;

function CommentForm({ postId }: { postId: number }) {
  const [content, setContent] = useState('');

  const [createComment, { loading }] = useMutation(CREATE_COMMENT, {
    refetchQueries: [
      { query: GET_COMMENTS, variables: { postId } },
      { query: GET_COMMUNITY_POST, variables: { id: postId } }
    ],
    onCompleted: () => {
      setContent(''); // Clear input
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      createComment({
        variables: {
          input: { postId, content }
        }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Posting...' : 'Post Comment'}
      </button>
    </form>
  );
}
```

---

### 6. `updateCommunityComment`

**Description:** Updates an existing comment.

**Arguments:**

- `input` (UpdateCommunityCommentInput, required):
  - `id` (ID, required): Comment ID
  - `content` (String, required): New comment content

**Returns:** `CommunityComment`

**Usage:**

```graphql
mutation UpdateCommunityComment($input: UpdateCommunityCommentInput!) {
  updateCommunityComment(input: $input) {
    id
    content
    updatedAt
  }
}
```

**Web App Example:**

```typescript
const UPDATE_COMMENT = gql`
  mutation UpdateCommunityComment($input: UpdateCommunityCommentInput!) {
    updateCommunityComment(input: $input) {
      id
      content
      updatedAt
    }
  }
`;

function EditComment({ comment }: { comment: CommunityComment }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(comment.content);

  const [updateComment] = useMutation(UPDATE_COMMENT, {
    onCompleted: () => {
      setIsEditing(false);
    }
  });

  const handleSave = () => {
    updateComment({
      variables: {
        input: { id: comment.id, content }
      }
    });
  };

  if (isEditing) {
    return (
      <div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} />
        <button onClick={handleSave}>Save</button>
        <button onClick={() => setIsEditing(false)}>Cancel</button>
      </div>
    );
  }

  return (
    <div>
      <p>{comment.content}</p>
      <button onClick={() => setIsEditing(true)}>Edit</button>
    </div>
  );
}
```

---

### 7. `deleteCommunityComment`

**Description:** Deletes a comment by ID.

**Arguments:**

- `id` (Int, required): Comment ID to delete

**Returns:** `Boolean`

**Usage:**

```graphql
mutation DeleteCommunityComment($id: Int!) {
  deleteCommunityComment(id: $id)
}
```

**Web App Example:**

```typescript
const DELETE_COMMENT = gql`
  mutation DeleteCommunityComment($id: Int!) {
    deleteCommunityComment(id: $id)
  }
`;

function DeleteCommentButton({ commentId, postId }: { commentId: number; postId: number }) {
  const [deleteComment] = useMutation(DELETE_COMMENT, {
    variables: { id: commentId },
    refetchQueries: [{ query: GET_COMMENTS, variables: { postId } }]
  });

  return (
    <button onClick={() => deleteComment()}>Delete</button>
  );
}
```

---

## Web App Integration Examples

### Complete React Component with Apollo Client

```typescript
import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';

// Queries
const GET_BLOG_POSTS = gql`
  query GetBlogPosts($page: Int!) {
    blogs(input: { page: $page, pageSize: 10 }) {
      edges {
        id
        title
        excerpt
        featuredImage
        likes
        dislikes
        views
      }
      pageInfo {
        currentPage
        totalPages
        hasNextPage
      }
    }
  }
`;

const GET_COMMUNITY_POSTS = gql`
  query GetCommunityPosts($page: Int!) {
    communityPosts(input: { page: $page, pageSize: 10 }) {
      edges {
        id
        title
        content
        likes
        commentsCount
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

// Mutations
const CREATE_POST = gql`
  mutation CreatePost($input: CreateCommunityPostInput!) {
    createCommunityPost(input: $input) {
      id
      title
      content
    }
  }
`;

const LIKE_BLOG = gql`
  mutation LikeBlog($id: Int!) {
    likeBlog(id: $id)
  }
`;

// Main Component
function App() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'blog' | 'community'>('blog');

  const { loading, data, refetch } = useQuery(
    activeTab === 'blog' ? GET_BLOG_POSTS : GET_COMMUNITY_POSTS,
    { variables: { page } }
  );

  const [createPost] = useMutation(CREATE_POST, {
    onCompleted: () => refetch()
  });

  const [likeBlog] = useMutation(LIKE_BLOG);

  if (loading) return <div>Loading...</div>;

  const posts = activeTab === 'blog' ? data?.blogs?.edges : data?.communityPosts?.edges;

  return (
    <div>
      <nav>
        <button onClick={() => setActiveTab('blog')}>Blog</button>
        <button onClick={() => setActiveTab('community')}>Community</button>
      </nav>

      <div className="posts">
        {posts?.map((post: any) => (
          <article key={post.id}>
            <h2>{post.title}</h2>
            {activeTab === 'blog' && (
              <>
                <p>{post.excerpt}</p>
                <button onClick={() => likeBlog({ variables: { id: post.id } })}>
                  Like ({post.likes})
                </button>
              </>
            )}
            {activeTab === 'community' && (
              <p>💬 {post.commentsCount} comments | ❤️ {post.likes} likes</p>
            )}
          </article>
        ))}
      </div>

      {data?.blogs?.pageInfo?.hasNextPage && (
        <button onClick={() => setPage(p => p + 1)}>Load More</button>
      )}
    </div>
  );
}

export default App;
```

---

### Using with Next.js App Router

```typescript
// app/blog/page.tsx
import { gql } from '@apollo/client';
import { getClient } from '@/lib/apollo-client';

const GET_BLOGS = gql`
  query GetBlogs {
    blogs(input: { page: 1, pageSize: 20 }) {
      edges {
        id
        title
        excerpt
        featuredImage
        publishedAt
      }
    }
  }
`;

export default async function BlogPage() {
  const client = getClient();
  const { data } = await client.query({ query: GET_BLOGS });

  return (
    <div>
      <h1>Blog Posts</h1>
      {data.blogs.edges.map((post: any) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
```

---

### Using with Vanilla JavaScript (Fetch API)

```javascript
// Fetch blog posts
async function fetchBlogPosts(page = 1) {
  const response = await fetch('http://your-api-url/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add authentication headers if needed
      // 'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query: `
        query GetBlogs($page: Int!) {
          blogs(input: { page: $page, pageSize: 10 }) {
            edges {
              id
              title
              excerpt
              featuredImage
            }
            pageInfo {
              hasNextPage
              currentPage
            }
          }
        }
      `,
      variables: { page },
    }),
  });

  const { data, errors } = await response.json();

  if (errors) {
    console.error('GraphQL Errors:', errors);
    throw new Error(errors[0].message);
  }

  return data.blogs;
}

// Create a community post
async function createCommunityPost(title, content, images = []) {
  const response = await fetch('http://your-api-url/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({
      query: `
        mutation CreatePost($input: CreateCommunityPostInput!) {
          createCommunityPost(input: $input) {
            id
            title
            content
            createdAt
          }
        }
      `,
      variables: {
        input: {
          title,
          content,
          images: images.length > 0 ? images : undefined,
        },
      },
    }),
  });

  const { data, errors } = await response.json();

  if (errors) {
    throw new Error(errors[0].message);
  }

  return data.createCommunityPost;
}

// Usage
fetchBlogPosts(1).then((blogs) => {
  console.log('Fetched blogs:', blogs);
});

createCommunityPost('My First Post', 'This is the content of my post', [
  'https://example.com/image.jpg',
]).then((post) => {
  console.log('Created post:', post);
});
```

---

### Authentication Notes

Several mutations require authentication (indicated by the `@CurrentSeller()` decorator):

- `likeBlog`
- `dislikeBlog`
- `createCommunityPost`
- `createCommunityComment`

Make sure to include authentication headers (e.g., JWT token) in your requests:

```typescript
// Apollo Client Setup
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: 'http://your-api-url/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

---

### Error Handling Best Practices

```typescript
function BlogComponent() {
  const { loading, error, data } = useQuery(GET_BLOGS);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    // Handle different error types
    if (error.networkError) {
      return <div>Network error. Please check your connection.</div>;
    }
    if (error.graphQLErrors) {
      return (
        <div>
          {error.graphQLErrors.map((err, i) => (
            <p key={i}>Error: {err.message}</p>
          ))}
        </div>
      );
    }
    return <div>An unexpected error occurred.</div>;
  }

  return (
    <div>
      {data.blogs.edges.map(blog => (
        <BlogCard key={blog.id} blog={blog} />
      ))}
    </div>
  );
}
```

---

### Pagination Strategies

**1. Load More (Infinite Scroll)**

```typescript
function InfiniteBlogList() {
  const { data, fetchMore } = useQuery(GET_BLOGS, {
    variables: { page: 1 }
  });

  const loadMore = () => {
    fetchMore({
      variables: { page: data.blogs.pageInfo.currentPage + 1 },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          blogs: {
            ...fetchMoreResult.blogs,
            edges: [...prev.blogs.edges, ...fetchMoreResult.blogs.edges]
          }
        };
      }
    });
  };

  return (
    <>
      {data?.blogs.edges.map(post => <BlogCard key={post.id} post={post} />)}
      {data?.blogs.pageInfo.hasNextPage && (
        <button onClick={loadMore}>Load More</button>
      )}
    </>
  );
}
```

**2. Page-Based Pagination**

```typescript
function PaginatedBlogList() {
  const [page, setPage] = useState(1);
  const { data } = useQuery(GET_BLOGS, { variables: { page } });

  return (
    <>
      {data?.blogs.edges.map(post => <BlogCard key={post.id} post={post} />)}
      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </button>
        <span>Page {page} of {data?.blogs.pageInfo.totalPages}</span>
        <button
          disabled={!data?.blogs.pageInfo.hasNextPage}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
    </>
  );
}
```

---

## Summary

This subgraph provides comprehensive APIs for:

**Blog Features:**

- Browse blog posts with pagination
- Filter by category or author
- View individual blog posts
- Like/dislike blog posts

**Community Features:**

- Browse community posts with pagination
- Create, update, and delete posts
- View posts by specific authors
- Like community posts
- Comment on posts
- Update and delete comments
- View comments with pagination

All queries support pagination through the `PaginationInput` type, and mutations return the created/updated objects for immediate UI updates.
