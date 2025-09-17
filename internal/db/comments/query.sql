-- name: CreateComment :one
INSERT INTO comments(
    content, author, post_id, time
)
VALUES(
    ?, ?, ?, ?
) RETURNING *;

-- name: GetCommentById :one
SELECT * FROM comments
WHERE id = ?;

-- name: GetCommentsByPostId :many
SELECT * FROM comments WHERE post_id = ?;

-- name: GetCommentByAuthor :one
SELECT * FROM comments
WHERE author = ?;

-- name: UpdateComment :one
UPDATE comments SET content = ? WHERE id = ? AND author = ? RETURNING *;

-- name: GetCommentsWithAuthorUsername :many
SELECT
    comments.id,
    comments.content,
    comments.author,
    comments.content,
    comments.post_id,
    users.username AS author_username,
    comments.time
FROM comments
JOIN users ON comments.author = users.uuid
WHERE comments.post_id = ?
ORDER BY comments.time DESC LIMIT ? OFFSET ?;