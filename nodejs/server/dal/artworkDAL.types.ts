/**
 * Artwork DAL contract — pure interface, no Mongo or I/O.
 * The pipeline and services depend on this; storage can be swapped without touching them.
 */

import type { ArtworkDocument } from '../models/Artwork.js';

export interface FindCollectionPageParams {
  page: number;
  limit: number;
  tags?: string[];
  query?: string;
}

export interface FindCollectionPageResult {
  items: ArtworkDocument[];
  total: number;
}

export interface IArtworkDAL {
  /**
   * Persist a canonical artwork document.
   *
   * Invariant:
   * There must be exactly one current document per (source, sourceObjectId).
   */
  persistArtwork(doc: ArtworkDocument): Promise<ArtworkDocument>;

  /**
   * Lookup by source identity.
   */
  findBySourceId(
    source: string,
    sourceObjectId: number
  ): Promise<ArtworkDocument | null>;

  /**
   * List documents for the collection read API. Pagination, optional tags (AND), optional free-text query (title + tags).
   * Implementations that do not support this (e.g. minimal test doubles) may return { items: [], total: 0 } or throw.
   */
  findCollectionPage(
    params: FindCollectionPageParams
  ): Promise<FindCollectionPageResult>;

  /**
   * Return up to `limit` sourceObjectIds for the given source, ordered by most recently imported first (metadata.importedAt descending).
   * Used for demo orchestration. Implementations that do not support it may return [].
   */
  findLastImportedObjectIds(source: string, limit: number): Promise<number[]>;
}
