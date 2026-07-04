import { jest } from '@jest/globals';
import type { IArtworkDAL } from '../../dal/artworkDAL.types.js';
import type { ArtworkDocument } from '../../models/Artwork.js';
import {
  getDailyArtwork,
  isValidDateKey,
  selectDailyMetObjectId,
} from '../../services/dailyArtwork.js';

function makeDoc(
  sourceObjectId: number,
  overrides: Partial<ArtworkDocument> = {}
): ArtworkDocument {
  return {
    source: 'met',
    sourceObjectId,
    raw: { objectID: sourceObjectId, primaryImageSmall: 'https://example.com/fallback.jpg' },
    normalized: {
      title: 'Daily Artwork',
      artistName: 'Artist Name',
      objectDate: '1889',
      images: {
        primary: 'https://example.com/primary.jpg',
        additional: [],
      },
      tags: [],
    },
    validation: { status: 'ok', issues: [] },
    metadata: { importedAt: new Date('2026-07-04T00:00:00.000Z'), version: 'v1' },
    ...overrides,
  };
}

function createDal(doc: ArtworkDocument | null): IArtworkDAL {
  return {
    persistArtwork: async (persistedDoc) => persistedDoc,
    findBySourceId: async () => doc,
    findCollectionPage: async () => ({ items: [], total: 0 }),
    findLastImportedObjectIds: async () => [],
  };
}

describe('dailyArtwork service', () => {
  it('validates date_key format strictly', () => {
    expect(isValidDateKey('2026-07-04')).toBe(true);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('07-04-2026')).toBe(false);
  });

  it('returns a flat payload from an existing curated MET record', async () => {
    const dateKey = '2026-07-04';
    const sourceObjectId = selectDailyMetObjectId(dateKey);
    const payload = await getDailyArtwork(createDal(makeDoc(sourceObjectId)), { dateKey });

    expect(payload).toEqual({
      date_key: dateKey,
      title: 'Daily Artwork',
      artist: 'Artist Name',
      museum: 'The Metropolitan Museum of Art',
      object_date: '1889',
      image_url: 'https://example.com/primary.jpg',
      artwork_url: `https://www.metmuseum.org/art/collection/search/${sourceObjectId}`,
      explanation: 'Artist Name, 1889. From The Metropolitan Museum of Art collection.',
      source: 'met',
      source_object_id: sourceObjectId,
      image_credit: 'The Metropolitan Museum of Art',
    });
  });

  it('lazily imports the selected MET record when it is missing from storage', async () => {
    const dateKey = '2026-07-05';
    const sourceObjectId = selectDailyMetObjectId(dateKey);
    const importMetArtworkFn = jest.fn(async () => makeDoc(sourceObjectId));

    const payload = await getDailyArtwork(createDal(null), { dateKey }, { importMetArtworkFn });

    expect(importMetArtworkFn).toHaveBeenCalledWith(
      sourceObjectId,
      expect.any(Object),
      expect.objectContaining({ importedAt: expect.any(Date) })
    );
    expect(payload.source_object_id).toBe(sourceObjectId);
  });

  it('keeps optional display fields stable with nulls and uses image fallback data', async () => {
    const dateKey = '2026-07-06';
    const sourceObjectId = selectDailyMetObjectId(dateKey);
    const doc = makeDoc(sourceObjectId, {
      raw: { objectID: sourceObjectId, primaryImageSmall: 'https://example.com/small.jpg' },
      normalized: {
        title: undefined,
        artistName: undefined,
        objectDate: undefined,
        images: { primary: undefined, additional: [] },
        tags: [],
      },
    });

    const payload = await getDailyArtwork(createDal(doc), { dateKey });

    expect(payload.title).toBeNull();
    expect(payload.artist).toBeNull();
    expect(payload.object_date).toBeNull();
    expect(payload.image_url).toBe('https://example.com/small.jpg');
    expect(payload.explanation).toBe('From The Metropolitan Museum of Art collection.');
  });
});
