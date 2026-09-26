package models

import "time"

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"passwordHash"`
	CreatedAt    time.Time `json:"createdAt"`
}

type Endpoint struct {
	ID            string        `json:"id"`
	Method        string        `json:"method"`
	Path          string        `json:"path"`
	StatusCode    int           `json:"statusCode"`
	RequireAuth   bool          `json:"requireAuth"`
	Description   string        `json:"description"`
	Response      interface{}   `json:"response"`
	RequestSchema []SchemaField `json:"requestSchema,omitempty"`
	CreatedBy     string        `json:"createdBy"`
	CreatedAt     time.Time     `json:"createdAt"`
	UpdatedAt     time.Time     `json:"updatedAt"`
}

// SchemaField describes one expected field of an incoming request body, used
// to validate requests against user-defined endpoints before the configured
// mock response is returned.
type SchemaField struct {
	Name     string `json:"name"`
	Type     string `json:"type"` // string, number, boolean, object, array, null, any (default)
	Required bool   `json:"required"`
}
