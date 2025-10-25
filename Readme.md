# Real-time Forum (SPA)

Lightweight single-page forum with real-time private messaging and infinite-post loading.

## Key highlights
- True SPA: frontend is a single-page app served from `public/` and driven by vanilla JS.
- Real-time messaging via Gorilla WebSocket on the backend and a lightweight WebSocket client in `public/socket.js` ([open file](public/socket.js)).
- Frontend async flows use Promises; backend concurrency uses goroutines for socket handling and DB work.
- SQL layer generated with sqlc for type-safe DB access.
- Styling via Tailwind CSS.
- Debounce usage for avoiding to spam from seamless infinite scroll techniques.

## Quick links
- Frontend main logic: [public/main.js](public/main.js)
- WebSocket client and chat UI: [public/socket.js](public/socket.js)
- This file: [Readme.md](Readme.md)

## Tech stack
- Go backend (goroutines) with Gorilla WebSocket (`github.com/gorilla/websocket`)
- sqlc for DB codegen (SQLite)
- Tailwind CSS for utility-first styling(Tailwind 4.0 CLI)
- Vanilla JS SPA using Promises for async flows and WebSocket for realtime updates
- Static assets served from `public/`

### Getting started (dev)
1. Prerequisites
   - Go 1.20+
   - Node/npm (for Tailwind build if used)
   - Postgres
   - sqlc (install from https://sqlc.dev)

2. Database
   - Create your Postgres DB and set env vars (e.g. DATABASE_URL).
   - Define SQL queries and run `sqlc generate` to produce typed DB code.

3. Build & run backend
   - go build ./...
   - Run the binary (it will serve static `public/` and WS endpoint)

4. Frontend
   - Static files live under `public/` (see [public/main.js](public/main.js) and [public/socket.js](public/socket.js)).
   - If you use Tailwind locally: run your Tailwind build pipeline (npm scripts).

## Team
- Pavlos Kerasidis
- Giorgos Pavrianidis
- Giannis Georgakopoulos
- Edouardos Pavel
