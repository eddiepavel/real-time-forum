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

-- name: GetLatestMessages :many
SELECT
    u.uuid AS partner_id,
    u.username AS partner_username,
    MAX(m.time) AS last_message_time
FROM users u
JOIN messages m
  ON (u.uuid = m.from_user AND m.to_user = ?)
  OR (u.uuid = m.to_user AND m.from_user = ?)
WHERE u.uuid != ?
GROUP BY u.uuid, u.username

UNION ALL

SELECT
    u.uuid AS partner_id,
    u.username AS partner_username,
    NULL AS last_message_time
FROM users u
WHERE u.uuid != ?
  AND u.uuid NOT IN (
      SELECT
          CASE
              WHEN m.from_user = ? THEN m.to_user
              ELSE m.from_user
          END AS partner_id
      FROM messages m
      WHERE m.from_user = ? OR m.to_user = ?
  )
ORDER BY
    last_message_time DESC,
    partner_username ASC;

