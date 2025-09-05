package internal

import (
	"net/http"
)

func (app *App) RegisterRoutes() *http.ServeMux {
	// http.HandlerFunc
	mux := http.NewServeMux()

	mux.HandleFunc("GET /{$}", app.Login)
	mux.HandleFunc("GET /2", app.Login1)

	return mux
}
