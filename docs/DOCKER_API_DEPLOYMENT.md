# Docker API deployment

Production-like Docker assets for the minimal `tema-artworks` backend API.

This is for the API-first deployment shape discussed in `tema-integration`:

- backend only
- private MongoDB
- host bind on `127.0.0.1:3020`
- public access routed later through Nginx on `80/443`

This document does **not** deploy anything to EC2. It explains the local and later-host usage of the committed Docker assets.

---

## Files

- `nodejs/server/Dockerfile` — multi-stage backend image build
- `nodejs/server/.dockerignore` — trims backend build context
- `nodejs/server/.env.api.example` — example env file for the API compose stack
- `docker-compose.api.yml` — backend + private Mongo deployment compose
- existing `docker-compose.yml` stays dev-only for Mongo on port `27017`

---

## Required env vars

Required for the API deployment:

```text
PORT
TEMA_API_KEY
MONGODB_URI
DB_NAME
```

Optional unless the enrich endpoint is used:

```text
LLM_PROVIDER
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_KEY
AZURE_OPENAI_VERSION
AZURE_OPENAI_DEPLOYMENT
OPENAI_API_KEY
OPENAI_MODEL
```

Use the committed example as a template:

```bash
cp nodejs/server/.env.api.example nodejs/server/.env.api
```

Important:

- do not commit real secret values
- `TEMA_API_KEY` in the host `nodejs/server/.env.api` must be replaced with a real secret before running the stack
- `docker-compose.api.yml` is intentionally fail-closed for `TEMA_API_KEY`; if the key is missing, Compose should fail before starting the API
- do not use the committed placeholder value in any deployed environment
- the same real secret should be configured in Ahi News as `TEMA_ARTWORKS_API_KEY`
- `MONGODB_URI` inside the API compose stack should point to the private Mongo service, not localhost
- public callers should go through Nginx later, not through raw Docker-exposed public ports

---

## Local image build

From the repo root:

```bash
docker build -f nodejs/server/Dockerfile -t tema-artworks-api:local ./nodejs/server
```

---

## Local compose run

From the repo root:

```bash
cp nodejs/server/.env.api.example nodejs/server/.env.api
docker compose --env-file nodejs/server/.env.api -f docker-compose.api.yml up -d --build
```

If `TEMA_API_KEY` is missing from `nodejs/server/.env.api`, the Compose stack should fail before starting `tema-api`.

What this does:

- builds the backend image from `nodejs/server`
- starts the API container
- starts MongoDB on a private Docker network only
- binds the API to `127.0.0.1:3020`
- does **not** publish MongoDB on a host port

Stop it with:

```bash
docker compose -f docker-compose.api.yml down
```

Stop it and remove Mongo data volume:

```bash
docker compose -f docker-compose.api.yml down -v
```

---

## Smoke tests

### Health

```bash
curl http://127.0.0.1:3020/healthz
```

Expected:

```json
{"ok":true,"service":"tema-artworks-api"}
```

### Daily artwork

Replace the placeholder API key with the value stored in `TEMA_API_KEY`:

```bash
curl -H "x-tema-api-key: REPLACE_WITH_TEMA_API_KEY" "http://127.0.0.1:3020/daily-artwork?date_key=2026-07-04"
```

Expected shape:

```json
{
  "date_key": "2026-07-04",
  "title": "...",
  "artist": "...",
  "museum": "The Metropolitan Museum of Art",
  "object_date": "...",
  "image_url": "...",
  "artwork_url": "...",
  "explanation": "...",
  "source": "met",
  "source_object_id": 0,
  "image_credit": "The Metropolitan Museum of Art"
}
```

---

## Localhost and Mongo isolation

The compose stack is intentionally shaped for the target EC2 host:

- API host bind: `127.0.0.1:3020:5000`
- MongoDB: no host `ports:` mapping at all
- backend and Mongo share only the private `tema-api-private` Docker network

This means:

- the API is reachable from the host itself
- MongoDB is reachable only from containers on the private Docker network
- public access should later be proxied by Nginx to `127.0.0.1:3020`

Do **not** add a public Mongo host port for the first deployment.

---

## EC2-oriented notes

These assets are designed for the previously documented `daily-proverb` host shape:

- keep Daily Proverb running
- do not use ports `80`, `443`, `8080`, `5433`, `7474`, `7687`, or `8000`
- prefer Nginx -> `127.0.0.1:3020`
- keep Mongo private to Docker networking
- keep restart policy `unless-stopped`

Typical later host flow:

```bash
cp nodejs/server/.env.api.example nodejs/server/.env.api
# edit nodejs/server/.env.api with real values on the host
docker compose --env-file nodejs/server/.env.api -f docker-compose.api.yml up -d --build
curl http://127.0.0.1:3020/healthz
curl -H "x-tema-api-key: REPLACE_WITH_TEMA_API_KEY" "http://127.0.0.1:3020/daily-artwork?date_key=2026-07-04"
```

On the host:

- `TEMA_API_KEY` in `nodejs/server/.env.api` must be a real secret
- Ahi News must use that same real value as `TEMA_ARTWORKS_API_KEY`
- the committed placeholder from `.env.api.example` is template-only and must never be used for deployment

Nginx, public HTTPS routing, and any host-specific app directories remain a separate deployment task.

---

## Current limitations

- this API stack still needs MongoDB because the daily endpoint reads from Mongo and lazily imports missing selected records through the existing DAL/import flow
- the first request for an uncached selected artwork may perform a live MET fetch/import
- `/healthz` is process-only; it does not verify Mongo readiness
