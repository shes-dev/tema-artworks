/**
 * Phase 8 verification: fetch from MET → import via pipeline → retrieve via read API → assert normalized.
 * Requires: Mongo running; server running (default http://localhost:5000). Set BASE_URL if different.
 * Run: npm run verify-met-read (or node --loader ts-node/esm scripts/verifyMetRead.ts)
 */

import { fetchMetObject } from '../services/import/fetchMetObject.js';
import { validateMetRaw } from '../services/import/metValidation.js';
import { normalizeMetArtwork } from '../services/import/metNormalization.js';
import { importMetArtwork } from '../services/import/importMetArtwork.js';
import { MongoArtworkDAL } from '../dal/mongodbArtworkDAL.js';

const OBJECT_ID = 436535;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function main() {
  console.log('1. Fetch object from MET API...');
  const raw = await fetchMetObject(OBJECT_ID);
  const { validation } = validateMetRaw(raw);
  const expectedNormalized = normalizeMetArtwork(raw, validation);

  console.log('2. Import via pipeline (in-process)...');
  const dal = new MongoArtworkDAL();
  await importMetArtwork(OBJECT_ID, dal);

  console.log('3. Retrieve via read API (GET /collection/met/:id)...');
  const url = `${BASE_URL}/collection/met/${OBJECT_ID}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status}. Ensure server is running at ${BASE_URL} and Mongo is available.`);
  }
  const body = (await res.json()) as { source: string; sourceObjectId: number; normalized: typeof expectedNormalized };

  console.log('4. Assert normalized matches expected...');
  const n = body.normalized;
  const e = expectedNormalized;
  const checks: [string, unknown, unknown][] = [
    ['source', body.source, 'met'],
    ['sourceObjectId', body.sourceObjectId, OBJECT_ID],
    ['normalized.title', n?.title, e.title],
    ['normalized.artistName', n?.artistName, e.artistName],
    ['normalized.images.primary', n?.images?.primary, e.images?.primary],
  ];
  for (const [label, got, want] of checks) {
    if (got !== want) {
      console.error(`Assertion failed: ${label} — got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
      process.exit(1);
    }
  }
  console.log('VerifyMetRead: MET → import → read API → normalized match OK.');
  process.exit(0);
}

main().catch((err) => {
  console.error('verifyMetRead failed:', err);
  process.exit(1);
});
