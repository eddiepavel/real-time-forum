package internal

import (
	"net/http"
	"real-time-forum/internal/middleware"
)

func (app *App) RegisterRoutes() http.Handler {

	mux := http.NewServeMux()

	mux.Handle("/", http.StripPrefix("/", http.FileServer(http.Dir("../public"))))
	mux.HandleFunc("GET /{$}", middleware.ChainMiddleware(Index, []string{}, app.DB, app.Logger))
	mux.HandleFunc("POST /login", middleware.ChainMiddleware(app.Login, []string{}, app.DB, app.Logger))
	mux.HandleFunc("POST /register", middleware.ChainMiddleware(app.Register, []string{}, app.DB, app.Logger))
	mux.HandleFunc("POST /post/create", middleware.ChainMiddleware(app.CreatePost, []string{"auth"}, app.DB, app.Logger))
	mux.HandleFunc("GET /posts", middleware.ChainMiddleware(app.GetPosts, []string{"auth"}, app.DB, app.Logger))
	mux.HandleFunc("GET /post/{id}", middleware.ChainMiddleware(app.GetPost, []string{"auth"}, app.DB, app.Logger))
	mux.HandleFunc("POST /update/post/{id}", middleware.ChainMiddleware(app.UpdatePost, []string{"auth"}, app.DB, app.Logger))
	mux.HandleFunc("POST /comment/create/post/{id}", middleware.ChainMiddleware(app.CreateComment, []string{"auth"}, app.DB, app.Logger))

	return mux
}
