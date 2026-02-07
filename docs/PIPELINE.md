# Phase 3 pipeline spec

Import pipeline for MET artwork. This document is the spec; code must not drift from it.

---

## Stage 1 — Fetch

**Function:** `fetchMetObject(objectId: number): Promise<unknown>`

- HTTP GET to `https://collectionapi.metmuseum.org/public/collection/v1/objects/{objectId}`.
- Return parsed JSON as `unknown`.
- Do not validate or normalize.
- Throw only on network failure or non-JSON response.

**File:** `nodejs/server/services/import/fetchMetObject.ts`

---

## Stage 2 — Validation

**Function:** `validateMetRaw(raw: unknown): { raw: unknown; validation: { status, issues } }`

- Use Zod schema with `.passthrough()` for MET raw (objectID, title, artistDisplayName, objectDate, medium, department, primaryImage, primaryImageSmall, additionalImages; allow other fields).
- Collect issues via `safeParse`; never throw for bad external data.
- Status: `invalid` if objectID missing or invalid; `partial` if objectID valid but optional fields fail; `ok` if parse succeeds.
- Return the same `raw` reference (unchanged).

**File:** `nodejs/server/services/import/metValidation.ts`

---

## Stage 3 — Normalization

**Function:** `normalizeMetArtwork(raw: unknown, validation: ValidationResult): ArtworkNormalized`

- Build a new normalized object. Examples: artistDisplayName → artistName; primaryImage → images.primary; additionalImages → images.additional; department → classification; tags from department/culture; optional objectDate → yearStart/yearEnd.
- Never mutate `raw`. Only read from it.

**File:** `nodejs/server/services/import/metNormalization.ts`

---

## Stage 4 — Persistence

**Function:** `persistArtwork(document: ArtworkDocument, dal: IArtworkDAL): Promise<ArtworkDocument>`

- Build (or receive) full canonical document: source, sourceObjectId, raw, normalized, validation, metadata (importedAt = new Date(), version = "v1").
- Call `dal.persistArtwork(document)`. Do not catch DAL errors here.

**File:** `nodejs/server/services/import/importArtwork.ts` (builds document and calls `dal.persistArtwork(document)`).

---

## Orchestration

**Function:** `importArtwork(source: IArtworkSource, id: string | number, dal: IArtworkDAL): Promise<ArtworkDocument>`

- Fetch raw via `source.fetchOne(id)`; validate (v1: MET); normalize (v1: MET); build document; call `dal.persistArtwork(document)`.
- Core pipeline entry; no branching, no retries, no batching inside.

**File:** `nodejs/server/services/import/importArtwork.ts`

**Function:** `importMetArtwork(objectId: number, dal: IArtworkDAL): Promise<ArtworkDocument>`

- Thin wrapper: `importArtwork(new MetArtworkSource(), objectId, dal)`. No logic beyond parameter wiring.

**File:** `nodejs/server/services/import/importMetArtwork.ts`

---

## Batch helper

**Function:** `importMetArtworkBatch(objectIds: number[], dal: IArtworkDAL, options?: { concurrency?: number }): Promise<ArtworkDocument[]>`

- Loop over objectIds; delegate each to `importMetArtwork(id, dal)`.
- Optional concurrency via p-limit. No “fetch all at once.”

**File:** `nodejs/server/services/import/importMetArtworkBatch.ts`

---

## What must never happen

- Mutate the raw MET payload at any stage.
- Put business or branching logic inside the orchestration function.
- Validate or normalize inside the fetch stage.
- Touch the DAL in fetch, validate, or normalize (only persist stage and orchestration use the DAL).
- Throw from validation for bad external data (collect issues instead).
