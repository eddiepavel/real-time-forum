package middleware

import (
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
)

// CommonHeaders sets common security-related HTTP headers for all responses.
func CommonHeaders(next http.HandlerFunc, c *sql.DB, l *slog.Logger) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Note: This is split across multiple lines for readability. You don't
		// need to do this in your own code.
		fmt.Println("asds")
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}
