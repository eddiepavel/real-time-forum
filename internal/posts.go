package internal

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"real-time-forum/internal/db"
	"real-time-forum/internal/db/posts"
	"real-time-forum/internal/db/users"
	"real-time-forum/internal/middleware"
	"real-time-forum/internal/utils"
	"time"
)

type PostUser struct {
	Username string `json:"username"`
}

type Post struct {
	Title      string `json:"title"`
	Categories string `json:"category"`
	Content    string `json:"content"`
	Author     *PostUser
	Time       time.Time `json:"createad_at"`
}

type PostPayload struct {
	Title      string `json:"title"`
	Categories string `json:"category"`
	Content    string `json:"content"`
	Image      string `json:"image"`
}

func (app *App) CreatePost(w http.ResponseWriter, r *http.Request) {

	b, err := io.ReadAll(r.Body)

	if err != nil {
		utils.BadRequest(w, errors.New("invalid payload"))
		return
	}

	var p PostPayload

	if err := json.NewDecoder(bytes.NewReader(b)).Decode(&p); err != nil {
		utils.BadRequest(w, errors.New("invalid payload"))
		return

	}

	user, ok := r.Context().Value(middleware.UserKey).(*users.User)

	if !ok {
		utils.Forbidden(w)
		return
	}

	inputs := map[string][]interface{}{
		"title":    {"required", "string"},
		"category": {"required", "string"},
		"content":  {"required", "string"},
		"image":    {"required", "string", "base64"},
	}

	ok, errs := utils.ValidateJSONFromBytes(b, inputs)

	if !ok {
		utils.Error(w, 400, "400", "validation error", errs)
		return
	}

	imagePath, err := utils.SaveBase64ToFile(p.Image)

	if err != nil {
		fmt.Println(err)
		utils.BadRequest(w, errors.New("image is shit"))
		return
	}
	store := db.New(app.DB)

	post, err := store.Posts.CreatePost(r.Context(), posts.CreatePostParams{
		Title:      p.Title,
		Content:    p.Content,
		Categories: p.Categories,
		Author:     user.Username.(string),
		Time:       time.Now(),
		ImagePath:  sql.NullString{String: imagePath, Valid: imagePath != ""},
	})

	if err != nil {
		utils.Internal(w, errors.New("internal server error"))
	}

	utils.OK(w, post)
}
