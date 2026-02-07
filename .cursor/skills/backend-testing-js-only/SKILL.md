---
name: backend-testing-js-only
description: Enforces the JS-only backend testing policy where application code is TypeScript but all tests, verification scripts, and E2E checks are plain Node.js JavaScript clients that exercise the backend exclusively via HTTP. Use when writing or modifying backend tests, scripts under nodejs/server, or any verification/e2e code paths.
---

# Backend Testing Policy (JS-only)

## Purpose

This skill encodes the backend testing policy for this project:

- **Application code** is written in **TypeScript**.
- **Tests, verification scripts, and E2E checks** are written in **plain JavaScript** and act as **external clients**.
- Tests verify the backend **only via HTTP**, never via in-process calls.

Use this skill whenever a task involves **tests**, **verification**, **scripts**, **E2E**, **integration tests**, or **backend validation** for the Node.js backend.

## Core Rules

### 1. Language and runtime rules

- **Application code**:
  - Located under `src` (or equivalent TS sources).
  - Written in **TypeScript**.
  - Compiled to JavaScript under `dist`.

- **Tests, verification scripts, and E2E clients**:
  - Must be **plain JavaScript**.
  - Must run with a simple Node invocation:
    - `node file.js`
  - **Must NOT**:
    - Use `ts-node`.
    - Use any loaders.
    - Use any transpilation step.
    - Import TypeScript source files directly.

When deciding how to implement any backend test or verification, **always prefer a JS-only solution** that runs in the same runtime as production.

### 2. Black-box testing via HTTP

Tests and verification scripts are **external clients**, not part of the application:

- They **must only interact with the backend over HTTP**.
- They **must NOT**:
  - Call application functions in-process.
  - Import DAL modules or any internal services.
  - Reach into internal TypeScript modules or models.

**Rule of thumb**: If the code would not be possible in a separate repository talking to the deployed backend over HTTP, it likely violates this policy.

### 3. Directory rules

Apply these conventions when reasoning about or proposing file locations:

- **`/src`**:
  - TypeScript application code.
  - Not imported directly by tests.

- **`/dist`**:
  - Compiled JavaScript output.
  - This is what Node actually runs in production.
  - Tests may **target HTTP endpoints** on a server that is running code built from `dist`, but they do not import from `dist` either.

- **`/scripts`** (backend-focused):
  - **JavaScript-only runtime clients**.
  - Used for test-like verification, manual checks, and E2E-style flows.
  - Should be runnable as:
    - `node scripts/something.js`

If a new script or test is needed for backend validation, **place it in a JS-only location** (e.g. `scripts/` or the existing tests directory) rather than adding TypeScript there.

### 4. Ambiguity resolution

If a design choice is ambiguous:

- **Prefer the simpler JS-only approach**.
- Favor:
  - Fewer dependencies.
  - No loaders or transpilers in the test path.
  - Direct `node` execution.

When in doubt, ask:

- “Can this be run with `node file.js` without any extra tooling?”
- “Does this treat the backend as an external HTTP service?”

If the answer is “no”, adjust the design to comply.

## Rationale

- Tests must run in the **same runtime as production**, using the same Node.js behavior.
- Avoids instability from loaders, transpilers, and TypeScript-at-runtime solutions.
- Ensures **true black-box verification**:
  - The backend is tested only via its public HTTP interface.
  - No hidden coupling to internal modules, DAL, or in-process application classes.

This policy preserves a clear separation:

- **Production backend**: TypeScript compiled to JS and run by Node.
- **Clients/tests**: Plain JavaScript using Node’s built-in runtime and HTTP stack.

## How to Apply This Skill

When the user asks for anything involving backend tests, verification, E2E, or integration:

1. **Assume JS-only clients**
   - Propose solutions in plain JavaScript.
   - Ensure the code sample can run using `node file.js`.

2. **Use HTTP only**
   - Interact with the backend via HTTP (e.g. `fetch`, `axios`, or Node’s `http/https` modules).
   - Do not import server internals, DALs, or TS modules.

3. **Respect directories**
   - Keep application logic in TypeScript under `src` (or the project’s TS source directory).
   - Use JS-only files under `scripts` or test directories for any clients or verification tools.

4. **Resolve conflicts in favor of JS-only**
   - If a suggestion would require ts-node or loaders, revise it.
   - If a script is currently TypeScript but its role is “client/test/verification”, recommend or perform a migration to JS, if appropriate for the task.

## Example Patterns

### Good: HTTP-based JS E2E script

- A script in `scripts/verifyHealthcheck.js` that:
  - Starts from Node’s entry point: `node scripts/verifyHealthcheck.js`.
  - Sends HTTP requests to `/health` and asserts on the JSON response.
  - Uses `fetch` or `axios` from JavaScript, with no TS imports.

### Bad: In-process TypeScript test

- A `.ts` test file that:
  - Imports `app` or any internal TypeScript module.
  - Calls service or DAL functions directly.
  - Requires `ts-node` or loaders to execute.

In such cases, guide the user to:

- Move test logic to a JS file.
- Interact with the backend only via HTTP calls.

## Summary Checklist

Use this checklist when proposing or reviewing backend tests and scripts:

- [ ] Application logic is in TypeScript under `src` and compiled to JS.
- [ ] Tests/verification/E2E clients are plain JavaScript.
- [ ] All tests run with `node file.js` (no ts-node, loaders, or transpilation).
- [ ] Tests do not import TypeScript modules or internal application code.
- [ ] All interactions with the backend occur via HTTP requests.
- [ ] When in doubt, the simpler JS-only option is chosen.

