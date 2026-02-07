/**
 * Phase 1 script: verify ArtworkDocumentSchema accepts a valid canonical document.
 */
import { ArtworkDocumentSchema } from '../models/Artwork.js';

const valid = {
  source: 'met',
  sourceObjectId: 1,
  raw: {},
  normalized: {
    images: { additional: [] },
    tags: [],
  },
  validation: { status: 'ok' as const, issues: [] },
  metadata: { importedAt: new Date(), version: 'v1' },
};

const result = ArtworkDocumentSchema.safeParse(valid);
console.log('Schema valid:', result.success);
if (!result.success) {
  console.error(result.error.flatten());
  process.exit(1);
}
process.exit(0);
