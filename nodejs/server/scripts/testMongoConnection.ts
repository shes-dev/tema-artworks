/**
 * Phase 1 script: verify Mongo connectivity.
 */
import { getDb } from '../db/database.js';

(async () => {
  const db = await getDb();
  await db.command({ ping: 1 });
  console.log('✅ Mongo connection OK');
  process.exit(0);
})();
