package main

import (
	"context"
	"database/sql"
	"fmt"
	"real-time-forum/internal/db/users"

	_ "github.com/mattn/go-sqlite3"
)

func main() {

	db, err := sql.Open("sqlite3", "../internal/db/database.db")

	if err != nil {
		panic("failed to create database")
	}

	newc := users.New(db)

	ctx := context.Background()

	user, _ := newc.GetUser(ctx, "98u23u98hdshhjsdjhs")

	fmt.Printf("%+v", user)

	fmt.Println("test")
}
