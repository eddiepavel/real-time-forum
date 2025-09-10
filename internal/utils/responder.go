package utils

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type ResponseData struct {
	Error    interface{} `json:"error"`
	Data     interface{} `json:"data"`
	Paginate interface{} `json:"paginate"`
}

func ResponseBuilder(w http.ResponseWriter, status int, response ResponseData, l *slog.Logger) {
	jsonStr, err := json.Marshal(response)
	if err != nil {
		l.Info("Failed to create response")
	}
	w.Write(jsonStr)
}
