package main

import (
	"log"
	"net/http"
	"os"

	"rest-api-sample-data/backend/internal/authutil"
	"rest-api-sample-data/backend/internal/handlers"
	"rest-api-sample-data/backend/internal/httpx"
	"rest-api-sample-data/backend/internal/seed"
)

func main() {
	seed.Run()

	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/auth/register", handlers.Register)
	mux.HandleFunc("POST /api/auth/login", handlers.Login)
	mux.HandleFunc("GET /api/auth/me", authutil.RequireAuth(handlers.Me))

	mux.HandleFunc("GET /api/endpoints", authutil.RequireAuth(handlers.ListEndpoints))
	mux.HandleFunc("POST /api/endpoints", authutil.RequireAuth(handlers.CreateEndpoint))
	mux.HandleFunc("PUT /api/endpoints/{id}", authutil.RequireAuth(handlers.UpdateEndpoint))
	mux.HandleFunc("DELETE /api/endpoints/{id}", authutil.RequireAuth(handlers.DeleteEndpoint))

	// Any other /api/* path is a management-API 404, not a candidate for a mock endpoint.
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteError(w, http.StatusNotFound, "Unknown management API route")
	})

	// Everything else is matched against user-defined mock endpoints.
	mux.HandleFunc("/", handlers.Dynamic)

	port := os.Getenv("PORT")
	if port == "" {
		port = "9800"
	}

	log.Printf("Mock API builder (Go) running at http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, handlers.WithLogging(handlers.WithCORS(mux))))
}
