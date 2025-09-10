package internal

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"real-time-forum/internal/db"
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

func (app *App) Login(w http.ResponseWriter, r *http.Request) {
	// excecute := users.New(app.DB)
	utils.ResponseBuilder(w, 401, utils.ResponseData{
		Error: map[string]string{"message": "Unauthorized"},
		Data: &users.User{
			Uuid: "jhagdjhsagjhdgsajh",
		},
		Paginate: struct{}{},
	}, app.Logger)
}

func (app *App) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1) Read body once
	b, err := io.ReadAll(r.Body)
	if err != nil {
		utils.ResponseBuilder(w, http.StatusBadRequest, utils.ResponseData{
			Error: map[string]any{"message": "failed to read body"},
		}, app.Logger)
		return
	}
	_ = r.Body.Close()

	// 2) Decode into struct once (typed payload)
	var p PayloadUser
	if err := json.NewDecoder(bytes.NewReader(b)).Decode(&p); err != nil {
		utils.ResponseBuilder(w, http.StatusBadRequest, utils.ResponseData{
			Error: map[string]any{"message": "Invalid payload"},
		}, app.Logger)
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
					return nil // ok, unique
				default:
					// unexpected DB error: return a generic message or bubble up
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
		utils.ResponseBuilder(w, http.StatusBadRequest, utils.ResponseData{
			Error: errs,
		}, app.Logger)
		return
	}

	// 5) Create user
	id := uuid.New().String()
	hashed, _ := utils.HashPassword(p.Password)

	user, err := store.Users.CreateUser(r.Context(), users.CreateUserParams{
		Uuid:      id,
		Username:  p.Username,
		Email:     p.Email,
		Password:  sql.NullString{String: hashed, Valid: hashed != ""}, // or change field to string if NOT NULL
		Createdat: time.Now(),
	})
	if err != nil {
		utils.ResponseBuilder(w, http.StatusBadRequest, utils.ResponseData{
			Error: map[string]any{"message": err.Error()},
		}, app.Logger)
		return
	}

	// 6) Success (use 201)
	utils.ResponseBuilder(w, http.StatusCreated, utils.ResponseData{
		Data: user,
	}, app.Logger)
}
