/**
 * DAL tests for MongoArtworkDAL. Use real Mongo (test DB or default; clean up between tests).
 * Requires running Mongo (e.g. docker). Injects getDb so we do not load db/database.js (ESM) in Jest.
 */

import { MongoClient } from 'mongodb';
import { MongoArtworkDAL } from '../../dal/mongodbArtworkDAL.js';
import type { ArtworkDocument } from '../../models/Artwork.js';

const TEST_SOURCE_OBJECT_ID = 888777666;
const FIND_LAST_IDS = [100001, 100002] as const;
const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
const dbName = process.env.DB_NAME || 'tema';

let testDb: Awaited<ReturnType<MongoClient['db']>>;
let client: MongoClient;

const HISTORY_COLLECTION = 'artworks_history';

async function deleteTestDocument(): Promise<void> {
  await testDb.collection('artworks').deleteOne({
    source: 'met',
    sourceObjectId: TEST_SOURCE_OBJECT_ID,
  });
  await testDb.collection(HISTORY_COLLECTION).deleteMany({
    source: 'met',
    sourceObjectId: TEST_SOURCE_OBJECT_ID,
  });
}

async function deleteFindLastTestDocuments(): Promise<void> {
  await testDb.collection('artworks').deleteMany({
    source: 'met',
    sourceObjectId: { $in: [...FIND_LAST_IDS] },
  });
}

function makeDoc(overrides: Partial<ArtworkDocument> = {}): ArtworkDocument {
  return {
    source: 'met',
    sourceObjectId: TEST_SOURCE_OBJECT_ID,
    raw: { objectID: TEST_SOURCE_OBJECT_ID, title: 'DAL Test' },
    normalized: {
      title: 'DAL Test',
      images: { additional: [] },
      tags: ['test'],
    },
    validation: { status: 'ok', issues: [] },
    metadata: { importedAt: new Date(), version: 'v1' },
    ...overrides,
  };
}

describe('MongoArtworkDAL', () => {
  let dal: MongoArtworkDAL;

  beforeAll(async () => {
    client = new MongoClient(mongodbUri);
    await client.connect();
    testDb = client.db(dbName);
    dal = new MongoArtworkDAL(() => Promise.resolve(testDb));
    await dal.ensureIndexes();
  });

  afterAll(async () => {
    await client?.close();
  });

  afterEach(async () => {
    await deleteTestDocument();
  });

  describe('persistArtwork', () => {
    it('first call inserts document', async () => {
      const doc = makeDoc();
      const persisted = await dal.persistArtwork(doc);
      expect(persisted.source).toBe('met');
      expect(persisted.sourceObjectId).toBe(TEST_SOURCE_OBJECT_ID);

      const found = await dal.findBySourceId('met', TEST_SOURCE_OBJECT_ID);
      expect(found).not.toBeNull();
      expect(found?.sourceObjectId).toBe(TEST_SOURCE_OBJECT_ID);
    });

    it('second call with same (source, sourceObjectId) updates document', async () => {
      const doc1 = makeDoc({ normalized: { ...makeDoc().normalized, tags: ['first'] } });
      const doc2 = makeDoc({ normalized: { ...makeDoc().normalized, tags: ['second'] } });
      await dal.persistArtwork(doc1);
      await dal.persistArtwork(doc2);

      const found = await dal.findBySourceId('met', TEST_SOURCE_OBJECT_ID);
      expect(found).not.toBeNull();
      expect(found?.normalized.tags).toEqual(['second']);
    });

    it('exactly one document exists per (source, sourceObjectId)', async () => {
      const doc = makeDoc();
      await dal.persistArtwork(doc);
      await dal.persistArtwork(doc);

      const count = await testDb.collection('artworks').countDocuments({
        source: 'met',
        sourceObjectId: TEST_SOURCE_OBJECT_ID,
      });
      expect(count).toBe(1);
    });

    it('metadata.importedAt is set and updated on second persist', async () => {
      const doc = makeDoc();
      const first = await dal.persistArtwork(doc);
      const firstImportedAt = first.metadata.importedAt.getTime();

      await new Promise((r) => setTimeout(r, 10));
      const second = await dal.persistArtwork(makeDoc({ normalized: { ...doc.normalized, tags: ['updated'] } }));
      const secondImportedAt = second.metadata.importedAt.getTime();

      expect(secondImportedAt).toBeGreaterThanOrEqual(firstImportedAt);

      const found = await dal.findBySourceId('met', TEST_SOURCE_OBJECT_ID);
      expect(found?.metadata.importedAt.getTime()).toBe(secondImportedAt);
    });

    it('metadata.version is preserved', async () => {
      const doc = makeDoc({ metadata: { importedAt: new Date(), version: 'v1' } });
      const persisted = await dal.persistArtwork(doc);
      expect(persisted.metadata.version).toBe('v1');

      const found = await dal.findBySourceId('met', TEST_SOURCE_OBJECT_ID);
      expect(found?.metadata.version).toBe('v1');
    });

    it('second persist inserts snapshot into artworks_history with history metadata', async () => {
      const doc1 = makeDoc({ normalized: { ...makeDoc().normalized, tags: ['first'], title: 'First Title' } });
      const first = await dal.persistArtwork(doc1);
      const firstImportedAt = first.metadata.importedAt;

      await dal.persistArtwork(makeDoc({ normalized: { ...makeDoc().normalized, tags: ['second'] } }));

      const historyDocs = await testDb.collection(HISTORY_COLLECTION).find({
        source: 'met',
        sourceObjectId: TEST_SOURCE_OBJECT_ID,
      }).toArray();

      expect(historyDocs.length).toBe(1);
      expect(historyDocs[0].history).toBeDefined();
      expect(historyDocs[0].history.source).toBe('met');
      expect(historyDocs[0].history.sourceObjectId).toBe(TEST_SOURCE_OBJECT_ID);
      expect(new Date(historyDocs[0].history.importedAt).getTime()).toBe(firstImportedAt.getTime());
      expect(historyDocs[0].history.version).toBe('v1');
      expect(historyDocs[0].normalized?.title).toBe('First Title');
      expect(historyDocs[0].normalized?.tags).toEqual(['first']);
    });
  });

  describe('findBySourceId', () => {
    it('returns expected document after persist', async () => {
      const doc = makeDoc({ normalized: { ...makeDoc().normalized, tags: ['findMe'] } });
      await dal.persistArtwork(doc);
      const found = await dal.findBySourceId('met', TEST_SOURCE_OBJECT_ID);
      expect(found).not.toBeNull();
      expect(found?.normalized.tags).toContain('findMe');
      expect(found?.sourceObjectId).toBe(TEST_SOURCE_OBJECT_ID);
    });

    it('returns null when no document exists', async () => {
      const found = await dal.findBySourceId('met', TEST_SOURCE_OBJECT_ID);
      expect(found).toBeNull();
    });
  });

  describe('findCollectionPage', () => {
    it('returns persisted documents with pagination', async () => {
      const doc = makeDoc();
      await dal.persistArtwork(doc);
      const result = await dal.findCollectionPage({ page: 1, limit: 10 });
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      const found = result.items.find((d) => d.sourceObjectId === TEST_SOURCE_OBJECT_ID);
      expect(found).toBeDefined();
      expect(found?.sourceObjectId).toBe(TEST_SOURCE_OBJECT_ID);
    });

    it('filters by tags (AND)', async () => {
      const doc = makeDoc({ normalized: { ...makeDoc().normalized, tags: ['test', 'paintings'] } });
      await dal.persistArtwork(doc);
      const match = await dal.findCollectionPage({ page: 1, limit: 10, tags: ['test', 'paintings'] });
      expect(match.items).toHaveLength(1);
      const noMatch = await dal.findCollectionPage({ page: 1, limit: 10, tags: ['nonexistent'] });
      expect(noMatch.items).toHaveLength(0);
    });
  });

  describe('findLastImportedObjectIds', () => {
    afterEach(async () => {
      await deleteFindLastTestDocuments();
    });

    it('returns sourceObjectIds ordered by metadata.importedAt descending', async () => {
      const doc1 = makeDoc({ sourceObjectId: FIND_LAST_IDS[0] });
      const doc2 = makeDoc({ sourceObjectId: FIND_LAST_IDS[1] });
      await dal.persistArtwork(doc1);
      await new Promise((r) => setTimeout(r, 10));
      await dal.persistArtwork(doc2);

      const ids = await dal.findLastImportedObjectIds('met', 10);
      expect(ids).toContain(FIND_LAST_IDS[0]);
      expect(ids).toContain(FIND_LAST_IDS[1]);
      const idxFirst = ids.indexOf(FIND_LAST_IDS[1]);
      const idxSecond = ids.indexOf(FIND_LAST_IDS[0]);
      expect(idxFirst).toBeGreaterThanOrEqual(0);
      expect(idxSecond).toBeGreaterThanOrEqual(0);
      expect(idxFirst).toBeLessThan(idxSecond);
    });

    it('returns empty array for source with no documents', async () => {
      const ids = await dal.findLastImportedObjectIds('other_source', 10);
      expect(ids).toEqual([]);
    });

    it('respects limit', async () => {
      const doc1 = makeDoc({ sourceObjectId: FIND_LAST_IDS[0] });
      const doc2 = makeDoc({ sourceObjectId: FIND_LAST_IDS[1] });
      await dal.persistArtwork(doc1);
      await dal.persistArtwork(doc2);

      const ids = await dal.findLastImportedObjectIds('met', 1);
      expect(ids).toHaveLength(1);
    });
  });
});
