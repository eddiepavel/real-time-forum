package middleware

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"real-time-forum/internal/db"
	"real-time-forum/internal/utils"
	"time"
)

type ContextKey string

const UserKey ContextKey = "user"

// AuthMiddleware authenticates users based on a session token stored in a cookie.
// It adds the authenticated user to the request context if the session is valid.
func AuthMiddleware(next http.HandlerFunc, connection *sql.DB, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		cookie, err := r.Cookie("auth-token")

		if (r.URL.Path == "/home" || r.URL.Path == "/view") && cookie == nil {
			next(w, r)
			return
		}

		if err != nil {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		store := db.New(connection)

		// Retrieve the session
		session, err := store.SessionDB.GetSessionByToken(r.Context(), cookie.Value)
		// session, err := app.DB.GetSession("token", cookie.Value)
		if err != nil {
			fmt.Println("Session not found")
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		// Use session.ExpiresAt as is (local time)
		expiresAt := session.Expiresat

		// Use local time for comparison
		now := time.Now().Add(time.Hour * 3).UTC() // Local time

		if expiresAt.Before(now) {
			store.SessionDB.DeleteSession(r.Context(), session.ID)
			expireCookie := http.Cookie{
				Name:   "auth-token",
				Value:  "",
				Path:   "/",
				MaxAge: -1,
			}
			http.SetCookie(w, &expireCookie)
			utils.ResponseBuilder(w, 401, utils.ResponseData{
				Error:    map[string]string{"message": "Unauthorized"},
				Data:     struct{}{},
				Paginate: struct{}{},
			}, logger)

			return
		}

		authUser, _ := store.Users.GetUser(r.Context(), session.Userid)

		ctx := context.WithValue(r.Context(), UserKey, &authUser)

		next(w, r.WithContext(ctx))
	}
}
