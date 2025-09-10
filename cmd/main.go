package main

import (
	"log/slog"
	"net/http"
	"os"
	"real-time-forum/internal"
	"real-time-forum/internal/db"

	_ "github.com/mattn/go-sqlite3"
)

func main() {

	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))

	db, err := db.InitDB()

	if err != nil {
		logger.Error(err.Error(), "database_error", 10)
		os.Exit(1)
	}

	defer db.Close()

	app := &internal.App{
		DB:     db,
		Logger: logger,
	}

	server := &http.Server{
		Addr:    ":8000",
		Handler: app.RegisterRoutes(),
	}

	server.ListenAndServe()
}
