# Mock API Builder

Build your own mock REST API through a web UI: register/log in, then define
endpoints (method + path + status code + JSON response body), optionally
requiring a JWT to access them.

- **backend/** — Go API server (net/http, no framework). JSON-file storage.
- **frontend/** — Vite + React + shadcn/ui dashboard.

## Run it

Backend (default port 9800, override with `PORT=...`):

```
cd backend
go run .
```

Frontend (Vite dev server, default port 5173):

```
cd frontend
npm install   # first time only
npm run dev
```

Open http://localhost:5173, register an account, and start adding endpoints.

## How it works

- `POST /api/auth/register` / `POST /api/auth/login` issue a JWT.
- `GET/POST/PUT/DELETE /api/endpoints` (all require your JWT) manage your endpoint definitions.
- Any other request is matched against your saved endpoints and returns the JSON you
  configured, with the status code you set. Paths support params like `/users/:id`.
  Endpoints marked "auth required" need `Authorization: Bearer <token>`.
- A `/companies` endpoint is preloaded from `db.json` on first run so there's something
  to try immediately.

Data (users, endpoint definitions, JWT secret) is stored as JSON files under
`backend/data/`, which is gitignored.
