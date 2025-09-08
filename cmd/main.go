package main

import (
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"real-time-forum/internal"

	_ "github.com/mattn/go-sqlite3"
)

func main() {

	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))

	db, err := sql.Open("sqlite3", "../internal/db/database.db")

	if err != nil {
		logger.Error(err.Error(), "database_error", 10)
		os.Exit(1)
	}

	app := &internal.App{
		DB:     db,
		Logger: logger,
	}

	server := &http.Server{
		Addr:    ":8000",
		Handler: app.RegisterRoutes(),
	}

	server.ListenAndServe()

	// if err != nil {
	// 	panic("failed to create database")
	// }

	// newc := users.New(db)

	// ctx := context.Background()

	// user, _ := newc.GetUser(ctx, "98u23u98hdshhjsdjhs")

	// fmt.Printf("%+v", user)

	// folder, _ := os.ReadDir("../internal/db")

	// fmt.Println(folder[3].Name())

	// fmt.Println("test")
}
