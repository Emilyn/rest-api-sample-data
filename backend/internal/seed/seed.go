package seed

import (
	"encoding/json"
	"os"
	"time"

	"rest-api-sample-data/backend/internal/models"
	"rest-api-sample-data/backend/internal/store"
)

// dbJSONPath points at the sample data file, since the seed only needs to
// run once to populate data/endpoints.json.
const dbJSONPath = "db.json"

// Run preloads a public /companies endpoint from db.json the first time the
// server starts, without clobbering endpoints the user has already edited.
func Run() {
	if store.Exists("endpoints") {
		return
	}

	var companies []interface{}
	if raw, err := os.ReadFile(dbJSONPath); err == nil {
		var db map[string]json.RawMessage
		if err := json.Unmarshal(raw, &db); err == nil {
			if companiesRaw, ok := db["companies"]; ok {
				json.Unmarshal(companiesRaw, &companies)
			}
		}
	}

	now := time.Now()
	endpoints := []models.Endpoint{
		{
			ID:          "seed-companies",
			Method:      "GET",
			Path:        "/companies",
			StatusCode:  200,
			RequireAuth: false,
			Description: "Preloaded from db.json",
			Response:    companies,
			CreatedBy:   "seed",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}

	_ = store.WriteJSON("endpoints", endpoints)
}
