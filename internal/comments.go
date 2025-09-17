package internal

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"real-time-forum/internal/db"
	"real-time-forum/internal/db/comments"
	"real-time-forum/internal/db/users"
	"real-time-forum/internal/middleware"
	"real-time-forum/internal/utils"
	"time"
)

func (app *App) CreateComment(w http.ResponseWriter, r *http.Request) {

	if r.PathValue("id") == "" {
		utils.BadRequest(w, errors.New("missing id"))
		return
	}

	payload, err := io.ReadAll(r.Body)

	if err != nil {
		utils.BadRequest(w, errors.New("invalid payload"))
		return
	}

	var p CommentPayload

	if err := json.NewDecoder(bytes.NewReader(payload)).Decode(&p); err != nil {
		utils.BadRequest(w, errors.New("invalid payload"))
		return
	}

	inputs := map[string][]interface{}{
		"content": {"required", "string"},
	}

	ok, errs := utils.ValidateJSONFromBytes(payload, inputs)

	if !ok {
		utils.Error(w, 400, "400", "validation error", errs)
		return
	}

	user, ok := r.Context().Value(middleware.UserKey).(*users.User)

	if !ok {
		utils.Forbidden(w)
		return
	}

	postInt, err := utils.ConvertPathValueNumber(r, "id")

	if err != nil {
		utils.BadRequest(w, errors.New("invalid payload"))
		return
	}

	store := db.New(app.DB)

	post, err := store.Posts.GetPostById(r.Context(), postInt)

	if err == sql.ErrNoRows {
		utils.NotFound(w)
		return
	}

	comment, err := store.Comments.CreateComment(r.Context(), comments.CreateCommentParams{
		Content: p.Content,
		Author:  user.Uuid,
		PostID:  post.ID,
		Time:    time.Now(),
	})

	if err != nil {
		utils.Internal(w, errors.New("internal server error"))
	}

	utils.OK(w, comment)

}
