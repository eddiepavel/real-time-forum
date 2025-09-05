package internal

import (
	"net/http"
)

func (app *App) Login(w http.ResponseWriter, r *http.Request) {
	// excecute := users.New(app.DB)
	w.Write([]byte("Hello"))
}

func (app *App) Login1(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Hello"))
}
