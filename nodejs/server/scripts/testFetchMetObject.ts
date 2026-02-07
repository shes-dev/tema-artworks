/**
 * Phase 3 — Test Stage 1: fetchMetObject returns raw JSON as unknown, does not mutate.
 */

import { fetchMetObject } from '../services/import/fetchMetObject.js';

(async () => {
  try {
    const raw = await fetchMetObject(436121);
    const hasObjectID =
      typeof raw === 'object' && raw !== null && 'objectID' in (raw as Record<string, unknown>);
    const objectID = (raw as Record<string, unknown>).objectID;

    console.log('Type:', typeof raw);
    console.log('Has objectID:', hasObjectID, objectID);

    if (typeof raw !== 'object' || raw === null) {
      console.error('Expected raw to be an object');
      process.exit(1);
    }
    if (!hasObjectID) {
      console.error('Expected raw to have objectID');
      process.exit(1);
    }
    console.log('Stage 1 (fetch): raw returned, objectID present, no validation.');
    process.exit(0);
  } catch (err) {
    console.error('testFetchMetObject failed:', err);
    process.exit(1);
  }
})();
