-- name: SessionExistsDB :one 
SELECT * FROM session WHERE userId = ? LIMIT 1;

-- name: CreateSession :one
INSERT INTO session (token, expiresAt, userId) VALUES (?, ?, ?) RETURNING *;

-- name: GetSessionByID :one
SELECT * FROM session WHERE id = ? LIMIT 1;

-- name: GetSessionByUserID :one
SELECT * FROM session WHERE userId = ? LIMIT 1;

-- name: GetSessionByToken :one
SELECT * FROM session WHERE token = ? LIMIT 1;

-- name: DeleteSession :exec
DELETE FROM session WHERE id = ?;

-- name: DeleteSessionUser :exec
DELETE FROM session WHERE userId = ?;