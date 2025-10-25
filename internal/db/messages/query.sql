-- name: CreateMessage :one
INSERT INTO messages (
    message, from_user, to_user, time, status
) VALUES (
    ?, ?, ?, ?, ?
) RETURNING *;

-- name: GetMessagesFromToUsers :many
SELECT
    m.id,
    m.message,
    m.from_user AS sender_id,
    sender.username AS sender_username,
    m.to_user AS receiver_id,
    receiver.username AS receiver_username,
    m.time
FROM messages m
JOIN users sender ON m.from_user = sender.uuid
JOIN users receiver ON m.to_user = receiver.uuid
WHERE (m.from_user = ? AND m.to_user = ?)
   OR (m.from_user = ? AND m.to_user = ?)
ORDER BY m.time DESC
LIMIT ? OFFSET ?;

-- name: CountUnreadUser :many
SELECT * FROM messages WHERE to_user = ? AND (status = 0 OR status IS NULL);

-- name: MarkMessagesAsRead :exec
UPDATE messages SET status = 1 WHERE to_user = ? AND from_user = ? AND (status = 0 OR status IS NULL);  