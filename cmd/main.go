package main

import (
	"context"
	"errors"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"real-time-forum/internal"
	"real-time-forum/internal/db"
	"syscall"
	"time"

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

	go func() {
		if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("error %v", err)
		}
		log.Println("Stopped serving new connections.")
	}()

	signStop := make(chan os.Signal, 1)

	signal.Notify(signStop, syscall.SIGINT, syscall.SIGTERM)

	<-signStop

	context, handleShut := context.WithTimeout(context.Background(), 10*time.Second)

	defer handleShut()

	if err := server.Shutdown(context); err != nil {
		log.Fatalf("HTTP shutdown error: %v", err)
	}

	log.Println("Graceful shutdown complete.")
}
