package socket

import (
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"real-time-forum/internal/db/users"
	"real-time-forum/internal/middleware"
	"sync"

	"github.com/gorilla/websocket"
)

var (
	websocketUpgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin:     checkOrigin,
	}
)

type Manager struct {
	DB      *sql.DB
	Logger  *slog.Logger
	clients ClientsConnected
	sync.RWMutex
	handlers map[string]EventHandler
}

func NewManager(db *sql.DB, l *slog.Logger) *Manager {
	m := &Manager{
		DB:       db,
		clients:  make(ClientsConnected),
		Logger:   l,
		handlers: make(map[string]EventHandler),
	}
	m.manageEventHandlers()
	return m
}

func (m *Manager) manageEventHandlers() {
	m.handlers[EventBroadCastOnline] = BrodCastOnline
	m.handlers[EventPrivateMessage] = PrivateMessageHandler
}

func (m *Manager) routeEvent(event Event, c *Client) error {
	if handler, ok := m.handlers[event.Type]; ok {
		if err := handler(event, c, m.DB); err != nil {
			return err
		}
		return nil
	} else {
		return errors.New("no such even type dude")
	}
}

func (m *Manager) ServeWs(w http.ResponseWriter, r *http.Request) {

	user := r.Context().Value(middleware.UserKey).(*users.User)

	conn, err := websocketUpgrader.Upgrade(w, r, nil)

	if err != nil {
		return
	}

	client := NewClient(conn, m, user)

	m.addClient(client)

	go client.readMessages()
	go client.writeMessages()
}

func (m *Manager) addClient(client *Client) {

	m.Lock()
	m.clients[client.uuid] = client
	m.Unlock()

	// After adding, broadcast the updated online user list
	go m.BroadcastOnlineUsers()

}

func (m *Manager) removeClient(client *Client) {
	m.Lock()
	defer m.Unlock()
	if _, ok := m.clients[client.uuid]; ok {
		client.connection.Close()
		delete(m.clients, client.uuid)
	}
	// After removal, broadcast the updated online user list
	go m.BroadcastOnlineUsers()
}

func checkOrigin(r *http.Request) bool {

	origin := r.Header.Get("Origin")

	return origin != "http://localhost:8000"
}
