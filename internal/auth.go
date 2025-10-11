package internal

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"real-time-forum/internal/db"
	sessionDB "real-time-forum/internal/db/session"
	"real-time-forum/internal/db/users"
	"real-time-forum/internal/utils"
	"time"

	"github.com/google/uuid"
)

type PayloadUser struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type PayloadLogin struct {
	AuthUser string `json:"authvalue"`
	Password string `json:"password"`
}

func (app *App) Login(w http.ResponseWriter, r *http.Request) {

	b, err := io.ReadAll(r.Body)

	if err != nil {
		utils.BadRequest(w, errors.New("invalid payload"))
		return
	}
	_ = r.Body.Close()

	var p PayloadLogin

	if err := json.NewDecoder(bytes.NewReader(b)).Decode(&p); err != nil {
		utils.BadRequest(w, errors.New("invalid payload"))
		return
	}

	store := db.New(app.DB)

	inputs := map[string][]interface{}{
		"authvalue": {"required", "string", func(v interface{}) error {
			authValue, _ := v.(string)
			_, err := store.Users.GetUserOr(r.Context(), users.GetUserOrParams{Email: authValue, Username: authValue})
			switch {
			case err == nil:
				return nil
			case errors.Is(err, sql.ErrNoRows):
				return errors.New("wrong credentials")
			default:
				return errors.New("temporary error checking email")
			}
		}},
		"password": {"required", "string"},
	}

	ok, errs := utils.ValidateJSONFromBytes(b, inputs)

	if !ok {
		utils.Error(w, 400, "400", "validation error", errs)
		return
	}

	user, _ := store.Users.GetUserOr(r.Context(), users.GetUserOrParams{Email: p.AuthUser, Username: p.AuthUser})

	if err := utils.CompareHashAndPassword(user.Password.String, p.Password); err != nil {
		utils.Error(w, 400, "400", "validation error", "Wrong credentials")
		return
	}

	session, err := rotateSession(r.Context(), store, user.Uuid, 24*time.Hour)

	if err != nil {
		utils.Internal(w, errors.New("internal Server error"))
	}

	utils.OK(w, map[string]string{"token": session.Token, "username": user.Username.(string), "expires": session.Expiresat.String(), "uuid": user.Uuid})

}

func (app *App) Register(w http.ResponseWriter, r *http.Request) {

	b, err := io.ReadAll(r.Body)
	if err != nil {
		utils.BadRequest(w, errors.New("invalid payload"))
		return
	}
	_ = r.Body.Close()

	// 2) Decode into struct once (typed payload)
	var p PayloadUser
	if err := json.NewDecoder(bytes.NewReader(b)).Decode(&p); err != nil {
		utils.BadRequest(w, errors.New("invalid payload"))
		return
	}

	store := db.New(app.DB)

	// 3) Build rules — use func(interface{}) error closures
	inputs := map[string][]interface{}{
		"email": {
			"required", "string", "email",
			func(v interface{}) error {
				email, _ := v.(string)
				_, err := store.Users.GetUserByEmail(r.Context(), email)
				switch {
				case err == nil:
					return errors.New("email already exists")
				case errors.Is(err, sql.ErrNoRows):
					return nil
				default:
					return errors.New("temporary error checking email")
				}
			},
		},
		"username": {
			"required", "string", "min:3", "max:32",
			func(v interface{}) error {
				username, _ := v.(string)
				_, err := store.Users.GetUserByUsername(r.Context(), username)
				switch {
				case err == nil:
					return errors.New("username already exists")
				case errors.Is(err, sql.ErrNoRows):
					return nil
				default:
					return errors.New("temporary error checking username")
				}
			},
		},
		"password":         {"required", "string", "min:8"},
		"confirm_password": {"required", "string", "same:password"},
	}

	// 4) Validate using the same bytes (no second read of r.Body)
	ok, errs := utils.ValidateJSONFromBytes(b, inputs)
	if !ok {
		utils.Error(w, 400, "400", "validation error", errs)
		return
	}

	id := uuid.New().String()
	hashed, _ := utils.HashPassword(p.Password)

	user, err := store.Users.CreateUser(r.Context(), users.CreateUserParams{
		Uuid:      id,
		Username:  p.Username,
		Email:     p.Email,
		Password:  sql.NullString{String: hashed, Valid: hashed != ""},
		Createdat: time.Now(),
	})

	if err != nil {
		utils.Internal(w, errors.New("internal Server error"))
		return
	}

	utils.OK(w, user)
}

func rotateSession(ctx context.Context, store *db.Store, userID string, ttl time.Duration) (sessionDB.Session, error) {

	// 1) Delete existing sessions for this user (idempotent)
	if err := store.SessionDB.DeleteSessionUser(ctx, userID); err != nil {
		return sessionDB.Session{}, err
	}

	// 2) Create a fresh session
	token, err := utils.GenerateToken(32)
	if err != nil {
		return sessionDB.Session{}, err
	}
	sess, err := store.SessionDB.CreateSession(ctx, sessionDB.CreateSessionParams{
		Token:     token,
		Expiresat: time.Now().Add(ttl),
		Userid:    userID,
	})
	if err != nil {
		return sessionDB.Session{}, err
	}

	return sess, nil
}
