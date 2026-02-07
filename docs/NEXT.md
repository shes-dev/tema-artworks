# Next actions

Short list for the next agent. Do not treat as exhaustive; check PHASES.md and PIPELINE.md for full context. Canonical scope and phases: see main project plan (MET Import Validation Layer v1, met_import_validation_layer_20917169.plan.md).

---

**Done:** POST /import/met, ensureIndexes on startup, View Collection API (GET /collection, GET /collection/:source/:sourceObjectId) — see Phase 8 in PHASES.md. Phase 9: UI implemented (Pull Collection, Review Changes, View Collection, More Info + Enrich modals); single API layer in nodejs/client/src/api/examApi.js — see [UI_AND_API_CONTRACTS.md](UI_AND_API_CONTRACTS.md) and Phase 9 in PHASES.md. Phase 10: Demo mode — POST /import/met with `demo: true` — see Phase 10 in PHASES.md. Phase 11: Explicit Non-Goals (UI v1) documented. Phase 12: POST .../enrich (suggested tags). Phase 13: Enrich apply (`{ "apply": true }` persists tags). Diff: GET /imports/latest/summary implemented via history collection (artworks_history snapshot before upsert, diffLatestImport service); 501 when no previous snapshot — see "Diff — Review Changes" in PHASES.md.
