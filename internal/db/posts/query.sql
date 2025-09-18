-- name: CreatePost :one
INSERT INTO posts(
    title, categories, content, author, time, image_path
)
VALUES(
    ?, ?, ?, ?, ?, ?

) RETURNING *;

-- name: GetPostById :one
SELECT * FROM posts 
WHERE id = ?;

-- name: GetPostByAuthor :one
SELECT * FROM posts 
WHERE author = ?;

-- name: UpdatePost :one
UPDATE posts SET title = ?, categories = ?, content = ? WHERE id = ? AND author = ? RETURNING *;

-- name: TotalPosts :one
SELECT COUNT(*) FROM posts;

-- name: GetPosts :many
SELECT * FROM posts ORDER BY time DESC LIMIT ? OFFSET ?;

-- name: GetPostsWithAuthorUsername :many
SELECT
    posts.id,
    posts.title,
    posts.categories,
    posts.content,
    posts.author,
    users.username AS author_username,
    posts.time,
    posts.image_path
FROM posts
JOIN users ON posts.author = users.uuid
ORDER BY time DESC LIMIT ? OFFSET ?