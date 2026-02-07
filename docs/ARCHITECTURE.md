# Architecture — mental model

High-level system overview and canonical shapes. No implementation details beyond what is needed to reason about the system.

---

## System overview

- **Backend:** Node.js (Express + TypeScript) under `nodejs/server/`. MongoDB for persistence. Artwork ingestion is a four-stage pipeline: fetch (MET API) → validate (Zod) → normalize (canonical shape) → persist (DAL).
- **Frontend:** React + Vite under `nodejs/client/`. Phase 9 UI implemented: Pull Collection, Review Changes, View Collection (grid + More Info + AI Enrichment Result modals). Single backend-facing module (examApi.js); UI does not infer diffs or modify data locally. Not part of the ingestion pipeline.
- **Database:** MongoDB. One collection used by the artwork pipeline: `artworks`. Indexes: unique on `(source, sourceObjectId)`; `normalized.tags`; compound text index on `normalized.title` and `normalized.tags` for free-text search.

---

## Canonical ArtworkDocument shape

Defined in `nodejs/server/models/Artwork.ts`. Every persisted artwork document has this shape:

| Field | Meaning |
|-------|--------|
| `source` | Data source identifier; v1 only `"met"`. |
| `sourceObjectId` | Source’s own ID (e.g. MET objectID). |
| `normalized` | Canonical fields: title, artistName, objectDate, yearStart, yearEnd, medium, classification, images (primary, additional), tags. |
| `raw` | Full untouched API response (unknown). Never mutated. |
| `validation` | `status`: `"ok"` \| `"partial"` \| `"invalid"`; `issues`: array of `{ field, reason }`. |
| `metadata.importedAt` | When this artwork was last successfully ingested. Updated on every upsert. Represents *freshness*, not history. Enables future questions like “What changed since last import?” |
| `metadata.version` | Which ingestion logic produced this document. **Not** app version or data version — this is **ingestion / normalization semantics** (e.g. `v1` = initial rules, `v2` = changed tag extraction). Enables “Which records need re-ingestion?” or “Compare v1 vs v2 output.” |

`normalized.tags` may contain both source-derived and AI-enriched tags; source-derived tags are never removed by enrichment. Enrichment (Phase 12) uses `llmDAL.suggestTagsForArtwork`; POST .../enrich returns suggested tags and optionally accepts `{ "apply": true }` to merge suggested tags into `normalized.tags` and persist (Phase 13).

---

## DAL abstraction

- **Interface:** `IArtworkDAL` in `nodejs/server/dal/artworkDAL.types.ts`. Methods: `persistArtwork(doc)`, `findBySourceId(source, sourceObjectId)`, `findCollectionPage(params)` for list/pagination/tags/text search, `findLastImportedObjectIds(source, limit)` for demo orchestration (last-imported IDs by source). No Mongo or I/O in the interface.
- **Implementation:** `MongoArtworkDAL` in `nodejs/server/dal/mongodbArtworkDAL.ts`. Uses `updateOne(..., { upsert: true })` keyed by `(source, sourceObjectId)`. Ensures exactly one current document per artwork; `metadata.importedAt` is set at persist time. Read APIs tolerate documents with missing `metadata` or `metadata.importedAt` (e.g. legacy data) without failing.
- **Why:** The pipeline and orchestration depend only on `IArtworkDAL`. Storage can be swapped without changing fetch, validate, or normalize. Only the persist stage touches the DAL.

---

## Pipeline stages

1. **Fetch** — HTTP GET to Met API; return body as `unknown`. No validation or normalization.
2. **Validate** — Zod passthrough; collect issues; set status ok/partial/invalid. Never throw for bad external data.
3. **Normalize** — Build `ArtworkNormalized` from raw (e.g. artistDisplayName → artistName, primaryImage → images.primary). Never mutate raw.
4. **Persist** — Build full `ArtworkDocument` (including metadata.importedAt, metadata.version), call `dal.persistArtwork(document)`.

Orchestration (`importMetArtwork`) runs the four stages in order and has no branching, retries, or batching logic. Batch helper (`importMetArtworkBatch`) loops over IDs and calls `importMetArtwork` per ID with optional concurrency. Demo mode (Phase 10) uses `findLastImportedObjectIds` and pure `selectMetObjectIdsForImport` to build a deterministic pull of 10 MET IDs (2 stable, 8 new) before calling the existing batch pipeline; no change to fetch/validate/normalize/persist.

---

## Why upsert + metadata (contract for future diffing)

Re-importing the same artwork must not create duplicate documents. We deliberately chose:

- **One current document per `(source, sourceObjectId)`** plus metadata (importedAt, version).
- **Diff (implemented):** History collection `artworks_history`; snapshot before each upsert. GET /imports/latest/summary returns new/updated/removed; 501 when no previous snapshot.

This gives **forward compatibility** without **present complexity**. The metadata fields are **semantic anchors** so that diffing can be added later without rewriting ingestion.

**Diff:**  Implemented via history collection (see bullet above).

---

## Separation of concerns

- **Ingestion:** Fetch, validate, normalize in `nodejs/server/services/import/`. No DAL in fetch/validate/normalize.
- **Persistence:** DAL only. Implementations (e.g. Mongo) own indexes and upsert semantics.
- **UI:** Reference-only. API contracts (e.g. POST /import/met, GET /collection) and screen behavior are documented; no UI implementation in v1.

This overview aligns with the main project plan (MET Import Validation Layer v1; see Cursor plans: met_import_validation_layer_20917169.plan.md).
