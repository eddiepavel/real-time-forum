package middleware

import (
	"database/sql"
	"log/slog"
	"net/http"
)

// LoggingMiddleware logs the details of each incoming HTTP request, such as method and path.
func LoggingMiddleware(next http.HandlerFunc, c *sql.DB, l *slog.Logger) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		l.Info("Request", "method", r.Method, "path", r.URL.Path)
		next(w, r)
	})
}
