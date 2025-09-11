-- name: GetUser :one
SELECT * FROM users
WHERE uuid = ? LIMIT 1;

-- name: GetUserByUsername :one
SELECT * FROM users
WHERE username = ? LIMIT 1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = ? LIMIT 1;

-- name: CreateUser :one
INSERT INTO users(
    uuid, email, username, password, createdAt
) VALUES (
    ?, ?, ?, ?, ?
)
RETURNING *;

-- name: UpdateUser :one
UPDATE users
set username = ?, email = ?
WHERE uuid = ?
RETURNING *;

-- name: GetUserOr :one 
SELECT *
FROM users
WHERE username = ? OR email = ?
LIMIT 1;