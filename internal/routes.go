package internal

import (
	"net/http"
	"real-time-forum/internal/middleware"
	"real-time-forum/internal/socket"
)

func (app *App) RegisterRoutes() http.Handler {

	mux := http.NewServeMux()

	socketManager := socket.NewManager(app.DB, app.Logger)

	mux.HandleFunc("GET /{$}", middleware.ChainMiddleware(Index, []string{}, app.DB, app.Logger, 1))
	mux.HandleFunc("POST /login", middleware.ChainMiddleware(app.Login, []string{}, app.DB, app.Logger, 1))
	mux.HandleFunc("POST /register", middleware.ChainMiddleware(app.Register, []string{}, app.DB, app.Logger, 1))
	mux.HandleFunc("POST /post/create", middleware.ChainMiddleware(app.CreatePost, []string{"auth"}, app.DB, app.Logger, 1))
	mux.HandleFunc("DELETE /post/{id}/delete", middleware.ChainMiddleware(app.DeletePost, []string{"auth"}, app.DB, app.Logger, 1))
	mux.HandleFunc("GET /posts", middleware.ChainMiddleware(app.GetPosts, []string{"auth"}, app.DB, app.Logger, 1))
	mux.HandleFunc("GET /post/{id}", middleware.ChainMiddleware(app.GetPost, []string{"auth"}, app.DB, app.Logger, 1))
	mux.HandleFunc("PUT /post/{id}/edit", middleware.ChainMiddleware(app.UpdatePost, []string{"auth"}, app.DB, app.Logger, 1))
	mux.HandleFunc("POST /comment/create/post/{id}", middleware.ChainMiddleware(app.CreateComment, []string{"auth"}, app.DB, app.Logger, 1))
	mux.HandleFunc("GET /comments/post/{id}", middleware.ChainMiddleware(app.GetCommentsByPost, []string{"auth"}, app.DB, app.Logger, 1))
	mux.HandleFunc("GET /ws", middleware.ChainMiddleware(socketManager.ServeWs, []string{"auth"}, app.DB, app.Logger, 2))
	mux.HandleFunc("GET /messages/unread", middleware.ChainMiddleware(app.GetUnreadMessages, []string{"auth"}, app.DB, app.Logger, 1))
	mux.HandleFunc("GET /mesages/{to_user}", middleware.ChainMiddleware(app.GetMessagesFromTo, []string{"auth"}, app.DB, app.Logger, 1))

	mux.Handle("/", http.StripPrefix("/", http.FileServer(http.Dir("../public"))))

	return mux
}
