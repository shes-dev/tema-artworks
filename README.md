# Artworks Display

**For the shortest path to a running app, see [QUICKSTART.md](QUICKSTART.md).**

## Features

- **Backend** — Express + TypeScript API, MongoDB connection, optional scripts for DB connectivity, schema checks, and persistence behavior
- **API-first daily artwork** — `GET /daily-artwork` returns one flat MET-backed daily card payload for external consumers such as Ahi News
- **Health and auth** — `GET /healthz` for process smoke checks, `x-tema-api-key` + `TEMA_API_KEY` for server-to-server protection on `GET /daily-artwork`
- **Frontend** — React + Vite app that talks to the backend API
- **Database** — MongoDB (local or via Docker)

## Tech Stack

- **Frontend:** React 18, Vite, Axios
- **Backend:** Node.js 16+, Express, TypeScript, MongoDB driver
- **Database:** MongoDB (local instance or [Docker](docker-compose.yml))

## Project Structure

```
repo/
├── docker-compose.yml          # Dev-only MongoDB service
├── docker-compose.api.yml      # Backend API + private Mongo deployment stack
├── QUICKSTART.md               # Shortest setup and run
├── README.md
├── docs/DOCKER_API_DEPLOYMENT.md
└── nodejs/
    ├── client/                 # React frontend
    │   ├── src/
    │   │   ├── api/            # API integration
    │   │   ├── components/
    │   │   ├── pages/
    │   │   └── styles/
    │   ├── index.html
    │   ├── package.json
    │   └── vite.config.js
    └── server/                 # Express backend
        ├── .env.api.example    # Example env file for API compose deployment
        ├── .dockerignore       # Backend Docker build context exclusions
        ├── Dockerfile          # Backend API image build
        ├── app.ts              # API entry
        ├── db/                 # MongoDB connection
        ├── dal/                # Data access
        ├── models/             # Data models
        ├── routes/
        ├── scripts/            # Optional DB/schema scripts
        ├── services/
        ├── package.json
        └── tsconfig.json
```

## Prerequisites

- **Node.js** (v16 or higher) and npm
- **MongoDB** (v4.4 or higher), or use Docker (see below)

### Installing MongoDB

**Option A — Docker (from repo root):**

```bash
docker compose up -d
```

**Option B — Local install:**

- **Windows:** Download from [mongodb.com](https://www.mongodb.com/try/download/community), run installer, MongoDB runs as a service
- **macOS (Homebrew):** `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
- **Linux (Ubuntu/Debian):** `sudo apt-get install mongodb && sudo systemctl start mongodb`

Verify:

```bash
mongosh
```

## Setup

### Backend

```bash
cd nodejs/server
npm install
cp .env.example .env
```

Edit `nodejs/server/.env`: set `PORT`, `MONGODB_URI`, `DB_NAME`, and `TEMA_API_KEY`. Other project-specific variables are documented in `.env.example`.

### Frontend

```bash
cd nodejs/client
npm install
```

## Run

**Terminal 1 — Backend:**

```bash
cd nodejs/server
npm run dev
```

Backend running at http://localhost:5000

**Terminal 2 — Frontend:**

```bash
cd nodejs/client
npm run dev
```

Frontend running at http://localhost:3000 (or the port Vite shows).

## Access

Open http://localhost:3000 in your browser. The frontend uses the backend API; extend with your own flows and data models.

## API endpoints

- `GET /daily-artwork?date_key=YYYY-MM-DD`
  - requires header `x-tema-api-key`
  - returns a flat daily artwork payload with MET-backed metadata
  - if `date_key` is omitted, the server uses the current Jerusalem-local date
- `GET /healthz`
  - no auth required
  - returns a small process-health JSON payload for Docker/Nginx smoke checks

## Docker API deployment

For the backend-only Docker deployment assets used by the upcoming EC2/Nginx task, see [docs/DOCKER_API_DEPLOYMENT.md](docs/DOCKER_API_DEPLOYMENT.md).

Key points:

- `docker-compose.yml` remains the dev-only Mongo helper
- `docker-compose.api.yml` is the separate backend API deployment stack
- API bind target is `127.0.0.1:3020:5000`
- Mongo is private to Docker networking only

## Troubleshooting

### MongoDB connection refused

- Ensure MongoDB is running (`mongosh` or `docker compose up -d` from repo root)
- Check that MongoDB is on port 27017
- Verify `MONGODB_URI` in `nodejs/server/.env`

### Port already in use

- Change `PORT` in `nodejs/server/.env` (e.g. to 5001)
- If the frontend calls the backend by URL, update the frontend API base URL (or client API config) to match

### CORS errors

- Ensure both backend and frontend are running
- Confirm the frontend is configured to use the correct backend URL

### Node / npm issues

```bash
cd nodejs/server
rm -rf node_modules package-lock.json
npm install
```

## Included vs customize

**Included** — Runnable backend and frontend, MongoDB connection, and optional backend scripts. From `nodejs/server`: **tests** — `npm test` (Jest), `npm run test:backend-e2e`, `npm run verify-met-read` (JS, HTTP-only; see [docs/TESTING.md](docs/TESTING.md)); **dev scripts** — `npm run dev:db`, `npm run dev:schema`, `npm run dev:upsert`, etc. **Import API:** POST /import/met accepts `objectIds` or `demo: true` (deterministic 10-object pull). **Daily API:** GET /daily-artwork selects deterministically from a curated MET seed list and lazily imports the chosen record when it is missing locally. **Main project plan:** MET Import Validation Layer (v1); see [AGENTS.md](AGENTS.md) for links. Use this repo as a base for your own API and UI.

**Customize** — Add your own routes, data models, and features. Authentication and advanced tooling are left to the project. The backend may seed or initialize data on first run; replace or extend with your own logic.
