package internal

import (
	"database/sql"
	"log/slog"
	"net/http"
	"text/template"
)

type App struct {
	DB     *sql.DB
	Logger *slog.Logger
}

func Index(w http.ResponseWriter, r *http.Request) {
	tpml, err := template.ParseFiles("../public/index.html")

	if err != nil {
		w.Write([]byte("Something went wrong"))
	}

	tpml.Execute(w, nil)
}
