package authutil

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const tokenTTL = 7 * 24 * time.Hour

var secretPath = filepath.Join("data", ".jwt-secret")

var ErrInvalidToken = errors.New("invalid or expired token")

type Claims struct {
	Sub      string `json:"sub"`
	Username string `json:"username"`
	Iat      int64  `json:"iat"`
	Exp      int64  `json:"exp"`
}

func secret() ([]byte, error) {
	if data, err := os.ReadFile(secretPath); err == nil {
		return hex.DecodeString(string(data))
	}
	if err := os.MkdirAll(filepath.Dir(secretPath), 0o755); err != nil {
		return nil, err
	}
	raw := make([]byte, 48)
	if _, err := rand.Read(raw); err != nil {
		return nil, err
	}
	encoded := hex.EncodeToString(raw)
	if err := os.WriteFile(secretPath, []byte(encoded), 0o600); err != nil {
		return nil, err
	}
	return raw, nil
}

func b64(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}

func SignToken(userID, username string) (string, error) {
	key, err := secret()
	if err != nil {
		return "", err
	}
	now := time.Now()
	header := b64([]byte(`{"alg":"HS256","typ":"JWT"}`))
	payloadBytes, err := json.Marshal(Claims{
		Sub:      userID,
		Username: username,
		Iat:      now.Unix(),
		Exp:      now.Add(tokenTTL).Unix(),
	})
	if err != nil {
		return "", err
	}
	payload := b64(payloadBytes)
	signingInput := header + "." + payload
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(signingInput))
	signature := b64(mac.Sum(nil))
	return signingInput + "." + signature, nil
}

func VerifyToken(token string) (*Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, ErrInvalidToken
	}
	header, payload, signature := parts[0], parts[1], parts[2]
	signingInput := header + "." + payload

	key, err := secret()
	if err != nil {
		return nil, err
	}
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(signingInput))
	expected := mac.Sum(nil)

	got, err := base64.RawURLEncoding.DecodeString(signature)
	if err != nil {
		return nil, ErrInvalidToken
	}
	if subtle.ConstantTimeCompare(expected, got) != 1 {
		return nil, ErrInvalidToken
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return nil, ErrInvalidToken
	}
	var claims Claims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, ErrInvalidToken
	}
	if time.Now().Unix() > claims.Exp {
		return nil, ErrInvalidToken
	}
	return &claims, nil
}
