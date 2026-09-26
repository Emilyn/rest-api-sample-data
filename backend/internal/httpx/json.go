package httpx

import (
	"encoding/json"
	"net/http"
)

const MaxBodyBytes = 10 << 20 // 10MB, mirrors the frontend's tolerance for large response bodies

func WriteJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func WriteError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]string{"error": message})
}

func WriteErrors(w http.ResponseWriter, status int, messages []string) {
	WriteJSON(w, status, map[string][]string{"errors": messages})
}

func DecodeJSON(w http.ResponseWriter, r *http.Request, dst interface{}) bool {
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(dst); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid JSON body: "+err.Error())
		return false
	}
	return true
}
