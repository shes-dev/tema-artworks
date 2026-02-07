/**
 * Pipeline test: full import pipeline with mock DAL. No Mongo, no network.
 * Mock source returns fixed raw; mock DAL returns doc as-is.
 */

import { jest } from '@jest/globals';
import type { IArtworkDAL } from '../../dal/artworkDAL.types.js';
import type { ArtworkDocument } from '../../models/Artwork.js';
import type { IArtworkSource } from '../../sources/artworkSource.types.js';
import { importArtwork } from '../../services/import/importArtwork.js';

const mockRaw = {
  objectID: 12345,
  title: 'Pipeline Test',
  artistDisplayName: 'Test Artist',
  primaryImage: 'https://example.com/primary.jpg',
  additionalImages: ['https://example.com/a.jpg'],
  department: 'Paintings',
};

const mockSource: IArtworkSource = {
  async fetchOne() {
    return { raw: { ...mockRaw }, sourceId: 12345 };
  },
};

describe('importArtwork pipeline', () => {
  it('runs full pipeline and calls DAL exactly once', async () => {
    const persist = jest.fn(async (doc: ArtworkDocument) => doc);
    const mockDAL: IArtworkDAL = {
      persistArtwork: persist,
      findBySourceId: jest.fn(async () => null),
      findCollectionPage: jest.fn(async () => ({ items: [], total: 0 })),
      findLastImportedObjectIds: jest.fn(async () => []),
    };

    const result = await importArtwork(mockSource, 12345, mockDAL);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it('returned document includes source, sourceObjectId, raw, normalized, validation, metadata', async () => {
    const mockDAL: IArtworkDAL = {
      persistArtwork: jest.fn(async (doc: ArtworkDocument) => doc),
      findBySourceId: jest.fn(async () => null),
      findCollectionPage: jest.fn(async () => ({ items: [], total: 0 })),
      findLastImportedObjectIds: jest.fn(async () => []),
    };

    const result = await importArtwork(mockSource, 12345, mockDAL);

    expect(result.source).toBe('met');
    expect(result.sourceObjectId).toBe(12345);
    expect(result.raw).toBeDefined();
    expect(result.normalized).toBeDefined();
    expect(result.validation).toBeDefined();
    expect(result.validation.status).toBeDefined();
    expect(Array.isArray(result.validation.issues)).toBe(true);
    expect(result.metadata).toBeDefined();
    expect(result.metadata.importedAt).toBeInstanceOf(Date);
    expect(result.metadata.version).toBe('v1');
  });

  it('raw payload is unchanged (same reference as mock returned)', async () => {
    let capturedDoc: ArtworkDocument | null = null;
    const mockDAL: IArtworkDAL = {
      persistArtwork: jest.fn(async (doc: ArtworkDocument) => {
        capturedDoc = doc;
        return doc;
      }),
      findBySourceId: jest.fn(async () => null),
      findCollectionPage: jest.fn(async () => ({ items: [], total: 0 })),
      findLastImportedObjectIds: jest.fn(async () => []),
    };

    await importArtwork(mockSource, 12345, mockDAL);

    expect(capturedDoc).not.toBeNull();
    const raw = capturedDoc!.raw as typeof mockRaw;
    expect(raw.objectID).toBe(mockRaw.objectID);
    expect(raw.title).toBe(mockRaw.title);
    expect(raw.artistDisplayName).toBe(mockRaw.artistDisplayName);
  });
});
