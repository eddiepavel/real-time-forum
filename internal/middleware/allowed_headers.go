package middleware

import (
	"database/sql"
	"log/slog"
	"net/http"
	"real-time-forum/internal/utils"
)

func AllowedHeaders(next http.HandlerFunc, c *sql.DB, l *slog.Logger) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Accept") != "application/json" {
			utils.ResponseBuilder(w, 500, utils.ResponseData{
				Error: map[string]string{"message": "Wrong headers"},
			}, l)
			return
		}
		next(w, r)
	})
}
