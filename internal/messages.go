package internal

import (
	"errors"
	"net/http"
	"real-time-forum/internal/db"
	"real-time-forum/internal/db/messages"
	"real-time-forum/internal/db/users"
	"real-time-forum/internal/middleware"
	"real-time-forum/internal/utils"
)

type UnreadMessages struct {
	Count int64 `json:"count"`
}

func (app *App) GetUnreadMessages(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(middleware.UserKey).(*users.User)

	store := db.New(app.DB)

	messages, _ := store.Messages.CountUnreadUser(r.Context(), user.Uuid)

	p := make(map[string]UnreadMessages)

	for _, unread := range messages {
		if val, ok := p[unread.FromUser]; ok {
			val.Count += 1
			p[unread.FromUser] = val
		} else {
			p[unread.FromUser] = UnreadMessages{
				Count: 1,
			}
		}
	}

	utils.OK(w, p)
}

func (app *App) GetMessagesFromTo(w http.ResponseWriter, r *http.Request) {

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

	if r.PathValue("from_user") == "" && r.PathValue("to_user") == "" {
		utils.BadRequest(w, errors.New("path values missing"))
		return
	}

	user := r.Context().Value(middleware.UserKey).(*users.User)

	if r.PathValue("from_user") != user.Uuid {
		utils.Unauthorized(w, "what ?")
	}

	store := db.New(app.DB)

	chatMessages, _ := store.Messages.GetMessagesFromToUsers(r.Context(), messages.GetMessagesFromToUsersParams{
		FromUser:   user.Uuid,
		ToUser:     r.PathValue("to_user"),
		FromUser_2: r.PathValue("to_user"),
		ToUser_2:   user.Uuid,
		Limit:      limit,
		Offset:     offset,
	})

	utils.OK(w, chatMessages)

}
