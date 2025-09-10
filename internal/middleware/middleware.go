package middleware

import (
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
)

// Middleware represents a function that wraps an HTTP handler with additional functionality.
type Middleware func(h http.HandlerFunc, c *sql.DB, l *slog.Logger) http.HandlerFunc

// ChainMiddleware applies a sequence of middlewares to an HTTP handler.
// It combines global middlewares with route-specific middlewares.
func ChainMiddleware(h http.HandlerFunc, k []string, c *sql.DB, l *slog.Logger) http.HandlerFunc {

	selectMiddle := map[string]Middleware{
		"auth":           AuthMiddleware,
		"headers":        CommonHeaders,
		"allowedHeaders": AllowedHeaders,
		"logs":           LoggingMiddleware,
	}

	globalMiddle := []string{"headers", "allowedHeaders", "logs"}

	wrapped := h

	fullMiddlewareList := append(globalMiddle, k...)

	for i := 0; i <= len(fullMiddlewareList)-1; i++ {
		key := fullMiddlewareList[i]
		if mw, exists := selectMiddle[key]; exists {
			wrapped = mw(wrapped, c, l)
		} else {
			fmt.Printf("Middleware %s not found\n", key)
		}
	}

	return wrapped
}
