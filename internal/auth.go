package internal

import (
	"net/http"
	"real-time-forum/internal/db/users"
	"real-time-forum/internal/utils"
)

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
	w.Write([]byte("Hello"))
}
