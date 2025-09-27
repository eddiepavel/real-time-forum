package socket

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"real-time-forum/internal/db"
	"real-time-forum/internal/db/messages"
	"real-time-forum/internal/db/users"
	"time"

	"github.com/gorilla/websocket"
)

type ClientsConnected map[string]*Client

type Client struct {
	connection *websocket.Conn
	manager    *Manager
	uuid       string
	username   string
	isOnline   bool
	egress     chan Event
	store      *db.Store
}

var (
	pongWait     = 10 * time.Second
	pingInterval = (pongWait * 9) / 10
)

func NewClient(conn *websocket.Conn, manager *Manager, user *users.User) *Client {
	// Buffered channel to avoid blocking on slow clients
	return &Client{
		connection: conn,
		manager:    manager,
		uuid:       user.Uuid,
		username:   user.Username.(string),
		isOnline:   true,
		egress:     make(chan Event, 16),
		store:      db.New(manager.DB),
	}
}

func (c *Client) readMessages() {

	defer func() {
		if c.manager != nil && c.manager.Logger != nil {
			c.manager.Logger.Info("Closing client (readMessages)", "uuid", c.uuid, "username", c.username)
		}
	}()

	c.connection.SetReadLimit(512)

	if err := c.connection.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		log.Println(err)
		return
	}
	// Configure how to handle Pong responses
	c.connection.SetPongHandler(c.pongHandler)

	for {
		_, payload, err := c.connection.ReadMessage()

		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				if c.manager != nil && c.manager.Logger != nil {
					c.manager.Logger.Warn("could not read connection", "uuid", c.uuid, "username", c.username, "err", err)
				}
				break
			}
		}

		var request Event

		if err := json.Unmarshal(payload, &request); err != nil {
			if c.manager != nil && c.manager.Logger != nil {
				c.manager.Logger.Warn("failed to unmarshal event", "uuid", c.uuid, "username", c.username, "err", err)
			}
			break
		}

		if err := c.manager.routeEvent(request, c); err != nil {
			if c.manager != nil && c.manager.Logger != nil {
				c.manager.Logger.Warn("routeEvent error", "uuid", c.uuid, "username", c.username, "err", err)
			}
		}
	}
}

func (c *Client) writeMessages() {

	ticker := time.NewTicker(pingInterval)

	defer func() {
		ticker.Stop()
		if c.manager != nil && c.manager.Logger != nil {
			c.manager.Logger.Info("Closing client (writeMessages)", "uuid", c.uuid, "username", c.username)
		}
		close(c.egress)
		c.manager.removeClient(c)
	}()

	for {
		select {
		case message, ok := <-c.egress:
			if !ok {
				if err := c.connection.WriteMessage(websocket.CloseMessage, nil); err != nil {
					if c.manager != nil && c.manager.Logger != nil {
						c.manager.Logger.Warn("could not write message user is offline", "uuid", c.uuid, "username", c.username, "err", err)
					}
				}
				if c.manager != nil && c.manager.Logger != nil {
					c.manager.Logger.Info("egress closed (writeMessages)", "uuid", c.uuid, "username", c.username)
				}
				return
			}
			data, err := json.Marshal(message)

			if err != nil {
				if c.manager != nil && c.manager.Logger != nil {
					c.manager.Logger.Warn("marshal error (writeMessages)", "uuid", c.uuid, "username", c.username, "err", err)
				}
				return
			}
			if c.manager != nil && c.manager.Logger != nil {
				c.manager.Logger.Info("Sending message to client", "uuid", c.uuid, "username", c.username, "type", message.Type)
			}
			if err := c.connection.WriteMessage(websocket.TextMessage, data); err != nil {
				if c.manager != nil && c.manager.Logger != nil {
					c.manager.Logger.Warn("could not write message user is offline", "uuid", c.uuid, "username", c.username, "err", err)
				}
				return
			}

			var messageP PrivateMessageEvent
			if err := json.Unmarshal(message.Payload, &messageP); err != nil {

				return
			}
			context := context.Background()
			c.store.Messages.CreateMessage(context, messages.CreateMessageParams{
				Message:  messageP.Message,
				FromUser: messageP.From,
				ToUser:   messageP.To,
				Time:     time.Now(),
				Status:   sql.NullInt64{Int64: 1, Valid: true},
			})
		case <-ticker.C:
			if err := c.connection.WriteMessage(websocket.PingMessage, []byte{}); err != nil {
				if c.manager != nil && c.manager.Logger != nil {
					c.manager.Logger.Warn("ping write error (writeMessages)", "uuid", c.uuid, "username", c.username, "err", err)
				}
				return
			}
		}

	}
}

func (c *Client) pongHandler(pongMsg string) error {
	return c.connection.SetReadDeadline(time.Now().Add(pongWait))
}
