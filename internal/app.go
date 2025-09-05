package internal

import (
	"database/sql"
	"net/http"
)

type App struct {
	DB      *sql.DB
	Handler []http.HandlerFunc
}
