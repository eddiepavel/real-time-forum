package middleware

import (
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"real-time-forum/internal/utils"
)

func AllowedHeaders(next http.HandlerFunc, c *sql.DB, l *slog.Logger) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Accept") != "application/json" {
			utils.BadRequest(w, errors.New("bad request"))
			return
		}
		next(w, r)
	})
}
