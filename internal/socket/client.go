package socket

import (
	"real-time-forum/internal/db/users"

	"github.com/gorilla/websocket"
)

type ClientsConnected struct {
	Connected map[string]*Client
}

type Client struct {
	Connection *websocket.Conn
	Manager    *Manager
	Uuid       string
	Username   string
	IsOnline   bool
}

func NewClient(conn *websocket.Conn, manager *Manager, user *users.User) *Client {
	return &Client{
		Connection: conn,
		Manager:    manager,
		Uuid:       user.Uuid,
		IsOnline:   true,
	}
}

// func (c *Client) readMessages() {
// 	for {
// 		messagetype, payload, err := c.Connection.ReadMessage()

// 		if err != nil {
// 			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
// 				c.Manager.Logger.Warn("could not read connection")
// 			}
// 		}
// 	}
// }
