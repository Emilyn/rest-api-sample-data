package authutil

import (
	"context"
	"net/http"
	"strings"

	"rest-api-sample-data/backend/internal/httpx"
)

type ctxKey string

const claimsKey ctxKey = "claims"

// BearerClaims extracts and verifies the "Authorization: Bearer <token>" header.
// It returns ok=false and writes a 401 JSON error if missing or invalid.
func BearerClaims(w http.ResponseWriter, r *http.Request) (*Claims, bool) {
	header := r.Header.Get("Authorization")
	scheme, token, found := strings.Cut(header, " ")
	if !found || scheme != "Bearer" || token == "" {
		httpx.WriteError(w, http.StatusUnauthorized, "Missing or malformed Authorization header. Expected: Bearer <token>")
		return nil, false
	}
	claims, err := VerifyToken(token)
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid or expired token")
		return nil, false
	}
	return claims, true
}

// RequireAuth wraps a handler, rejecting requests without a valid bearer token
// and attaching the parsed claims to the request context.
func RequireAuth(next func(w http.ResponseWriter, r *http.Request, claims *Claims)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := BearerClaims(w, r)
		if !ok {
			return
		}
		ctx := context.WithValue(r.Context(), claimsKey, claims)
		next(w, r.WithContext(ctx), claims)
	}
}
