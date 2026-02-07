# Bug: Server crash on startup with ts-node/esm (Node 24)

## Summary

Running the server via `npm run dev` (which used `node --loader ts-node/esm app.ts`) caused the process to exit immediately with an uncaught exception before the app could start. The failure was **not** caused by the application or the recent import/diff code; it was caused by the Node 24 + ts-node ESM loader combination.

## Symptoms

- **Command:** `npm run dev` (or `node --loader ts-node/esm app.ts`)
- **Result:** Process exits with code 1. No "Server running on http://localhost:5000".
- **Error output:**  
  `triggerUncaughtException` with  
  `[Object: null prototype] { Symbol(nodejs.util.inspect.custom): [Function: ...] }`  
  (i.e. a non-`Error` value thrown, typical of loader/runtime issues.)
- **Environment:** Node.js v24.x; ESM project (`"type": "module"`).

## Root cause

- **ts-node with the ESM loader** (`--loader ts-node/esm`) is a dev-time way to run TypeScript without a separate compile step.
- **Node 24 + experimental ESM loaders** can be unstable; the loader runs during module resolution and can throw or behave in ways that surface as an uncaught exception before any application code runs.
- The project is already set up to run **compiled JavaScript** (`npm run build` → `dist/`, `npm start` → `node dist/app.js`). Using the loader for "dev" was redundant and exposed this class of crash.

## Fix

- **Stop running the server via the ts-node loader.**  
  Use the compiled build instead:
  - `npm run build`
  - `npm start` or `npm run dev`
- **`package.json` change:**  
  `"dev": "node --loader ts-node/esm app.ts"` → `"dev": "node dist/app.js"`.
- **Workflow:** After code changes, run `npm run build` (or rely on your editor/CI build), then run the server with `npm start` or `npm run dev`.

## Why this aligns with the project

- Tests are JS-only (no ts-node at runtime).
- Backend runtime stays simple and deterministic (plain Node running `dist/*.js`).
- ts-node is a dev convenience, not the production path; Node 24 + ESM loaders are currently a known footgun.
- No changes were required to the import/diff or any other application logic; the bug was entirely in how the process was started.

## References

- Occurred after adding the Review Changes diff (history collection, GET /imports/latest/summary); the new code was wrongly suspected until the loader was removed from the dev script.
- Server runs correctly when started with `node dist/app.js` (after `npm run build`).
