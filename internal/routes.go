package internal

import (
	"net/http"
	"real-time-forum/internal/middleware"
)

func (app *App) RegisterRoutes() http.Handler {

	mux := http.NewServeMux()

	mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("../public/assets"))))
	mux.HandleFunc("GET /{$}", middleware.ChainMiddleware(Index, []string{}, app.DB, app.Logger))
	mux.HandleFunc("POST /login", middleware.ChainMiddleware(app.Login, []string{}, app.DB, app.Logger))
	mux.HandleFunc("POST /register", middleware.ChainMiddleware(app.Register, []string{}, app.DB, app.Logger))
	mux.HandleFunc("POST /post/create", middleware.ChainMiddleware(app.CreatePost, []string{"auth"}, app.DB, app.Logger))
	mux.HandleFunc("GET /posts", middleware.ChainMiddleware(app.GetPosts, []string{"auth"}, app.DB, app.Logger))

	return mux
}
