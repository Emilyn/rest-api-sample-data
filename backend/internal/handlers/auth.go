package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"rest-api-sample-data/backend/internal/authutil"
	"rest-api-sample-data/backend/internal/httpx"
	"rest-api-sample-data/backend/internal/models"
	"rest-api-sample-data/backend/internal/store"
)

type credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func loadUsers() ([]models.User, error) {
	return store.ReadJSON("users", []models.User{})
}

func findUser(users []models.User, username string) *models.User {
	for i := range users {
		if strings.EqualFold(users[i].Username, username) {
			return &users[i]
		}
	}
	return nil
}

func Register(w http.ResponseWriter, r *http.Request) {
	var body credentials
	if !httpx.DecodeJSON(w, r, &body) {
		return
	}
	if body.Username == "" || body.Password == "" {
		httpx.WriteError(w, http.StatusBadRequest, "username and password are required")
		return
	}
	if len(body.Password) < 6 {
		httpx.WriteError(w, http.StatusBadRequest, "password must be at least 6 characters")
		return
	}

	users, err := loadUsers()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if findUser(users, body.Username) != nil {
		httpx.WriteError(w, http.StatusConflict, "username already taken")
		return
	}

	hash, err := authutil.HashPassword(body.Password)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	user := models.User{
		ID:           uuid.NewString(),
		Username:     body.Username,
		PasswordHash: hash,
		CreatedAt:    time.Now(),
	}
	users = append(users, user)
	if err := store.WriteJSON("users", users); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	token, err := authutil.SignToken(user.ID, user.Username)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, map[string]interface{}{
		"token": token,
		"user":  map[string]string{"id": user.ID, "username": user.Username},
	})
}

func Login(w http.ResponseWriter, r *http.Request) {
	var body credentials
	if !httpx.DecodeJSON(w, r, &body) {
		return
	}
	if body.Username == "" || body.Password == "" {
		httpx.WriteError(w, http.StatusBadRequest, "username and password are required")
		return
	}

	users, err := loadUsers()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	user := findUser(users, body.Username)
	if user == nil || !authutil.CheckPassword(user.PasswordHash, body.Password) {
		httpx.WriteError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}

	token, err := authutil.SignToken(user.ID, user.Username)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user":  map[string]string{"id": user.ID, "username": user.Username},
	})
}

func Me(w http.ResponseWriter, r *http.Request, claims *authutil.Claims) {
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"id": claims.Sub, "username": claims.Username})
}
