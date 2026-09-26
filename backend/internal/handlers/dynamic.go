package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"rest-api-sample-data/backend/internal/authutil"
	"rest-api-sample-data/backend/internal/httpx"
	"rest-api-sample-data/backend/internal/models"
)

// matchPath compares a stored pattern like "/users/:id" against an incoming
// request path like "/users/42". Segments in the pattern starting with ":"
// match any single path segment.
func matchPath(pattern, path string) bool {
	patternSegs := strings.Split(strings.Trim(pattern, "/"), "/")
	pathSegs := strings.Split(strings.Trim(path, "/"), "/")
	if len(patternSegs) != len(pathSegs) {
		return false
	}
	for i, seg := range patternSegs {
		if strings.HasPrefix(seg, ":") {
			continue
		}
		if seg != pathSegs[i] {
			return false
		}
	}
	return true
}

func Dynamic(w http.ResponseWriter, r *http.Request) {
	eps, err := loadEndpoints()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	for _, ep := range eps {
		if ep.Method != r.Method {
			continue
		}
		if !matchPath(ep.Path, r.URL.Path) {
			continue
		}

		if ep.RequireAuth {
			if _, ok := authutil.BearerClaims(w, r); !ok {
				return
			}
		}

		if len(ep.RequestSchema) > 0 {
			if errs := validateRequestBody(r, ep.RequestSchema); len(errs) > 0 {
				httpx.WriteErrors(w, http.StatusBadRequest, errs)
				return
			}
		}

		status := ep.StatusCode
		if status == 0 {
			status = http.StatusOK
		}
		httpx.WriteJSON(w, status, ep.Response)
		return
	}

	httpx.WriteJSON(w, http.StatusNotFound, map[string]string{
		"error": "No mock endpoint defined for " + r.Method + " " + r.URL.Path,
		"hint":  "Create it from the dashboard first.",
	})
}

// validateRequestBody checks an incoming request body against an endpoint's
// requestSchema, returning one message per field that is missing or has the
// wrong type. A body that isn't valid JSON is reported as a single error.
func validateRequestBody(r *http.Request, schema []models.SchemaField) []string {
	var body map[string]interface{}
	if r.Body != nil {
		defer r.Body.Close()
		dec := json.NewDecoder(io.LimitReader(r.Body, httpx.MaxBodyBytes))
		if err := dec.Decode(&body); err != nil && err != io.EOF {
			return []string{"request body must be valid JSON: " + err.Error()}
		}
	}
	if body == nil {
		body = map[string]interface{}{}
	}

	var errs []string
	for _, f := range schema {
		val, present := body[f.Name]
		if !present {
			if f.Required {
				errs = append(errs, fmt.Sprintf("%q is required", f.Name))
			}
			continue
		}
		if f.Type == "" || f.Type == "any" {
			continue
		}
		if !matchesSchemaType(val, f.Type) {
			errs = append(errs, fmt.Sprintf("%q must be of type %s", f.Name, f.Type))
		}
	}
	return errs
}

func matchesSchemaType(val interface{}, t string) bool {
	switch t {
	case "string":
		_, ok := val.(string)
		return ok
	case "number":
		_, ok := val.(float64)
		return ok
	case "boolean":
		_, ok := val.(bool)
		return ok
	case "array":
		_, ok := val.([]interface{})
		return ok
	case "object":
		_, ok := val.(map[string]interface{})
		return ok
	case "null":
		return val == nil
	default:
		return true
	}
}
