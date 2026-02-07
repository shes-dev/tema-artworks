/**
 * Generalized pipeline entry point: source → validate → normalize → persist.
 * v1: MET-only validation and normalization; source is pluggable.
 */

import type { IArtworkDAL } from '../../dal/artworkDAL.types.js';
import type { ArtworkDocument } from '../../models/Artwork.js';
import type { IArtworkSource } from '../../sources/artworkSource.types.js';
import { normalizeMetArtwork } from './metNormalization.js';
import { validateMetRaw } from './metValidation.js';

function toSourceObjectId(sourceId: string | number): number {
  if (typeof sourceId === 'number' && !Number.isNaN(sourceId)) return sourceId;
  const n = Number(sourceId);
  return Number.isNaN(n) ? 0 : n;
}

export interface ImportArtworkOptions {
  importedAt?: Date;
}

/**
 * Import one artwork from a source: fetch raw → validate (v1: MET) → normalize (v1: MET) → persist.
 * Future sources plug in their own validate/normalize; no generic validator.
 * When options.importedAt is set, that timestamp is used for metadata.importedAt (e.g. one per batch run).
 */
export async function importArtwork(
  source: IArtworkSource,
  id: string | number,
  dal: IArtworkDAL,
  options?: ImportArtworkOptions
): Promise<ArtworkDocument> {
  const { raw, sourceId } = await source.fetchOne(id);

  const { raw: rawUnchanged, validation } = validateMetRaw(raw);
  const normalized = normalizeMetArtwork(rawUnchanged, validation);

  const document: ArtworkDocument = {
    source: 'met',
    sourceObjectId: toSourceObjectId(sourceId),
    raw: rawUnchanged,
    normalized,
    validation: {
      status: validation.status,
      issues: validation.issues,
    },
    metadata: {
      importedAt: options?.importedAt ?? new Date(),
      version: 'v1',
    },
  };

  return dal.persistArtwork(document);
}
