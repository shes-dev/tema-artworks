---
description: 
alwaysApply: true
---

# Agent handoff — source of truth

**Agents must read this file before making changes.**

Project name and purpose

tema — Backend ingestion system for a museum collection platform.
Built with Node.js, TypeScript, and MongoDB.

The system ingests artwork data from external sources (initially a single museum API).
Each ingestion preserves the original raw payload, validates and normalizes it into a canonical internal model, and records import metadata to enable future comparison and evolution.

Project state

The core ingestion pipeline is implemented and operational.
Data flows through clearly separated stages (fetch, validate, normalize, persist), with replaceable persistence and source abstractions.
Testing is performed via scripts that assert system invariants and pipeline correctness.

Read APIs (GET /collection, GET /collection/:source/:sourceObjectId, GET /daily-artwork, GET /healthz) and POST /import/met are implemented. GET /daily-artwork is API-key protected with `x-tema-api-key` / `TEMA_API_KEY`, selects deterministically from a curated MET seed list, and lazily imports the chosen record when it is missing locally. POST /collection/:source/:sourceObjectId/enrich is implemented (suggested tags via llmDAL); optional body `{ "apply": true }` persists suggested tags (merge into normalized.tags). Demo mode: POST /import/met accepts `demo: true` for a deterministic 10-object pull. Phase 9 UI is implemented in nodejs/client (React + Vite): Pull Collection, Review Changes, View Collection (grid, search, tag filter, pagination, More Info modal, AI Enrichment Result with Apply tags); single API layer (examApi.js); no direct fetch in components. GET /imports/latest/summary is implemented: history collection (artworks_history) snapshot before each upsert, diff service (diffLatestImport) returns new/updated/removed; 501 when no previous snapshot. Backend E2E test (test:backend-e2e) runs as plain JS HTTP client. Production-like Docker deployment assets now exist for the backend API: `nodejs/server/Dockerfile`, `nodejs/server/.dockerignore`, `nodejs/server/.env.api.example`, and `docker-compose.api.yml`. The API compose stack binds the backend to `127.0.0.1:3020`, keeps Mongo private to Docker networking, and is documented in `docs/DOCKER_API_DEPLOYMENT.md`.

Architectural principles

IO boundary validation
All external data is validated at system boundaries using runtime schemas. Validation is non-throwing; issues are collected and classified as ok, partial, or invalid.

Raw data immutability
External payloads are never mutated. The original response is stored verbatim and treated as an immutable source of truth.

Canonical internal model
Normalized data is written into a stable, well-defined internal document shape, separate from raw input.

Single current document invariant
There is exactly one current document per (source, sourceObjectId).
This invariant is enforced at the database level.

Idempotent persistence
Persistence is implemented using upsert semantics. Re-ingesting the same logical entity converges to the same final state and updates import metadata accordingly.

Re-import and diff (design only)
Phase 6 does not add features — it prevents future rewrites by encoding intent into metadata. metadata.importedAt and metadata.version are semantic anchors for future diffing; no history collection, snapshot table, or diff logic exists yet. Do not fake diffing (no ad-hoc comparison of payloads, no “changed” flags, no inferring deltas in UI). See docs/ARCHITECTURE.md and docs/PHASES.md.

Separation of concerns
Sources fetch raw data only.
Validation and normalization are explicit and source-specific.
Persistence logic is isolated behind a replaceable DAL.

Non-goals (current scope)

Additional data sources beyond the initial external API

Historical snapshots or diff computation

Background agents or autonomous workflows

Implicit or automatic demo behavior in the main pipeline

Agent operating rules

Treat markdown documentation as authoritative project memory.

Do not introduce new abstractions or architecture without updating the relevant documentation.

After completing any meaningful implementation step, ensure the project state is reflected in the appropriate .md files so another agent can resume without relying on chat context.

Code changes are not considered complete until documentation is consistent.

Every bug that is fixed or investigated must be documented in a markdown file under docs/ (e.g. `docs/bug-<slug>.md`) and referenced where it matters (e.g. in the fixing commit). See the rule in `.cursor/rules/` for the required structure and how to reference bug docs.

For scope and phase definitions, treat the main project plan as canonical; in-repo docs (PHASES.md, UI_AND_API_CONTRACTS.md) reflect it.

Where to learn more

Main project plan: MET Import Validation Layer (v1) — met_import_validation_layer_20917169.plan.md (in Cursor plans). Sections 1–13 define document types, DAL, pipeline, sources, UI screens, responsibility boundary, non-goals, View Collection, demo mode, etc. PHASES.md and docs align with this plan.

System overview: docs/ARCHITECTURE.md

Progress ledger: docs/PHASES.md

Pipeline definition: docs/PIPELINE.md

Testing approach: docs/TESTING.md

Forward-looking tasks: docs/NEXT.md

Cursor rules (`.cursor/rules/`): project-specific rules that apply to agents, including bug documentation (`.cursor/rules/bug-documentation.mdc`). Check this directory for other rules that may exist or be added later.
