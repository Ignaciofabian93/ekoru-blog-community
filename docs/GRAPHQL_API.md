# ekoru-blog-community — GraphQL API Reference

> **Subgraph**: Blog & community — editorial blog posts with reactions, and community posts with comments.

---

## Headers

| Header | Required | Description |
|---|---|---|
| `Authorization` | Mutations (reactions, posts, comments) | `Bearer <jwt_token>` |
| `x-seller-id` | Authenticated mutations | Seller UUID from auth |

---

## Enums

```graphql
enum BlogType {
  RECYCLING
  POLLUTION
  SUSTAINABILITY
  CIRCULAR_ECONOMY
  USED_PRODUCTS
  REUSE
  ENVIRONMENT
  UPCYCLING
  RESPONSIBLE_CONSUMPTION
  ECO_TIPS
  ENVIRONMENTAL_IMPACT
  SUSTAINABLE_LIVING
  SECURITY
  OTHER
}

enum BlogReactionType {
  LIKE
  DISLIKE
}
```

---

## Fragments

```graphql
fragment BlogCategoryFields on BlogCategory {
  id
  name
  slug
}

fragment BlogPostFields on BlogPost {
  id
  title
  content
  authorId
  isPublished
  publishedAt
  likes
  dislikes
  type
  createdAt
  updatedAt
}

fragment CommunityCategoryFields on CommunityCategory {
  id
  name
  slug
  subcategories {
    id
    name
    slug
  }
}

fragment CommunityPostFields on CommunityPost {
  id
  title
  content
  images
  authorId
  likes
  comments
  createdAt
  updatedAt
}

fragment CommunityCommentFields on CommunityComment {
  id
  content
  sellerId
  communityPostId
  createdAt
  updatedAt
}

fragment PageInfoFields on PageInfo {
  totalCount
  totalPages
  currentPage
  pageSize
  hasNextPage
  hasPreviousPage
}
```

---

## Queries

### blogCatalog

Returns blog categories without posts — ideal for navigation menus.

```graphql
query BlogCatalog {
  blogCatalog {
    ...BlogCategoryFields
  }
}
```

---

### blogCategories

Returns blog categories with their associated posts.

```graphql
query BlogCategories {
  blogCategories {
    ...BlogCategoryFields
    posts {
      ...BlogPostFields
    }
  }
}
```

---

### blogs

Returns paginated published blog posts, ordered by published date descending.

```graphql
query GetBlogs($input: PaginationInput) {
  blogs(input: $input) {
    nodes {
      ...BlogPostFields
      author {
        id
      }
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{ "input": { "page": 1, "pageSize": 10 } }
```

---

### blog

Get a single blog post by ID.

```graphql
query GetBlog($id: Int!) {
  blog(id: $id) {
    ...BlogPostFields
    author {
      id
    }
  }
}
```

**Variables**
```json
{ "id": 42 }
```

---

### blogsByCategory

Returns paginated posts filtered by blog type/category.

```graphql
query GetBlogsByCategory($category: BlogType!, $input: PaginationInput) {
  blogsByCategory(category: $category, input: $input) {
    nodes {
      ...BlogPostFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{
  "category": "TIPS",
  "input": { "page": 1, "pageSize": 10 }
}
```

---

### blogsByAuthor

Returns paginated posts by a specific author (admin).

```graphql
query GetBlogsByAuthor($authorId: ID!, $input: PaginationInput) {
  blogsByAuthor(authorId: $authorId, input: $input) {
    nodes {
      ...BlogPostFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{
  "authorId": "admin-uuid-here",
  "input": { "page": 1, "pageSize": 10 }
}
```

---

### communityCatalog

Returns community categories with their sub-categories for navigation.

```graphql
query CommunityCatalog {
  communityCatalog {
    ...CommunityCategoryFields
  }
}
```

---

### communityCategories

Returns all community categories.

```graphql
query CommunityCategories {
  communityCategories {
    ...CommunityCategoryFields
  }
}
```

---

### communityPosts

Returns paginated community posts, ordered by newest first.

```graphql
query GetCommunityPosts($input: PaginationInput) {
  communityPosts(input: $input) {
    nodes {
      ...CommunityPostFields
      author {
        id
      }
      communityComment {
        ...CommunityCommentFields
        seller { id }
      }
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{ "input": { "page": 1, "pageSize": 10 } }
```

---

### communityPost

Get a single community post by ID.

```graphql
query GetCommunityPost($id: Int!) {
  communityPost(id: $id) {
    ...CommunityPostFields
    author {
      id
    }
    communityComment {
      ...CommunityCommentFields
      seller { id }
    }
  }
}
```

**Variables**
```json
{ "id": 15 }
```

---

### communityPostsByAuthor

Returns paginated community posts by a specific author.

```graphql
query GetCommunityPostsByAuthor($authorId: ID!, $input: PaginationInput) {
  communityPostsByAuthor(authorId: $authorId, input: $input) {
    nodes {
      ...CommunityPostFields
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{
  "authorId": "seller-uuid-here",
  "input": { "page": 1, "pageSize": 10 }
}
```

---

### communityComments

Returns paginated comments for a specific community post.

```graphql
query GetCommunityComments($postId: Int!, $input: PaginationInput) {
  communityComments(postId: $postId, input: $input) {
    nodes {
      ...CommunityCommentFields
      seller { id }
      communityPost {
        id
        title
      }
    }
    pageInfo { ...PageInfoFields }
  }
}
```

**Variables**
```json
{
  "postId": 15,
  "input": { "page": 1, "pageSize": 20 }
}
```

---

## Mutations

### likeBlog

Toggle a LIKE reaction on a blog post. If already liked, removes the like. If disliked, switches to like. Requires auth.

```graphql
mutation LikeBlog($id: Int!) {
  likeBlog(id: $id)
}
```

**Variables**
```json
{ "id": 42 }
```

---

### dislikeBlog

Toggle a DISLIKE reaction on a blog post. If already disliked, removes the dislike. If liked, switches to dislike. Requires auth.

```graphql
mutation DislikeBlog($id: Int!) {
  dislikeBlog(id: $id)
}
```

**Variables**
```json
{ "id": 42 }
```

---

### createCommunityPost

Create a new community post. Requires auth.

```graphql
mutation CreateCommunityPost($input: CreateCommunityPostInput!) {
  createCommunityPost(input: $input) {
    ...CommunityPostFields
    author {
      id
    }
    communityComment {
      ...CommunityCommentFields
    }
  }
}
```

**Variables**
```json
{
  "input": {
    "title": "¿Cuál es la mejor app para gestionar envíos?",
    "content": "Estoy buscando recomendaciones para una plataforma de logística...",
    "images": ["https://cdn.example.com/post-image.jpg"]
  }
}
```

---

### updateCommunityPost

Update an existing community post.

```graphql
mutation UpdateCommunityPost($input: UpdateCommunityPostInput!) {
  updateCommunityPost(input: $input) {
    ...CommunityPostFields
  }
}
```

**Variables**
```json
{
  "input": {
    "id": 15,
    "title": "Título actualizado",
    "content": "Contenido actualizado con más detalles..."
  }
}
```

---

### deleteCommunityPost

Delete a community post by ID.

```graphql
mutation DeleteCommunityPost($id: Int!) {
  deleteCommunityPost(id: $id)
}
```

**Variables**
```json
{ "id": 15 }
```

---

### likeCommunityPost

Increment the like count on a community post.

```graphql
mutation LikeCommunityPost($id: Int!) {
  likeCommunityPost(id: $id) {
    id
    likes
  }
}
```

**Variables**
```json
{ "id": 15 }
```

---

### createCommunityComment

Add a comment to a community post. Requires auth.

```graphql
mutation CreateCommunityComment($input: CreateCommunityCommentInput!) {
  createCommunityComment(input: $input) {
    ...CommunityCommentFields
    seller { id }
    communityPost {
      id
      title
      comments
    }
  }
}
```

**Variables**
```json
{
  "input": {
    "postId": 15,
    "content": "Yo uso ShipStation, ha funcionado muy bien para mi tienda."
  }
}
```

---

### updateCommunityComment

Update an existing community comment.

```graphql
mutation UpdateCommunityComment($input: UpdateCommunityCommentInput!) {
  updateCommunityComment(input: $input) {
    ...CommunityCommentFields
  }
}
```

**Variables**
```json
{
  "input": {
    "id": 7,
    "content": "Comentario actualizado con información adicional."
  }
}
```

---

### deleteCommunityComment

Delete a community comment. Also decrements the post's comment count.

```graphql
mutation DeleteCommunityComment($id: Int!) {
  deleteCommunityComment(id: $id)
}
```

**Variables**
```json
{ "id": 7 }
```

---

## Input Types

### PaginationInput

```graphql
input PaginationInput {
  page: Int      # Default: 1
  pageSize: Int  # Default: 10
}
```

### CreateCommunityPostInput

```graphql
input CreateCommunityPostInput {
  title: String!
  content: String!
  images: [String!]
}
```

### UpdateCommunityPostInput

```graphql
input UpdateCommunityPostInput {
  id: ID!
  title: String
  content: String
  images: [String!]
}
```

### CreateCommunityCommentInput

```graphql
input CreateCommunityCommentInput {
  postId: Int!
  content: String!
}
```

### UpdateCommunityCommentInput

```graphql
input UpdateCommunityCommentInput {
  id: ID!
  content: String!
}
```
