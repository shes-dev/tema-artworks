/**
 * Phase 8 verification — HTTP-only. Fetches expected from MET API, triggers import via server,
 * then GET /collection/met/:id and asserts normalized matches MET-derived expected.
 * Requires: server running at BASE_URL; Mongo and MET API used by server.
 * Run: npm run verify-met-read  (node scripts/verifyMetRead.js)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const OBJECT_ID = 436535;
const MET_OBJECT_URL = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${OBJECT_ID}`;
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 25000;

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function main() {
  console.log('1. Fetch expected from MET API...');
  let metRes;
  try {
    metRes = await fetch(MET_OBJECT_URL);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`MET fetch failed: ${msg}`);
  }
  if (!metRes.ok) {
    fail(`MET API returned ${metRes.status} for ${MET_OBJECT_URL}`);
  }
  const raw = await metRes.json();
  const expectedTitle = raw && (raw.title ?? raw.Title);
  const expectedArtist = raw && raw.artistDisplayName;
  const expectedPrimary = raw && raw.primaryImage;

  console.log('2. POST /import/met...');
  let importRes;
  try {
    importRes = await fetch(`${BASE_URL}/import/met`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectIds: [OBJECT_ID] }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`POST /import/met failed: ${msg}. Is the server running at ${BASE_URL}?`);
  }
  if (importRes.status !== 202) {
    fail(`Expected 202, got ${importRes.status}. Is the server running at ${BASE_URL}?`);
  }
  console.log('   Accepted.');

  console.log('3. Poll GET /collection/met/:id until 200...');
  const singleUrl = `${BASE_URL}/collection/met/${OBJECT_ID}`;
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let singleBody;
  for (;;) {
    try {
      const res = await fetch(singleUrl);
      if (res.status === 200) {
        singleBody = await res.json();
        break;
      }
    } catch (_) {}
    if (Date.now() >= deadline) {
      fail(`Timeout waiting for 200 from ${singleUrl}. Server may be slow or MET unreachable.`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.log('4. Assert normalized matches MET expected...');
  if (singleBody.source !== 'met') {
    fail(`Expected source "met", got ${JSON.stringify(singleBody.source)}`);
  }
  if (singleBody.sourceObjectId !== OBJECT_ID) {
    fail(`Expected sourceObjectId ${OBJECT_ID}, got ${singleBody.sourceObjectId}`);
  }
  const n = singleBody.normalized;
  if (!n) {
    fail('Response missing normalized');
  }
  if (expectedTitle != null && n.title !== expectedTitle) {
    fail(`normalized.title: got ${JSON.stringify(n.title)}, expected ${JSON.stringify(expectedTitle)}`);
  }
  if (expectedArtist != null && n.artistName !== expectedArtist) {
    fail(`normalized.artistName: got ${JSON.stringify(n.artistName)}, expected ${JSON.stringify(expectedArtist)}`);
  }
  if (expectedPrimary != null && n.images && n.images.primary !== expectedPrimary) {
    fail(`normalized.images.primary: got ${JSON.stringify(n.images && n.images.primary)}, expected ${JSON.stringify(expectedPrimary)}`);
  }

  console.log('VerifyMetRead: MET → import (HTTP) → read API → normalized match OK.');
  process.exit(0);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('verifyMetRead failed:', msg);
  process.exit(1);
});
