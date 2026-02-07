/**
 * MET-specific wrapper: thin wrapper around importArtwork. No logic beyond parameter wiring.
 */

import type { IArtworkDAL } from '../../dal/artworkDAL.types.js';
import type { ArtworkDocument } from '../../models/Artwork.js';
import { MetArtworkSource } from '../../sources/metSource.js';
import { importArtwork } from './importArtwork.js';

export interface ImportMetArtworkOptions {
  importedAt?: Date;
}

/**
 * Orchestration: delegate to importArtwork with MetArtworkSource.
 */
export async function importMetArtwork(
  objectId: number,
  dal: IArtworkDAL,
  options?: ImportMetArtworkOptions
): Promise<ArtworkDocument> {
  const source = new MetArtworkSource();
  return importArtwork(source, objectId, dal, options);
}
