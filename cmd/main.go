package main

import (
	"database/sql"
	"net/http"
	"real-time-forum/internal"

	_ "github.com/mattn/go-sqlite3"
)

func main() {

	db, err := sql.Open("sqlite3", "../internal/db/database.db")

	if err != nil {
		panic("err")
	}

	app := &internal.App{
		DB: db,
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
