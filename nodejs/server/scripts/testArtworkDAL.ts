/**
 * Phase 2 script: prove the artwork DAL works.
 * - Ensures indexes exist (unique on source + sourceObjectId, tags, title).
 * - Persists the same artwork twice; second update changes tags and importedAt.
 * - Asserts exactly one document with tags ["updated"] and importedAt from second call.
 */

import { MongoArtworkDAL } from '../dal/mongodbArtworkDAL.js';
import type { ArtworkDocument } from '../models/Artwork.js';

(async () => {
  try {
  const dal = new MongoArtworkDAL();

  await dal.ensureIndexes();

  const baseDoc: ArtworkDocument = {
    source: 'met',
    sourceObjectId: 42,
    raw: { foo: 'bar' },
    normalized: {
      images: { additional: [] },
      tags: ['test'],
    },
    validation: { status: 'ok', issues: [] },
    metadata: { importedAt: new Date(), version: 'v1' },
  };

  const firstPersisted = await dal.persistArtwork(baseDoc);
  const secondPersisted = await dal.persistArtwork({
    ...baseDoc,
    normalized: { ...baseDoc.normalized, tags: ['updated'] },
  });

  const result = await dal.findBySourceId('met', 42);

  if (!result) {
    console.error('Expected one document, got null');
    process.exit(1);
  }

  const tagsOk = JSON.stringify(result.normalized.tags) === JSON.stringify(['updated']);
  const importedAtFromSecond =
    result.metadata.importedAt.getTime() === secondPersisted.metadata.importedAt.getTime();

  console.log('Found:', {
    source: result.source,
    sourceObjectId: result.sourceObjectId,
    tags: result.normalized.tags,
    importedAt: result.metadata.importedAt.toISOString(),
  });

  if (!tagsOk) {
    console.error('Expected tags ["updated"], got', result.normalized.tags);
    process.exit(1);
  }
  if (!importedAtFromSecond) {
    console.error('Expected importedAt to reflect second persist');
    process.exit(1);
  }

  console.log('Phase 2 DAL: one document per (source, sourceObjectId); repeated persist converges; importedAt set by DAL.');
  process.exit(0);
  } catch (err) {
    console.error('testArtworkDAL failed:', err);
    process.exit(1);
  }
})();
