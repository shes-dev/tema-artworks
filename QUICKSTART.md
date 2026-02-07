# Quick Start Guide

## TL;DR — Get running in a few minutes

**Prerequisites:** Node.js (v16+) and npm; MongoDB (local or Docker).

**Paths:** Backend lives in `nodejs/server`, frontend in `nodejs/client`.

---

## Prerequisites check

```bash
node --version   # v16+
npm --version
mongosh          # optional; should connect if MongoDB is running
```

---

## 1. Setup (first time only)

**Database (optional)**

From the repo root, start MongoDB with Docker:

```bash
docker compose up -d
```

**Backend**

```bash
cd nodejs/server
npm install
cp .env.example .env
```

Edit `nodejs/server/.env` as needed. At minimum: `PORT`, `MONGODB_URI`, `DB_NAME`. Project-specific variables (e.g. LLM, API keys) are documented in `.env.example`.

**Frontend**

```bash
cd nodejs/client
npm install
```

---

## 2. Run (every time)

**Terminal 1 — Backend**

```bash
cd nodejs/server
npm run dev
```

Backend running at http://localhost:5000

**Terminal 2 — Frontend**

```bash
cd nodejs/client
npm run dev
```

Frontend running at http://localhost:3000 (or the port shown by Vite).

---

## 3. Backend scripts and tests (optional)

From `nodejs/server`:

- **DB / schema:** `npm run dev:db`, `npm run dev:schema`, `npm run dev:upsert`
- **Jest:** `npm test` (unit, DAL, pipeline tests)
- **Backend E2E:** `npm run test:backend-e2e` (run from another terminal; server must be running)

See [docs/TESTING.md](docs/TESTING.md) for full testing layout.

---

## Common issues

**MongoDB not running?**

- Start it with `docker compose up -d` from the repo root (see [docker-compose.yml](docker-compose.yml)), or
- Windows: Start MongoDB service from Services  
- Mac: `brew services start mongodb-community`  
- Linux: `sudo systemctl start mongodb`

**Port already in use?**

- Change `PORT` in `nodejs/server/.env` (e.g. to 5001).
- If the frontend calls the backend by URL, update the frontend API base URL to match.

**CORS errors?**

- Ensure both backend and frontend are running and that the frontend is configured to use the correct backend URL.

---

## Included vs customize

**Included** — Runnable backend and frontend, MongoDB connection, and optional schema/DB scripts. Use this repo as a base for your own API and UI.

**Customize** — Add your own routes, data models, and features. Authentication and advanced tooling are left to the project.
