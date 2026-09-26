package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"rest-api-sample-data/backend/internal/authutil"
	"rest-api-sample-data/backend/internal/httpx"
	"rest-api-sample-data/backend/internal/models"
	"rest-api-sample-data/backend/internal/store"
)

var validMethods = map[string]bool{
	"GET": true, "POST": true, "PUT": true, "PATCH": true, "DELETE": true,
}

var validSchemaTypes = map[string]bool{
	"string": true, "number": true, "boolean": true, "object": true, "array": true, "null": true, "any": true,
}

func loadEndpoints() ([]models.Endpoint, error) {
	return store.ReadJSON("endpoints", []models.Endpoint{})
}

func saveEndpoints(eps []models.Endpoint) error {
	return store.WriteJSON("endpoints", eps)
}

func normalizePath(p string) string {
	if !strings.HasPrefix(p, "/") {
		p = "/" + p
	}
	trimmed := strings.TrimRight(p, "/")
	if trimmed == "" {
		return "/"
	}
	return trimmed
}

type endpointPayload struct {
	Method      *string     `json:"method"`
	Path        *string     `json:"path"`
	StatusCode  *int        `json:"statusCode"`
	RequireAuth *bool       `json:"requireAuth"`
	Response    interface{} `json:"response"`
	// ResponseSet distinguishes "response omitted" from "response explicitly null".
	ResponseSet   bool                  `json:"-"`
	Description   *string               `json:"description"`
	RequestSchema *[]models.SchemaField `json:"requestSchema"`
}

func decodeEndpointPayload(w http.ResponseWriter, r *http.Request) (endpointPayload, bool) {
	var raw map[string]json.RawMessage
	if !httpx.DecodeJSON(w, r, &raw) {
		return endpointPayload{}, false
	}
	var payload endpointPayload
	if v, ok := raw["method"]; ok {
		json.Unmarshal(v, &payload.Method)
	}
	if v, ok := raw["path"]; ok {
		json.Unmarshal(v, &payload.Path)
	}
	if v, ok := raw["statusCode"]; ok {
		json.Unmarshal(v, &payload.StatusCode)
	}
	if v, ok := raw["requireAuth"]; ok {
		json.Unmarshal(v, &payload.RequireAuth)
	}
	if v, ok := raw["description"]; ok {
		json.Unmarshal(v, &payload.Description)
	}
	if v, ok := raw["response"]; ok {
		payload.ResponseSet = true
		json.Unmarshal(v, &payload.Response)
	}
	if v, ok := raw["requestSchema"]; ok {
		json.Unmarshal(v, &payload.RequestSchema)
	}
	return payload, true
}

// applyPayload validates fields present in payload and merges them onto base.
// When partial is false, method/path/response are required.
func applyPayload(base models.Endpoint, payload endpointPayload, partial bool) (models.Endpoint, []string) {
	var errs []string
	out := base

	if payload.Method != nil {
		m := strings.ToUpper(*payload.Method)
		if !validMethods[m] {
			errs = append(errs, "method must be one of GET, POST, PUT, PATCH, DELETE")
		} else {
			out.Method = m
		}
	} else if !partial {
		errs = append(errs, "method must be one of GET, POST, PUT, PATCH, DELETE")
	}

	if payload.Path != nil {
		if *payload.Path == "" {
			errs = append(errs, "path is required, e.g. /users/:id")
		} else {
			out.Path = normalizePath(*payload.Path)
		}
	} else if !partial {
		errs = append(errs, "path is required, e.g. /users/:id")
	}

	if payload.StatusCode != nil {
		if *payload.StatusCode < 100 || *payload.StatusCode > 599 {
			errs = append(errs, "statusCode must be an integer between 100 and 599")
		} else {
			out.StatusCode = *payload.StatusCode
		}
	} else if !partial {
		out.StatusCode = 200
	}

	if payload.RequireAuth != nil {
		out.RequireAuth = *payload.RequireAuth
	}

	if payload.ResponseSet {
		out.Response = payload.Response
	} else if !partial {
		errs = append(errs, "response is required (any valid JSON value)")
	}

	if payload.Description != nil {
		out.Description = *payload.Description
	}

	if payload.RequestSchema != nil {
		for _, f := range *payload.RequestSchema {
			if strings.TrimSpace(f.Name) == "" {
				errs = append(errs, "requestSchema fields must have a name")
				break
			}
			if f.Type != "" && !validSchemaTypes[f.Type] {
				errs = append(errs, "requestSchema type must be one of string, number, boolean, object, array, null, any")
				break
			}
		}
		out.RequestSchema = *payload.RequestSchema
	}

	return out, errs
}

func ListEndpoints(w http.ResponseWriter, r *http.Request, _ *authutil.Claims) {
	eps, err := loadEndpoints()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, eps)
}

func CreateEndpoint(w http.ResponseWriter, r *http.Request, claims *authutil.Claims) {
	payload, ok := decodeEndpointPayload(w, r)
	if !ok {
		return
	}
	merged, errs := applyPayload(models.Endpoint{}, payload, false)
	if len(errs) > 0 {
		httpx.WriteErrors(w, http.StatusBadRequest, errs)
		return
	}

	eps, err := loadEndpoints()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	for _, e := range eps {
		if e.Method == merged.Method && e.Path == merged.Path {
			httpx.WriteError(w, http.StatusConflict, merged.Method+" "+merged.Path+" already exists")
			return
		}
	}

	now := time.Now()
	merged.ID = uuid.NewString()
	merged.CreatedBy = claims.Username
	merged.CreatedAt = now
	merged.UpdatedAt = now

	eps = append(eps, merged)
	if err := saveEndpoints(eps); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, merged)
}

func UpdateEndpoint(w http.ResponseWriter, r *http.Request, _ *authutil.Claims) {
	id := r.PathValue("id")
	eps, err := loadEndpoints()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	idx := -1
	for i, e := range eps {
		if e.ID == id {
			idx = i
			break
		}
	}
	if idx == -1 {
		httpx.WriteError(w, http.StatusNotFound, "endpoint not found")
		return
	}

	payload, ok := decodeEndpointPayload(w, r)
	if !ok {
		return
	}
	merged, errs := applyPayload(eps[idx], payload, true)
	if len(errs) > 0 {
		httpx.WriteErrors(w, http.StatusBadRequest, errs)
		return
	}

	for i, e := range eps {
		if i != idx && e.Method == merged.Method && e.Path == merged.Path {
			httpx.WriteError(w, http.StatusConflict, merged.Method+" "+merged.Path+" already exists")
			return
		}
	}

	merged.UpdatedAt = time.Now()
	eps[idx] = merged
	if err := saveEndpoints(eps); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, merged)
}

func DeleteEndpoint(w http.ResponseWriter, r *http.Request, _ *authutil.Claims) {
	id := r.PathValue("id")
	eps, err := loadEndpoints()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	idx := -1
	for i, e := range eps {
		if e.ID == id {
			idx = i
			break
		}
	}
	if idx == -1 {
		httpx.WriteError(w, http.StatusNotFound, "endpoint not found")
		return
	}
	removed := eps[idx]
	eps = append(eps[:idx], eps[idx+1:]...)
	if err := saveEndpoints(eps); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, removed)
}
