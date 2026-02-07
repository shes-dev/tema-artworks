/**
 * Backend E2E test — run from another terminal. Pure HTTP client; no in-process pipeline or Mongo.
 * Triggers the server to fetch from the MET API (POST /import/met), then verifies read APIs.
 * Requires: server already running at BASE_URL; Mongo and MET API are used by the server.
 * Run: npm run test:backend-e2e
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const OBJECT_ID = 436535;
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 25000;

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function main() {
  console.log('1. POST /import/met...');
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
  const importBody = await importRes.json();
  if (!importBody || importBody.jobId === undefined || importBody.status === undefined) {
    fail('Response missing jobId or status');
  }
  console.log('   Accepted:', importBody.jobId);

  console.log('2. Poll GET /collection/met/:id until 200...');
  const singleUrl = `${BASE_URL}/collection/met/${OBJECT_ID}`;
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let singleRes;
  let singleBody;
  for (;;) {
    try {
      singleRes = await fetch(singleUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      fail(`GET ${singleUrl} failed: ${msg}`);
    }
    if (singleRes.status === 200) {
      singleBody = await singleRes.json();
      break;
    }
    if (Date.now() >= deadline) {
      fail(`Timeout waiting for 200 from ${singleUrl}. Last status: ${singleRes.status}. Server may be slow or MET unreachable.`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  if (!singleBody) fail('Unreachable: singleBody not set');

  console.log('3. Assert single-artwork response...');
  if (singleBody.source !== 'met') {
    fail(`Expected source "met", got ${JSON.stringify(singleBody.source)}`);
  }
  if (singleBody.sourceObjectId !== OBJECT_ID) {
    fail(`Expected sourceObjectId ${OBJECT_ID}, got ${singleBody.sourceObjectId}`);
  }
  const n = singleBody.normalized;
  if (!n || (typeof n.title === 'undefined' && typeof n.artistName === 'undefined' && (!n.images || typeof n.images.primary === 'undefined'))) {
    fail('normalized must have at least one of title, artistName, or images.primary');
  }

  console.log('4. GET /collection?page=1&limit=10...');
  let listRes;
  try {
    listRes = await fetch(`${BASE_URL}/collection?page=1&limit=10`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`GET /collection failed: ${msg}`);
  }
  if (listRes.status !== 200) {
    fail(`GET /collection failed: ${listRes.status}`);
  }
  const listBody = await listRes.json();
  if (!listBody || !Array.isArray(listBody.items)) {
    fail('Response missing items array');
  }
  if (typeof listBody.total !== 'number') {
    fail('Response missing total number');
  }
  const found = listBody.items.some(
    (item) => item && item.sourceObjectId === OBJECT_ID
  );
  if (!found) {
    fail(`Imported artwork (sourceObjectId ${OBJECT_ID}) not found in GET /collection items`);
  }

  console.log('Backend E2E: POST /import/met → poll → GET single → GET collection OK.');
  process.exit(0);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('testBackendE2E failed:', msg);
  process.exit(1);
});

