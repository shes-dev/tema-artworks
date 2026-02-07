# UI and API contracts

Single reference for the three UI screens and their backend API contracts. **Phase 9 UI is implemented** in [nodejs/client/](nodejs/client/); all backend access goes through [nodejs/client/src/api/examApi.js](nodejs/client/src/api/examApi.js). Backend is authoritative for canonical data and future diff logic. Each API is marked as **implemented** or **reference only — not implemented**.

---

## Purpose and scope

- **UI implemented** — Phase 9: Pull Collection, Review Changes, View Collection (grid + More Info modal + AI Enrichment Result modal) consume backend via the single API module; no direct fetch in components.
- **Backend is authoritative** — Canonical data, versioning, and future diff logic live in the backend. UI triggers imports and displays data; it must not infer diffs or modify data locally.
- **Implemented vs reference** — Implemented endpoints exist in [nodejs/server/routes/](nodejs/server/routes/). GET /imports/latest/summary is implemented (history + diff). UI triggers the request via a "Check" button; 501 → "No previous import to compare. Pull a collection first."; success with no changes → "No changes from this import compared to the last."
- **Contract source** — Main project plan (MET Import Validation Layer v1), Sections 9 and 12.

---

## Screen 1: Pull Collection

**Purpose:** Allow museum users to trigger a collection import from configured sources.

**Initial v1 scope:**

- Only **MET API** is enabled.
- Google Drive / CSV shown as **disabled / coming later**.

**UI elements:**

- **Source selector:** MET Museum (enabled), Google Drive (disabled).
- **Input options:** Single Object ID; Batch import (array of object IDs).
- **Action:** “Pull Collection” / “Import”.

**Behavior:** Triggers backend import pipeline. Import runs asynchronously (no blocking UI). UI receives job-started confirmation; optional progress updates (future).

### API: POST /import/met

**Status: implemented.**

Request:

```http
POST /import/met
Content-Type: application/json

{ "objectIds"?: number[], "demo"?: true }
```

- **Explicit IDs:** Send `objectIds` (array of MET object IDs) to import those objects.
- **Demo mode:** Send `"demo": true` to run a deterministic pull: the server uses the last-imported IDs and `selectMetObjectIdsForImport` to build a set of 10 objects (2 stable from the previous pull, 8 new). No `objectIds` required when using demo.

Response (202):

```json
{
  "jobId": "string",
  "status": "started"
}
```

---

## Screen 2: Review Changes

**Purpose:** Allow users to review **what changed** between the latest import and the previous state. Relies on `metadata.importedAt`, `metadata.version`, and upsert semantics (one current document per artwork).

**Displayed summary (example):**

- New items found
- Updated items
- Removed items (future capability)

Example: “2 new items • 1 item updated (MET-1234) • 3 items removed”.

**Item-level view (per changed item):**

- Artwork title
- Thumbnail (from `normalized.images.primary`)
- Change type: NEW | UPDATED | REMOVED
- Source ID (e.g. MET objectID)

### API: GET /imports/latest/summary

**Status: implemented.** Backend diffs current artworks against the previous snapshot in `artworks_history` (snapshot taken before each upsert). Returns 501 when there is no previous snapshot to compare. UI triggers the request via a "Check" button; 501 shows "No previous import to compare. Pull a collection first."; success with no changes shows "No changes from this import compared to the last."

Request:

```http
GET /imports/latest/summary
```

Response (contract for future implementation):

```json
{
  "importedAt": "ISO-date",
  "version": "v1",
  "summary": {
    "new": number,
    "updated": number,
    "removed": number
  },
  "items": [
    {
      "source": "met",
      "sourceObjectId": 1234,
      "title": "Artwork title",
      "thumbnail": "url",
      "changeType": "updated"
    }
  ]
}
```

`changeType` is one of: `"new"` | `"updated"` | `"removed"`.

---

## Screen 3: View Collection

**Purpose:** Allow users to browse imported artworks, filter by tags, search via free text, and view item details (wireframe: grid → More Info modal → AI Enrichment Result modal).

### Main view (grid)

- **Layout:** Grid of artwork cards. Each card: thumbnail (`normalized.images.primary`), artwork title.
- **Pagination:** Limit **10 artworks per page** (default); page-based.
- **Filtering — tags:** Multi-select filter on tags (from `normalized.tags`; later from AI enrichment). Only artworks containing **all** selected tags are shown.
- **Search:** Free-text search over artwork title and tags; case-insensitive. Combined with tag filters.

### API: GET /collection

**Status: implemented.**

Request:

```http
GET /collection
```

Query params: `page` (default 1), `limit` (default 10, max 100), `tags` (string or string[]), `query` (string).

Response:

```json
{
  "page": 1,
  "limit": 10,
  "total": 42,
  "items": [
    {
      "source": "met",
      "sourceObjectId": 1234,
      "normalized": { "title": "Artwork Title", "images": { "primary": "url" }, "tags": ["landscape", "oil", "19th century"] },
      "metadata": { "importedAt": "ISO-date" }
    }
  ]
}
```

For grid display, use `items[].normalized.title`, `items[].normalized.images.primary`, `items[].normalized.tags`. Contract equivalent: `title`, `thumbnail`, `tags` as in the plan; implementation exposes full `normalized` and `metadata.importedAt`.

### Interaction: click artwork → More Info modal

- **Behavior:** Clicking an artwork opens a modal with: larger image, short description / metadata excerpt, "AI Enrichment" button, Close (and X).

### API: GET /collection/:source/:sourceObjectId

**Status: implemented.**

Request:

```http
GET /collection/:source/:sourceObjectId
```

Response (200):

```json
{
  "source": "met",
  "sourceObjectId": 1234,
  "normalized": {
    "title": "Artwork Title",
    "artistName": "Artist Name",
    "images": { "primary": "url", "additional": [] },
    "tags": ["landscape", "oil"]
  }
}
```

Use `normalized.title` as title, `normalized.images.primary` as image, `normalized.tags` as tags. Description can be derived from other normalized fields if present.

### Interaction: AI Enrichment

- **Behavior:** User clicks "AI Enrichment" in More Info modal → backend sends artwork image (or image URL) to OpenAI → receives relevant tags → second modal ("AI Enrichment Result") displays tags. **Explicitly user-triggered** (not automatic).

### API: POST /collection/:source/:sourceObjectId/enrich

**Status: implemented.**

Request:

```http
POST /collection/:source/:sourceObjectId/enrich
Content-Type: application/json

{}
```

Optional body: `{ "apply": true }`. When `apply` is true, suggested tags are merged into the artwork’s `normalized.tags` (no removals) and the document is persisted; response then includes `"applied": true`.

Response (200):

```json
{
  "tags": ["mountains", "rural life", "painting"]
}
```

When apply was requested and succeeded: `{ "tags": [...], "applied": true }`.

**Notes:** Without `apply: true`, response is suggested tags only and no write occurs. When apply is used, tags are persisted (merge only). Source-derived tags in `normalized.tags` are **never removed**.

### View Collection — UI constraints and non-goals

- No inline editing of artwork data.
- No diff visualization on this screen.
- No background auto-enrichment.
- No infinite scroll (pagination only).

---

## Responsibility boundary

- **UI:** Triggers imports; displays summaries and collection data; **never** infers diffs or modifies data locally. Triggers AI enrichment (when implemented) via POST .../enrich.
- **Backend:** Owns canonical data; owns versioning; owns future diff logic; validates AI output before persistence.

UI must **never** compare raw or normalized payloads client-side or infer tags locally.

---

## Non-goals (v1)

- No real-time progress bars.
- No manual conflict resolution.
- No per-field diff visualization.
- No editing of imported data.
- No background auto-enrichment.
