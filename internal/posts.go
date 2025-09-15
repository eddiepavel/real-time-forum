package internal

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
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
	CanEdit  bool   `json:"canEdit"`
}

type Post struct {
	Title      string    `json:"title"`
	Categories string    `json:"category"`
	Content    string    `json:"content"`
	Author     *PostUser `json:"author"`
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
		utils.BadRequest(w, errors.New("image is shit"))
		return
	}
	store := db.New(app.DB)

	post, err := store.Posts.CreatePost(r.Context(), posts.CreatePostParams{
		Title:      p.Title,
		Content:    p.Content,
		Categories: p.Categories,
		Author:     user.Uuid,
		Time:       time.Now(),
		ImagePath:  sql.NullString{String: imagePath, Valid: imagePath != ""},
	})

	if err != nil {
		utils.Internal(w, errors.New("internal server error"))
	}

	utils.OK(w, post)
}

func (app *App) GetPosts(w http.ResponseWriter, r *http.Request) {

	var defaultLimit int64 = 20
	var currentPage int64 = 1
	limit := defaultLimit
	page := currentPage
	var err error

	if r.URL.Query().Get("limit") != "" || r.URL.Query().Get("page") != "" {
		limit, err = utils.ConvertQueryToNumber(r, "limit")

		if err != nil {
			utils.BadRequest(w, errors.New("bad request"))
			return
		}

		page, err = utils.ConvertQueryToNumber(r, "page")

		if err != nil {
			utils.BadRequest(w, errors.New("bad request"))
			return
		}

		if limit <= 0 {
			limit = defaultLimit
		}

		if page <= 0 {
			page = currentPage
		}

	}

	offset := (page - 1) * limit

	store := db.New(app.DB)

	user := r.Context().Value(middleware.UserKey).(*users.User)

	posts, err := store.Posts.GetPostsWithAuthorUsername(r.Context(), posts.GetPostsWithAuthorUsernameParams{
		Limit:  limit,
		Offset: offset,
	})

	if err != nil && err != sql.ErrNoRows {
		utils.Internal(w, errors.New("internal"))
	}

	if err == sql.ErrNoRows {
		utils.OK(w, []string{})
	}
	var postList []Post
	for _, p := range posts {
		canEdit := false
		if p.Author == user.Uuid {
			canEdit = true
		}
		postList = append(postList, Post{
			Title:      p.Title,
			Categories: p.Categories,
			Content:    p.Content,
			Author: &PostUser{
				Username: p.AuthorUsername.(string),
				CanEdit:  canEdit,
			},
			Time: p.Time,
		})
	}

	utils.Write(w, 200, utils.WithPagination(postList, utils.Pagination{
		Page:  int(page),
		Size:  int(limit),
		Total: len(postList),
	}))

}
