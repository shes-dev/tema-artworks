/**
 * MongoDB implementation of IArtworkDAL.
 *
 * Invariant:
 * There is exactly ONE current document per (source, sourceObjectId).
 *
 * We enforce this using:
 * - a unique index on (source, sourceObjectId)
 * - updateOne(..., { upsert: true })
 *
 * This makes persistence idempotent:
 * re-importing the same artwork replaces the previous document
 * and updates metadata.importedAt to the last successful import time.
 *
 * History collection (artworks_history): before each upsert we snapshot the existing
 * document into artworks_history to support diffing for Review Changes (current vs
 * previous snapshot). History is append-only; we never overwrite history entries.
 */

import type { Db, Filter } from 'mongodb';
import type { ArtworkDocument } from '../models/Artwork.js';
import type {
  FindCollectionPageParams,
  FindCollectionPageResult,
  IArtworkDAL,
} from './artworkDAL.types.js';

const HISTORY_COLLECTION = 'artworks_history';

export class MongoArtworkDAL implements IArtworkDAL {
  private readonly collectionName = 'artworks';
  private readonly getDbFn: () => Promise<Db>;

  /**
   * @param getDbOverride — Optional. For tests: inject a getDb so the DAL does not load db/database.js.
   */
  constructor(getDbOverride?: () => Promise<Db>) {
    this.getDbFn =
      getDbOverride ??
      (() => import('../db/database.js').then((m) => m.getDb()));
  }

  private static readonly TEXT_INDEX_NAME = 'collection_text_search';

  /**
   * Create indexes once (e.g. on app startup or via a migration script).
   * Call ensureIndexes() before relying on unique constraint, tag filter, and text search.
   * Text index covers normalized.title and normalized.tags for free-text query (GET /collection?query=).
   * A collection may have at most one text index; we drop any existing text index that isn't ours before creating.
   */
  async ensureIndexes(): Promise<void> {
    const db = await this.getDbFn();
    const collection = db.collection(this.collectionName);

    await collection.createIndex(
      { source: 1, sourceObjectId: 1 },
      { unique: true }
    );
    await collection.createIndex({ 'normalized.tags': 1 });

    const indexes = await collection.indexes();
    const hasTextKey = (key: Record<string, unknown>) =>
      Object.values(key).some((v) => v === 'text');
    for (const idx of indexes) {
      const name = idx.name;
      if (name && name !== '_id_' && name !== MongoArtworkDAL.TEXT_INDEX_NAME && hasTextKey(idx.key as Record<string, unknown>)) {
        await collection.dropIndex(name);
      }
    }
    await collection.createIndex(
      { 'normalized.title': 'text', 'normalized.tags': 'text' },
      { name: MongoArtworkDAL.TEXT_INDEX_NAME }
    );

    const historyColl = db.collection(HISTORY_COLLECTION);
    await historyColl.createIndex({ 'history.importedAt': -1 });
  }

  async persistArtwork(doc: ArtworkDocument): Promise<ArtworkDocument> {
    const db = await this.getDbFn();
    const collection = db.collection<ArtworkDocument>(this.collectionName);

    const existing = await collection.findOne({
      source: doc.source,
      sourceObjectId: doc.sourceObjectId,
    });

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/720206ef-7f62-4911-96d2-50a76ea3d4e3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'mongodbArtworkDAL.ts:persistArtwork', message: existing != null ? 'writing history snapshot' : 'no existing, skip history', data: { source: doc.source, sourceObjectId: doc.sourceObjectId, hasExisting: existing != null }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H4' }) }).catch(() => {});
    // #endregion
    if (existing != null) {
      const historyColl = db.collection(HISTORY_COLLECTION);
      const { _id: _omit, ...rest } = existing as typeof existing & { _id?: unknown };
      const snapshot = {
        ...rest,
        history: {
          source: existing.source,
          sourceObjectId: existing.sourceObjectId,
          importedAt: existing.metadata?.importedAt ?? new Date(0),
          version: existing.metadata?.version ?? 'v1',
        },
      };
      await historyColl.insertOne(snapshot);
    }

    const importedAt = doc.metadata?.importedAt ?? new Date();
    const documentToPersist: ArtworkDocument = {
      ...doc,
      metadata: {
        ...doc.metadata,
        importedAt,
      },
    };

    await collection.updateOne(
      {
        source: doc.source,
        sourceObjectId: doc.sourceObjectId,
      },
      {
        $set: documentToPersist,
      },
      {
        upsert: true,
      }
    );

    return documentToPersist;
  }

  async findBySourceId(
    source: string,
    sourceObjectId: number
  ): Promise<ArtworkDocument | null> {
    const db = await this.getDbFn();
    const collection = db.collection<ArtworkDocument>(this.collectionName);

    const filter: Filter<ArtworkDocument> = { source: source as ArtworkDocument['source'], sourceObjectId };
    const doc = await collection.findOne(filter);
    return doc ?? null;
  }

  async findCollectionPage(
    params: FindCollectionPageParams
  ): Promise<FindCollectionPageResult> {
    const db = await this.getDbFn();
    const collection = db.collection<ArtworkDocument>(this.collectionName);

    const filter: Filter<ArtworkDocument> = {};

    if (params.tags && params.tags.length > 0) {
      filter['normalized.tags'] = { $all: params.tags };
    }
    if (params.query && params.query.trim()) {
      filter.$text = { $search: params.query.trim() };
    }

    const skip = (Math.max(1, params.page) - 1) * Math.max(1, params.limit);
    const limit = Math.max(1, Math.min(100, params.limit));

    const [items, total] = await Promise.all([
      collection.find(filter).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    return { items, total };
  }

  async findLastImportedObjectIds(source: string, limit: number): Promise<number[]> {
    const db = await this.getDbFn();
    const collection = db.collection<ArtworkDocument>(this.collectionName);

    const filter: Filter<ArtworkDocument> = {
      source: source as ArtworkDocument['source'],
      'metadata.importedAt': { $exists: true, $ne: null },
    };

    const docs = await collection
      .find(filter)
      .sort({ 'metadata.importedAt': -1 })
      .limit(Math.max(0, limit))
      .project({ sourceObjectId: 1 })
      .toArray();

    return docs.map((d) => d.sourceObjectId);
  }
}
