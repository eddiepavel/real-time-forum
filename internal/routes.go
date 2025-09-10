package internal

import (
	"net/http"
	"real-time-forum/internal/middleware"
)

func (app *App) RegisterRoutes() http.Handler {

	mux := http.NewServeMux()

	mux.HandleFunc("GET /{$}", app.Login)
	mux.HandleFunc("POST /login", middleware.ChainMiddleware(app.Login, []string{}, app.DB, app.Logger))
	mux.HandleFunc("POST /register", middleware.ChainMiddleware(app.Register, []string{}, app.DB, app.Logger))

	return mux
}
