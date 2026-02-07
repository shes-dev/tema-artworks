/**
 * Phase 3 — Test orchestration: importMetArtwork calls DAL exactly once; result is canonical.
 */

import type { IArtworkDAL } from '../dal/artworkDAL.types.js';
import type { ArtworkDocument } from '../models/Artwork.js';
import { importMetArtwork } from '../services/import/importMetArtwork.js';

let persistCallCount = 0;

const fakeDAL: IArtworkDAL = {
  async persistArtwork(doc: ArtworkDocument): Promise<ArtworkDocument> {
    persistCallCount += 1;
    console.log('Persist called with:', doc.sourceObjectId);
    return doc;
  },
  async findBySourceId(): Promise<ArtworkDocument | null> {
    return null;
  },
  async findCollectionPage() {
    return { items: [], total: 0 };
  },
  async findLastImportedObjectIds() {
    return [];
  },
};

(async () => {
  try {
    const result = await importMetArtwork(436121, fakeDAL);

    console.log('Result:', result.source, result.sourceObjectId);

    if (persistCallCount !== 1) {
      console.error('Expected persistArtwork to be called exactly once, got', persistCallCount);
      process.exit(1);
    }
    if (result.source !== 'met') {
      console.error('Expected source "met", got', result.source);
      process.exit(1);
    }
    if (result.sourceObjectId !== 436121) {
      console.error('Expected sourceObjectId 436121, got', result.sourceObjectId);
      process.exit(1);
    }
    if (result.raw === undefined) {
      console.error('Expected result.raw to be defined');
      process.exit(1);
    }
    if (result.normalized === undefined) {
      console.error('Expected result.normalized to be defined');
      process.exit(1);
    }
    if (!result.validation || typeof result.validation.status === 'undefined' || !Array.isArray(result.validation.issues)) {
      console.error('Expected result.validation with status and issues');
      process.exit(1);
    }
    if (!(result.metadata.importedAt instanceof Date)) {
      console.error('Expected result.metadata.importedAt to be a Date');
      process.exit(1);
    }
    if (result.metadata.version !== 'v1') {
      console.error('Expected result.metadata.version "v1", got', result.metadata.version);
      process.exit(1);
    }

    console.log('Orchestration: DAL called once; document canonical.');
    process.exit(0);
  } catch (err) {
    console.error('testImportMetArtwork failed:', err);
    process.exit(1);
  }
})();
