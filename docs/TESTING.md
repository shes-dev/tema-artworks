# Testing strategy

How testing is organized and what to run when.

---

## Jest tests (Phase 7)

Run from `nodejs/server`: **`npm test`**.

Layout:

- **tests/unit/** — No DB, no network. Pure logic only.
- **tests/dal/** — Real Mongo (test DB or default). Clean up between tests.
- **tests/pipeline/** — Mock DAL and mock source; no Mongo, no network.

### What is unit tested (no DB, no network)

- **validateMetRaw** (`tests/unit/validateMetRaw.test.ts`): Valid MET payload → `status: "ok"`; missing `objectID` → `invalid`; malformed/partial → `partial`; no exceptions; raw input unchanged.
- **normalizeMetArtwork** (`tests/unit/normalizeMetArtwork.test.ts`): Field mapping (artistDisplayName → artistName, primaryImage → images.primary, additionalImages → images.additional); tags from department/culture; optional date parsing; raw input unchanged.
- **fetchMetObject** (`tests/unit/fetchMetObject.test.ts`): HTTP is **mocked** (global fetch). Asserts JSON returned, URL called, and throws on non-ok or non-JSON response. Type remains unknown; no validation or normalization in this test.

### What uses real Mongo

- **MongoArtworkDAL** (`tests/dal/mongodbArtworkDAL.test.ts`): Uses a real Mongo instance (e.g. `MONGODB_URI` / `DB_NAME` or defaults). Tests: first persist inserts, second persist with same (source, sourceObjectId) updates; exactly one document; `metadata.importedAt` set/updated; `metadata.version` preserved; `findBySourceId`; `findCollectionPage` (pagination, tags filter); `findLastImportedObjectIds` (order by importedAt desc, limit, empty source). Clean up after each test. Requires Mongo running (e.g. Docker).

### What is mocked

- **Pipeline test** (`tests/pipeline/importArtwork.test.ts`): Mock `IArtworkSource` (returns fixed raw) and mock `IArtworkDAL` (persist returns doc as-is). Full pipeline runs end-to-end; DAL called exactly once; returned document has source, sourceObjectId, raw, normalized, validation, metadata; raw payload unchanged. No Mongo, no network.

---

## scripts/ vs tests/

- **Policy (JS-only):** Backend **test** and **verify** scripts are plain JavaScript and interact with the backend **only via HTTP** (no ts-node, no loaders, no in-process imports). See `.cursor/skills/backend-testing-js-only/SKILL.md`.
- **scripts/** — **test:backend-e2e** and **verify-met-read** are JS, HTTP-only (`node scripts/*.js`). **dev:*** scripts are TypeScript, run with ts-node, for local invariant checks (Mongo ping, schema, pipeline stages); they are not part of the JS-only test policy.
- **tests/** — Jest suites: unit (validate, normalize, fetch with mock), DAL (MongoArtworkDAL with real Mongo), pipeline (importArtwork with mock source and mock DAL). Existing exam-system tests remain in `tests/phase1-DALs`, `phase2-services`, `phase3-controllers,routes`.

---

## Scripts (nodejs/server)

**Test/verify (JS, HTTP-only — aligned with backend-testing-js-only skill):**

| Script | npm script | Purpose |
|--------|------------|--------|
| testBackendE2E.js | test:backend-e2e | Backend E2E: POST /import/met (with objectIds) → poll GET /collection/met/:id → assert GET /collection. Server must be running. Demo mode can be exercised by POST /import/met with body `{ "demo": true }` (server selects 10 IDs deterministically: 2 stable, 8 new). |
| verifyMetRead.js | verify-met-read | Phase 8: fetch expected from MET API → POST /import/met → poll GET /collection/met/:id → assert normalized matches MET. Server must be running. |

**Dev (TS, in-process — for local checks only):**

| Script | npm script | Purpose |
|--------|------------|--------|
| testMongoConnection.ts | dev:db | Mongo ping. |
| testArtworkSchema.ts | dev:schema | ArtworkDocumentSchema accepts valid document. |
| testArtworkUpsert.ts | dev:upsert | Upsert idempotency (one doc per source + sourceObjectId). |
| testArtworkDAL.ts | dev:artwork-dal | MongoArtworkDAL: persist twice, one doc, updated tags/importedAt. |
| testFetchMetObject.ts | dev:fetch | Stage 1: fetch returns object with objectID (network). |
| testValidateMetRaw.ts | dev:validate | Stage 2: ok / invalid / partial; raw unchanged. |
| testNormalizeMetArtwork.ts | dev:normalize | Stage 3: field mapping and raw immutability. |
| testImportMetArtwork.ts | dev:import-orchestration | Orchestration: fake DAL, persist once, canonical document (network). |

Run from `nodejs/server`: **`npm test`** (Jest), **`npm run test:backend-e2e`**, **`npm run verify-met-read`**; or **`npm run dev:<name>`** for TS scripts.

---

## How to test each pipeline stage

- **Stage 1 (fetch):** Jest unit test mocks HTTP; or `npm run dev:fetch` (network). Asserts JSON returned / objectID present.
- **Stage 2 (validate):** Jest `tests/unit/validateMetRaw.test.ts` or `npm run dev:validate`. No network. Asserts valid → ok, no objectID → invalid, bad optional → partial; raw reference unchanged.
- **Stage 3 (normalize):** Jest `tests/unit/normalizeMetArtwork.test.ts` or `npm run dev:normalize`. No network. Asserts artistName, images.primary/additional, tags, and that raw is not mutated.
- **Orchestration:** Jest `tests/pipeline/importArtwork.test.ts` (mock source + mock DAL) or `npm run dev:import-orchestration` (network). Asserts persist called once and result is canonical.

---

## Phase 8 verification (read API)

GET /collection and list projection tolerate documents missing `metadata` or `metadata.importedAt` (defensive handling; no 500 for legacy data).

- **verify-met-read** (`scripts/verifyMetRead.js`): HTTP-only. Fetches expected from MET API, POSTs /import/met, polls GET /collection/met/:id, then asserts normalized (title, artistName, images.primary) matches MET. Requires server running at `BASE_URL` (default http://localhost:5000). Run: `node scripts/verifyMetRead.js`.

---

## Backend E2E (client)

- **test:backend-e2e** (`scripts/testBackendE2E.js`): Plain JavaScript only; run from **another terminal** with `node scripts/testBackendE2E.js`. Pure HTTP client: no app imports, no ts-node. Sends POST /import/met with one object ID so the **server** fetches from the MET API and persists; polls GET /collection/met/:id until 200 (or timeout); asserts single-artwork shape; then GET /collection and asserts the imported artwork appears. Demo mode: POST /import/met with `{ "demo": true }`. **Requires:** server running at `BASE_URL` (default http://localhost:5000); Mongo and MET API used by the server.

- **Phase 9 UI (manual):** Run the client (`npm run dev` from `nodejs/client`) with the server running; use Pull Collection, Review Changes, View Collection, and the More Info / AI Enrichment Result modals against real backend data. API base URL configurable via `VITE_API_URL` (see client `.env.example`).

---

## Enrich (Phase 12)

The enrich endpoint can be exercised via HTTP: **POST /collection/:source/:sourceObjectId/enrich** (e.g. after importing an artwork, POST to get suggested tags). No new Jest tests are required for Phase 12; a unit test for `suggestTagsForArtwork` with a mocked LLM is out of scope for the minimal plan.

---

## What not to test (unchanged)

- Batch imports or concurrency behavior.
- Diff logic or history.
- Unit tests for the pure demo selection helpers in isolation (demo is exercised via POST /import/met with `demo: true`).
- UI or E2E with real Mongo for the import pipeline.
- Snapshot tests or testing future behavior.
