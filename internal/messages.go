package internal

import (
	"errors"
	"net/http"
	"real-time-forum/internal/db"
	"real-time-forum/internal/db/messages"
	"real-time-forum/internal/db/users"
	"real-time-forum/internal/middleware"
	"real-time-forum/internal/utils"
	"time"
)

type UnreadMessages struct {
	Count int64 `json:"count"`
}

type ChatMessage struct {
	ID         int64     `json:"id"`
	Message    string    `json:"message"`
	SenderID   string    `json:"from_id"`
	ReceiverID string    `json:"to_id"`
	Time       time.Time `json:"sent"`
}

type UserLatestMessages struct {
	UserId   string `json:"uuid"`
	Username string `json:"username"`
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

	if r.PathValue("to_user") == "" {
		utils.BadRequest(w, errors.New("path values missing"))
		return
	}

	user := r.Context().Value(middleware.UserKey).(*users.User)

	if user == nil {
		utils.Unauthorized(w, "what ?")
		return
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

	payloadMessages := make([]ChatMessage, 0, len(chatMessages))

	for i := len(chatMessages) - 1; i >= 0; i-- {
		payloadMessages = append(payloadMessages, ChatMessage{
			ID:         chatMessages[i].ID,
			Message:    chatMessages[i].Message,
			SenderID:   chatMessages[i].SenderID,
			ReceiverID: chatMessages[i].ReceiverID,
			Time:       chatMessages[i].Time,
		})
	}

	if err := store.Messages.MarkMessagesAsRead(r.Context(), messages.MarkMessagesAsReadParams{
		ToUser:   user.Uuid,
		FromUser: r.PathValue("to_user"),
	}); err != nil {
		utils.Internal(w, errors.New("internal error"))
		return
	}

	utils.OK(w, payloadMessages)

}

func (app *App) GetLatestMessages(w http.ResponseWriter, r *http.Request) {

	currentUser, ok := r.Context().Value(middleware.UserKey).(*users.User)

	if !ok {
		utils.Unauthorized(w, "you are not from this world. What are you doing?")
		return
	}

	store := db.New(app.DB)

	latestMessages, err := store.Users.GetLatestMessages(r.Context(), users.GetLatestMessagesParams{
		ToUser:     currentUser.Uuid,
		FromUser:   currentUser.Uuid,
		Uuid:       currentUser.Uuid,
		Uuid_2:     currentUser.Uuid,
		FromUser_2: currentUser.Uuid,
		FromUser_3: currentUser.Uuid,
		ToUser_2:   currentUser.Uuid,
	})

	if err != nil {
		utils.Internal(w, errors.New("what ? database not found"))
		return
	}

	payload := []UserLatestMessages{}

	for _, message := range latestMessages {
		payload = append(payload, UserLatestMessages{
			UserId:   message.PartnerID,
			Username: message.PartnerUsername.(string),
		})
	}

	utils.OK(w, payload)

}
