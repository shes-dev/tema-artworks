# Phase ledger

Where the project is and what is done or pending. Phase and section numbering align with the **main project plan** (MET Import Validation Layer v1): `met_import_validation_layer_20917169.plan.md` (Cursor plans; Sections 1–13).

---

## Phase 1 — Infrastructure & invariants (done)

- MongoDB via Docker ([docker-compose.yml](docker-compose.yml)).
- Canonical artwork types and Zod schemas ([nodejs/server/models/Artwork.ts](nodejs/server/models/Artwork.ts)).
- Invariant test scripts:
  - `scripts/testMongoConnection.ts` — Mongo connectivity.
  - `scripts/testArtworkSchema.ts` — ArtworkDocumentSchema accepts valid document.
  - `scripts/testArtworkUpsert.ts` — Upsert idempotency (one doc per source + sourceObjectId).

---

## Phase 2 — Replaceable DAL (done)

- `IArtworkDAL` ([nodejs/server/dal/artworkDAL.types.ts](nodejs/server/dal/artworkDAL.types.ts)).
- `MongoArtworkDAL` ([nodejs/server/dal/mongodbArtworkDAL.ts](nodejs/server/dal/mongodbArtworkDAL.ts)) with upsert and `ensureIndexes()` (unique on source + sourceObjectId; normalized.tags; text index on title + tags). Indexes wired on app startup (Phase 8).
- DAL test script: `scripts/testArtworkDAL.ts` — persist twice, assert one document and updated tags/importedAt.

---

## Phase 3 — Import pipeline (done)

### File layout (nodejs/server)

- **models/** — `Artwork.ts` (canonical document + Zod schemas).
- **dal/** — `artworkDAL.types.ts` (IArtworkDAL), `mongodbArtworkDAL.ts` (Mongo implementation).
- **sources/** — `artworkSource.types.ts` (IArtworkSource), `metSource.ts` (MET fetch only).
- **services/import/** — `fetchMetObject.ts`, `metValidation.ts` (validateMetRaw), `metNormalization.ts` (normalizeMetArtwork), `importArtwork.ts` (source-agnostic pipeline entry), `importMetArtwork.ts` (MET-specific thin wrapper), `importMetArtworkBatch.ts` (batch orchestration), `demoSelection.ts` (demo-mode selection helpers only; pure functions, no validation/normalization/DAL).

### Completed

- **Stage 1:** `services/import/fetchMetObject.ts` — `fetchMetObject(objectId)`: GET Met API, return JSON as unknown.
- **Stage 2:** `services/import/metValidation.ts` — `validateMetRaw(raw)`: Zod passthrough, return `{ raw, validation }`; status ok/partial/invalid; never throw.
- **Stage 3:** `services/import/metNormalization.ts` — `normalizeMetArtwork(raw, validation)`: build ArtworkNormalized; no mutation of raw.
- **Orchestration:** `importArtwork(source, id, dal)` in `importArtwork.ts` — fetch raw → validate → normalize → persist. `importMetArtwork(objectId, dal)` in `importMetArtwork.ts` — thin wrapper: `importArtwork(new MetArtworkSource(), objectId, dal)`.
- **Batch:** `services/import/importMetArtworkBatch.ts` — loops over IDs, optional concurrency; no demo logic inside.
- **Demo helpers:** `services/import/demoSelection.ts` — `getLastImportedObjectIds(previousIds)`, `getNextMetObjectIds({ exclude, count })`, `selectMetObjectIdsForImport({ previousIds, totalCount, stableCount })`; pure, no DAL/validation/normalization.

### Optional route (implemented)

- **POST /import/met** — body `{ objectIds: number[] }` or `{ demo: true }`; response `{ jobId, status: "started" }` (202); runs `importMetArtworkBatch` asynchronously. When `demo: true`, IDs are chosen deterministically (see Phase 10). [nodejs/server/routes/import.ts](nodejs/server/routes/import.ts).

### Testing status

- **Stage 1:** `scripts/testFetchMetObject.ts` — npm: `dev:fetch` (requires network).
- **Stage 2:** `scripts/testValidateMetRaw.ts` — npm: `dev:validate` (imports from `metValidation.js`).
- **Stage 3:** `scripts/testNormalizeMetArtwork.ts` — npm: `dev:normalize` (imports from `metNormalization.js`).
- **Orchestration:** `scripts/testImportMetArtwork.ts` — npm: `dev:import-orchestration` (requires network).

All four stage/orchestration scripts runnable via npm. Backend E2E: `test:backend-e2e` (plain JS, HTTP-only; see Phase 8 and [TESTING.md](TESTING.md)).

---

## Phase 6 — Re-import & diff contract (design complete, not implemented)

Phase 6 defines the **contract for future diffing** without implementing diffing. No code changes; docs only.

### What is established

- **metadata.importedAt** — Always set on persist. Meaning: “When was this artwork last successfully ingested?” Updated on every upsert; represents freshness, not history.
- **metadata.version** — Explicit and documented. Meaning: “Which ingestion logic produced this document?” Not app version; ingestion / normalization semantics (e.g. v1, v2 for different rules).
- **No code depends on diffing** — No history collection, snapshot table, diff computation, or audit trail. Upsert + metadata is the deliberate tradeoff for now.
- **Docs state: design only** — Future diffing (history collection, snapshot-by-version, or time-based) can be added later without rewriting ingestion. Do not fake diffing: no comparing raw payloads ad hoc, no “changed” flags, no inferring deltas in UI.

### Completion

- Phase 6 is complete when importedAt and version are always set and documented, no code assumes diffing exists, and docs clearly say this is design-only. **There is nothing to test** in this phase — intentional.

---

## Phase 7 — Testing (done)

- **Jest** added; config in `nodejs/server/jest.config.cjs`. Run: `npm test` from `nodejs/server`.
- **Unit tests** (no DB, no network):
  - `tests/unit/validateMetRaw.test.ts` — valid → ok, missing objectID → invalid, partial → partial; raw unchanged; no throw.
  - `tests/unit/normalizeMetArtwork.test.ts` — field mapping, tags, optional date parsing; raw unchanged.
  - `tests/unit/fetchMetObject.test.ts` — HTTP mocked; JSON returned, type unknown; throws on non-ok / non-JSON.
- **DAL tests** (real Mongo): `tests/dal/mongodbArtworkDAL.test.ts` — persist insert/update, one doc, importedAt/version; findBySourceId; findCollectionPage (pagination, tags); findLastImportedObjectIds (order by importedAt, limit, empty source). Requires Mongo; cleanup between tests. `MongoArtworkDAL` accepts optional `getDbOverride` for testability (no ESM load in Jest).
- **Pipeline test** (mock DAL): `tests/pipeline/importArtwork.test.ts` — full pipeline, mock source + mock DAL; DAL called once; document has source, sourceObjectId, raw, normalized, validation, metadata; raw unchanged.
- **Docs:** [TESTING.md](TESTING.md) updated: what is unit tested, what uses real Mongo, what is mocked.

---

## Phase 8 — Backend Read Completion & Verification (done)

- **Read APIs** ([nodejs/server/routes/collection.ts](nodejs/server/routes/collection.ts)):
  - **GET /collection** — Pagination (`page`, `limit`, default 10, max 100), optional `tags[]` (AND), optional `query` (free-text on title + tags). Response: `{ items, total, page, limit }`; items are list projection (source, sourceObjectId, normalized, metadata.importedAt); no raw. Defensive: documents missing `metadata` or `metadata.importedAt` do not cause 500.
  - **GET /collection/:source/:sourceObjectId** — Canonical normalized view + images; 404 if not found. No raw.
- **DAL:** `IArtworkDAL` extended with `findCollectionPage(params)`. MongoArtworkDAL implements it; compound text index on `normalized.title` and `normalized.tags` for query. Unique (source, sourceObjectId) and `normalized.tags` index unchanged.
- **Startup:** `artworkDAL.ensureIndexes()` called in app startup after `initDb()`.
- **Verification:** `scripts/verifyMetRead.js` — npm: `verify-met-read`. HTTP-only: fetches expected from MET API, POST /import/met, poll GET /collection/met/:id, assert normalized matches. Requires server at BASE_URL (default http://localhost:5000).
- **Backend E2E (client):** `scripts/testBackendE2E.js` — npm: `test:backend-e2e`. Plain JS; HTTP-only. POST /import/met (server fetches from MET), poll GET /collection/met/:id, assert GET /collection. Run from another terminal; server must be running.

---

## Phase 9 — UI Screens (done)

- **Contracts:** [docs/UI_AND_API_CONTRACTS.md](UI_AND_API_CONTRACTS.md) documents the three screens and API contracts.
- **UI implemented** in [nodejs/client/](nodejs/client/): React + Vite; single backend-facing module [nodejs/client/src/api/examApi.js](nodejs/client/src/api/examApi.js) (BASE_URL from `VITE_API_URL`; importMet, getCollection, getArtwork, getLatestImportSummary, enrichArtwork). No direct fetch in components.
- **Screen 1 — Pull Collection:** PullCollectionPage, SourceSelector (MET enabled; Google Drive disabled), ObjectIdInput (IDs or “Use demo”), ImportButton; calls `api.importMet({ objectIds })` or `api.importMet({ demo: true })`; shows “Import started” and jobId.
- **Screen 2 — Review Changes:** ReviewChangesPage, ChangesSummary, ChangedItemRow; on mount `api.getLatestImportSummary()`; shows summary + list or “Coming soon” when no previous snapshot (501).
- **Screen 3 — View Collection:** CollectionPage, SearchBar, TagFilter, ArtworkGrid, ArtworkCard, Pagination; state (page, tags, query) → `api.getCollection(...)`; cards open More Info modal.
- **Screen 4 — More Info + AI Enrichment Result:** ArtworkModal, ArtworkDetails, EnrichButton; `api.getArtwork`, `api.enrichArtwork` (suggest); EnrichResultModal with suggested tags and “Apply tags” (enrich with `apply: true`). Hash-based nav in App.jsx (#pull, #review, #collection).

---

## Phase 10 — Demo mode (done)

- **DAL:** `findLastImportedObjectIds(source, limit)` added to [artworkDAL.types.ts](nodejs/server/dal/artworkDAL.types.ts) and [mongodbArtworkDAL.ts](nodejs/server/dal/mongodbArtworkDAL.ts). Returns up to `limit` sourceObjectIds for the given source, ordered by most recently imported first (`metadata.importedAt` descending).
- **Import route:** POST /import/met accepts `demo: true` in the body. When set, the server calls `findLastImportedObjectIds('met', 10)`, then `selectMetObjectIdsForImport({ previousIds, totalCount: 10, stableCount: 2 })` from [demoSelection.ts](nodejs/server/services/import/demoSelection.ts), and runs the existing batch pipeline on the resulting 10 IDs (2 stable, 8 new). Pipeline stages and validation/normalization unchanged.
- **Demo helpers:** Pure functions in demoSelection.ts (getLastImportedObjectIds, getNextMetObjectIds, selectMetObjectIdsForImport) are used only by the route for demo orchestration.

---

## Phase 11 — Explicit Non-Goals (UI v1) (done)

Per main project plan, Section 11. The following are **explicit non-goals** for UI v1: no real-time progress bars; no manual conflict resolution; no per-field diff visualization; no editing of imported data. Documented here and in the main plan; no implementation required.

---

## Phase 12 — AI enrichment (done)

- **llmDAL** ([nodejs/server/dal/llmDAL.ts](nodejs/server/dal/llmDAL.ts)) extended with `suggestTagsForArtwork(context)` returning `{ tags: string[] }`; context: title, tags, medium, classification (all optional; text-only v1).
- **POST /collection/:source/:sourceObjectId/enrich** implemented in [nodejs/server/routes/collection.ts](nodejs/server/routes/collection.ts): load artwork via `dal.findBySourceId`, call `suggestTagsForArtwork` with normalized fields, respond with `{ tags }`; 400/404/500 handling. No persistence of suggested tags in this phase.
- Uses same LLM provider config as grading (Azure/OpenAI).

---

## Phase 13 — Persist enriched tags (done)

- **POST /collection/:source/:sourceObjectId/enrich** accepts optional body `{ "apply": true }`. When present: after LLM suggestions, suggested tags are merged into `normalized.tags` (union, no removals), document is persisted via `dal.persistArtwork(doc)`, response is `{ tags, applied: true }`. Without apply (or `apply: false`): response remains `{ tags }` only.

---

## Diff — Review Changes (done)

- **History collection:** `artworks_history`. Before each upsert in [mongodbArtworkDAL.ts](nodejs/server/dal/mongodbArtworkDAL.ts), the existing document (if any) is snapshotted into `artworks_history` with `history: { source, sourceObjectId, importedAt, version }` so current and previous states can be compared.
- **GET /imports/latest/summary** ([nodejs/server/routes/imports.ts](nodejs/server/routes/imports.ts)): Uses [services/import/diffLatestImport.ts](nodejs/server/services/import/diffLatestImport.ts) to compute latest import timestamp (max `metadata.importedAt` in artworks), previous snapshot timestamp (max `history.importedAt` in history &lt; latest), then diff current set vs previous set. Returns `{ importedAt, version, summary: { new, updated, removed }, items }` with `changeType` and title/thumbnail; 501 when no previous snapshot. Deterministic; no UI or ingestion changes beyond history snapshot on persist.

---

## API-first daily artwork and health (done)

- **Daily artwork service:** [services/dailyArtwork.ts](../nodejs/server/services/dailyArtwork.ts) resolves `date_key`, selects one MET object deterministically from a curated seed list, reads it from Mongo when present, and lazily imports it through the existing MET pipeline when missing.
- **Daily artwork route:** [routes/dailyArtwork.ts](../nodejs/server/routes/dailyArtwork.ts) exposes **GET /daily-artwork** with a flat Ahi-friendly payload and strict `date_key` validation.
- **Auth middleware:** [middleware/apiKeyAuth.ts](../nodejs/server/middleware/apiKeyAuth.ts) protects **GET /daily-artwork** with `x-tema-api-key` matched against `TEMA_API_KEY`; behavior fails closed when the backend env key is missing.
- **Health route:** [app.ts](../nodejs/server/app.ts) exposes **GET /healthz** returning `{ ok: true, service: "tema-artworks-api" }`. This is process health only; it does not verify MongoDB.
- **Tests:** Jest coverage added for daily-artwork payload shaping, lazy import behavior, auth success/failure, malformed `date_key`, and `/healthz`.
