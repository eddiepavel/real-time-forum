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

type EntityUser struct {
	Username string `json:"username"`
	CanEdit  bool   `json:"canEdit"`
}

type Comments struct {
	Id      int64       `json:"id,omitempty"`
	Content string      `json:"content"`
	Author  *EntityUser `json:"author"`
	Time    time.Time   `json:"created_at"`
}

type Post struct {
	Title      string         `json:"title"`
	Categories string         `json:"category"`
	Content    string         `json:"content"`
	Author     *EntityUser    `json:"author"`
	Time       time.Time      `json:"created_at"`
	Image      sql.NullString `json:"image"`
}

type PostPayload struct {
	Title      string `json:"title"`
	Categories string `json:"category"`
	Content    string `json:"content"`
	Image      string `json:"image"`
}

type CommentPayload struct {
	Content string `json:"content"`
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
		return
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
		return
	}

	if err == sql.ErrNoRows {
		utils.OK(w, []string{})
		return
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
			Author: &EntityUser{
				Username: p.AuthorUsername.(string),
				CanEdit:  canEdit,
			},
			Time:  p.Time,
			Image: sql.NullString{String: p.ImagePath.String, Valid: p.ImagePath.String != ""},
		})
	}

	total, err := store.Posts.TotalPosts(r.Context())

	if err != nil {
		utils.Internal(w, errors.New("internal server error"))
		return
	}

	utils.Write(w, 200, utils.WithPagination(postList, utils.Pagination{
		Page:    int(page),
		Size:    int(limit),
		Current: len(postList),
		Total:   int(total),
	}))

}

func (app *App) UpdatePost(w http.ResponseWriter, r *http.Request) {

	if r.PathValue("id") == "" {
		utils.BadRequest(w, errors.New("post id missing"))
		return
	}

	postInt, err := utils.ConvertPathValueNumber(r, "id")

	if err != nil {
		utils.BadRequest(w, errors.New("wrong path value"))
		return
	}

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

	inputs := map[string][]interface{}{
		"title":    {"required", "string"},
		"category": {"required", "string"},
		"content":  {"required", "string"},
	}

	ok, errs := utils.ValidateJSONFromBytes(b, inputs)

	if !ok {
		utils.Error(w, 400, "400", "validation error", errs)
		return
	}

	user := r.Context().Value(middleware.UserKey).(*users.User)

	store := db.New(app.DB)

	post, err := store.Posts.GetPostById(r.Context(), postInt)

	if err == sql.ErrNoRows {
		utils.NotFound(w)
		return
	}

	if post.Author != user.Uuid {
		utils.Forbidden(w)
		return
	}

	updatePost, err := store.Posts.UpdatePost(r.Context(), posts.UpdatePostParams{
		Title:      p.Title,
		Categories: p.Categories,
		Content:    p.Content,
		ID:         post.ID,
		Author:     user.Uuid,
	})

	if err != nil {
		utils.Internal(w, errors.New("internal error"))
		return
	}

	utils.OK(w, updatePost)

}

func (app *App) GetPost(w http.ResponseWriter, r *http.Request) {

	if r.PathValue("id") == "" {
		utils.BadRequest(w, errors.New("post id missing"))
		return
	}

	postInt, err := utils.ConvertPathValueNumber(r, "id")

	if err != nil {
		fmt.Println(err)
		utils.BadRequest(w, errors.New("wrong path value"))
		return
	}

	store := db.New(app.DB)

	user := r.Context().Value(middleware.UserKey).(*users.User)

	post, err := store.Posts.GetPostById(r.Context(), postInt)

	if err == sql.ErrNoRows {
		utils.NotFound(w)
		return
	}

	postUser, _ := store.Users.GetUser(r.Context(), post.Author)

	canEdit := false

	if post.Author == user.Uuid {
		canEdit = true
	}

	utils.Write(w, 200, Post{
		Title:      post.Title,
		Categories: post.Categories,
		Content:    post.Content,
		Author: &EntityUser{
			Username: postUser.Username.(string),
			CanEdit:  canEdit,
		},
		Time:  post.Time,
		Image: sql.NullString{String: post.ImagePath.String, Valid: post.ImagePath.String != ""},
	})

}

func (app *App) DeletePost(w http.ResponseWriter, r *http.Request) {
	if r.PathValue("id") == "" {
		utils.BadRequest(w, errors.New("paramater mssing"))
		return
	}

	id, err := utils.ConvertPathValueNumber(r, "id")

	if err != nil {
		utils.BadRequest(w, errors.New("bad bad bad"))
		return
	}

	user := r.Context().Value(middleware.UserKey).(*users.User)

	store := db.New(app.DB)

	post, err := store.Posts.GetPostById(r.Context(), id)

	if err == sql.ErrNoRows {
		utils.NotFound(w)
		return
	}

	if post.Author != user.Uuid {
		utils.Unauthorized(w, "you are not worthly")
		return
	}

	if err := store.Posts.DeletePost(r.Context(), id); err != nil {
		utils.Internal(w, errors.New("error making things"))
		return
	}

	utils.OK(w, "ok")
}
