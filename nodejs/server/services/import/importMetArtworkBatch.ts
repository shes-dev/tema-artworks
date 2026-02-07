/**
 * Batch helper: loop over objectIds, delegate each to importMetArtwork.
 * Optional concurrency via p-limit. No fetch-all-at-once.
 */

import pLimit from 'p-limit';
import type { IArtworkDAL } from '../../dal/artworkDAL.types.js';
import type { ArtworkDocument } from '../../models/Artwork.js';
import { importMetArtwork } from './importMetArtwork.js';

export interface ImportMetArtworkBatchOptions {
  concurrency?: number;
  /** Single timestamp for the whole run so the diff service can treat all as one import. */
  importedAt?: Date;
}

/**
 * Import multiple MET artworks by objectID. Each ID is delegated to importMetArtwork.
 * Optional concurrency limits parallel imports; default 1 (sequential).
 * When importedAt is set, all persisted documents share that metadata.importedAt for diffing.
 */
export async function importMetArtworkBatch(
  objectIds: number[],
  dal: IArtworkDAL,
  options?: ImportMetArtworkBatchOptions
): Promise<ArtworkDocument[]> {
  const concurrency = options?.concurrency ?? 1;
  const limit = pLimit(concurrency);
  const importedAt = options?.importedAt;

  const results = await Promise.all(
    objectIds.map((id) => limit(() => importMetArtwork(id, dal, { importedAt })))
  );

  return results;
}
