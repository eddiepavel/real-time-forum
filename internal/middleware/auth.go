package middleware

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"real-time-forum/internal/db"
	"real-time-forum/internal/utils"
	"strings"
	"time"
)

type ContextKey string

const UserKey ContextKey = "user"

// AuthMiddleware authenticates users based on a session token stored in a cookie.
// It adds the authenticated user to the request context if the session is valid.
func AuthMiddleware(next http.HandlerFunc, connection *sql.DB, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		header := r.Header.Get("Authorization")

		if header == "" {
			utils.BadRequest(w, errors.New("bad Request"))
			return
		}

		const prefix = "Bearer "
		if !strings.HasPrefix(header, prefix) {
			utils.BadRequest(w, errors.New("bad Request"))
			return
		}

		token := strings.TrimPrefix(header, prefix)

		if token == "" {
			utils.Unauthorized(w, "token missing")
			return
		}

		store := db.New(connection)

		// Retrieve the session
		session, err := store.SessionDB.GetSessionByToken(r.Context(), token)

		if err != nil {
			utils.Unauthorized(w, "Unauthorized")
			return
		}

		// Use session.ExpiresAt as is (local time)
		expiresAt := session.Expiresat

		if expiresAt.Before(time.Now().UTC()) {
			store.SessionDB.DeleteSession(r.Context(), session.ID)
			utils.Unauthorized(w, "Token expired")
			return
		}

		authUser, _ := store.Users.GetUser(r.Context(), session.Userid)

		ctx := context.WithValue(r.Context(), UserKey, &authUser)

		next(w, r.WithContext(ctx))
	}
}
