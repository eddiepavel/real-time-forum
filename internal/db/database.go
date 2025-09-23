package db

import (
	"database/sql"
	"io/fs"
	"os"
	"path/filepath"
	"real-time-forum/internal/db/comments"
	"real-time-forum/internal/db/messages"
	"real-time-forum/internal/db/posts"
	sessionDB "real-time-forum/internal/db/session"
	"real-time-forum/internal/db/users"
)

type Store struct {
	Users     *users.Queries
	Posts     *posts.Queries
	Comments  *comments.Queries
	SessionDB *sessionDB.Queries
	Messages  *messages.Queries
}

func New(db *sql.DB) *Store {
	return &Store{
		Users:     users.New(db),
		Posts:     posts.New(db),
		Comments:  comments.New(db),
		SessionDB: sessionDB.New(db),
		Messages:  messages.New(db),
	}
}

func InitDB() (*sql.DB, error) {
	_, err := os.Stat("../internal/db/database.db")

	exists := os.IsNotExist(err)

	db, err := sql.Open("sqlite3", "../internal/db/database.db")

	if err != nil {
		return nil, err
	}

	if exists {
		err := migrate(db)
		if err != nil {
			return nil, err
		}
	}

	return db, nil
}

func migrate(connection *sql.DB) error {

	var migrationFiles []string

	err := filepath.WalkDir("../internal/db", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.Name() == "schema.sql" {
			migrationFiles = append(migrationFiles, path)

		}
		return nil
	})

	if len(migrationFiles) > 0 {

		t, _ := connection.Begin()

		t.Exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;`)

		for _, file := range migrationFiles {
			query, err := os.ReadFile(file)
			if err != nil {
				t.Rollback()
				break
			}
			t.Exec(string(query))
		}

		t.Commit()
	}

	return err
}
