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