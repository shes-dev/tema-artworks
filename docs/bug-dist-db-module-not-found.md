# Bug: ERR_MODULE_NOT_FOUND for dist/db/database.js on dev start

## Summary

After switching the dev script to run compiled output (`node dist/app.js`), the server failed to start with `ERR_MODULE_NOT_FOUND`: Node could not resolve `dist/db/database.js` when loading `dist/app.js`. The failure was caused by the database module being plain JavaScript (`.js` + `.d.ts`) instead of TypeScript, so the compiler never emitted it under `dist/`.

## Symptoms

- **Command:** `npm run dev` (runs `node dist/app.js`).
- **Result:** Process exits with uncaught exception; server does not start.
- **Error:**  
  `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../dist/db/database.js' imported from .../dist/app.js`  
  Node suggests: "Did you mean to import '../db/database.js'?"
- **Environment:** Node.js v24.x; ESM project; `npm run build` had completed successfully.

## Root cause

- **`app.ts`** imports `./db/database.js`; the compiled `dist/app.js` keeps that path, so at runtime Node resolves `./db/database.js` relative to `dist/app.js` → `dist/db/database.js`.
- **`db/`** contained only `database.js` (plain JS) and `database.d.ts` (type declarations). TypeScript compiles only `.ts` (and uses `.d.ts` for types); it does not copy or emit from `.js` files.
- So **`dist/db/` was never created**, and `dist/db/database.js` did not exist. The rest of the app was compiled into `dist/`, but the database module was left only in the source tree.

## Fix

- **Convert the database module to TypeScript** so it is compiled into `dist/` like the rest of the app:
  - Added `db/database.ts` with the same logic as `database.js`, with proper types (`MongoClient | null`, `Db | null`, `Promise<Db>`, `Promise<void>`).
  - Removed `db/database.js` and `db/database.d.ts`.
- After `npm run build`, `dist/db/database.js` is emitted and `npm run dev` starts the server successfully.

## References

- Occurred after fixing the ts-node loader crash (see `docs/bug-ts-node-loader-crash.md`) when dev was changed to run `node dist/app.js`.
- Server runs correctly with `node dist/app.js` once `db/database` is implemented as TypeScript and built into `dist/`.
