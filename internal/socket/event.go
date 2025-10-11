package socket

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"real-time-forum/internal/db/messages"
	"time"
)

// PrivateMessageHandler routes a private message to the intended recipient
func PrivateMessageHandler(event Event, c *Client, d *sql.DB) error {
	var msg PrivateMessageEvent
	if err := json.Unmarshal(event.Payload, &msg); err != nil {
		return err
	}
	// Validate sender is the connected client
	if c == nil {
		return fmt.Errorf("unauthenticated client")
	}

	if c.uuid == msg.To {
		return fmt.Errorf("wrong user")
	}

	recipient, ok := c.manager.clients[msg.To]

	if !ok {
		context := context.Background()

		_, err := c.store.Users.GetUser(context, msg.To)

		if err == sql.ErrNoRows {
			return fmt.Errorf("unknown user")
		}

		c.store.Messages.CreateMessage(context, messages.CreateMessageParams{
			Message:  msg.Message,
			FromUser: c.uuid,
			ToUser:   msg.To,
			Time:     time.Now(),
			Status:   sql.NullInt64{},
		})

		return fmt.Errorf("recipient not online")
	}
	// Set the sent time
	msg.Sent = time.Now()
	payload, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	// Send only to the recipient
	recipient.egress <- Event{
		Type:    EventPrivateMessage,
		Payload: payload,
	}
	return nil
}

type Event struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type EventHandler func(event Event, c *Client, d *sql.DB) error

const (
	EventBroadCastOnline = "online_users"
	EventPrivateMessage  = "private_message"
	EventError           = "error"
)

// PrivateMessageEvent represents a private message sent from one user to another
type PrivateMessageEvent struct {
	From    string    `json:"from_user"`
	To      string    `json:"to_user"`
	Message string    `json:"message"`
	Sent    time.Time `json:"sent"`
}

type OnlineUser struct {
	UUID     string `json:"uuid"`
	Username string `json:"username"`
}

type WhoseOnline struct {
	Online []OnlineUser `json:"online"`
}

type ErrorMessage struct {
	TextError string `json:"error"`
}

// BrodCastOnline sends the current list of online users to all clients
func BroadCastOnline(event Event, c *Client, d *sql.DB) error {
	return c.manager.BroadcastOnlineUsers()
}

// BroadcastOnlineUsers builds and sends the online user list to all clients
func (m *Manager) BroadcastOnlineUsers() error {
	m.RLock()
	defer m.RUnlock()
	var usersOnline WhoseOnline
	for _, client := range m.clients {
		usersOnline.Online = append(usersOnline.Online, OnlineUser{
			UUID:     client.uuid,
			Username: client.username,
		})
	}
	payload, err := json.Marshal(usersOnline)
	if err != nil {
		return err
	}
	event := Event{
		Type:    EventBroadCastOnline,
		Payload: payload,
	}
	for _, client := range m.clients {
		select {
		case client.egress <- event:
			if m.Logger != nil {
				m.Logger.Info("BroadcastOnlineUsers: sent", "uuid", client.uuid, "username", client.username)
			}
		default:
			if m.Logger != nil {
				m.Logger.Warn("BroadcastOnlineUsers: egress channel blocked", "uuid", client.uuid, "username", client.username)
			}
		}
	}
	return nil
}
