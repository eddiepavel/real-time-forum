package socket

import (
	"database/sql"
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
	}
)

type Manager struct {
	DB      *sql.DB
	Logger  *slog.Logger
	Clients map[string]*Client
	sync.RWMutex
}

func NewManager(db *sql.DB, l *slog.Logger) *Manager {
	return &Manager{
		DB:      db,
		Clients: make(map[string]*Client),
		Logger:  l,
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

	// go client.readMessages()
	// go client.writeMessages()
}

func (m *Manager) addClient(client *Client) {
	m.Lock()
	defer m.Unlock()
	m.Clients[client.Uuid] = client

}

func (m *Manager) removeClient(client *Client) {
	m.Lock()
	defer m.Unlock()
	if _, ok := m.Clients[client.Uuid]; ok {
		client.Connection.Close()
		delete(m.Clients, client.Uuid)
	}
}
