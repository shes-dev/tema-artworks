/**
 * Phase 1 script: verify upsert idempotency — one document per (source, sourceObjectId).
 */
import { getDb } from '../db/database.js';

(async () => {
  const db = await getDb();
  const col = db.collection('artworks');

  await col.deleteMany({ source: 'met', sourceObjectId: 999 });

  await col.updateOne(
    { source: 'met', sourceObjectId: 999 },
    { $set: { foo: 'first' } },
    { upsert: true }
  );

  await col.updateOne(
    { source: 'met', sourceObjectId: 999 },
    { $set: { foo: 'second' } },
    { upsert: true }
  );

  const docs = await col.find({ source: 'met', sourceObjectId: 999 }).toArray();

  console.log('Documents count:', docs.length);
  console.log('Value:', docs[0]?.foo);

  if (docs.length !== 1 || docs[0]?.foo !== 'second') {
    process.exit(1);
  }
  process.exit(0);
})();
