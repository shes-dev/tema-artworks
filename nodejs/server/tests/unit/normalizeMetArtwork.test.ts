/**
 * Unit tests for normalizeMetArtwork. No DB, no network.
 * Asserts field mapping and that raw input is unchanged.
 */

import { normalizeMetArtwork } from '../../services/import/metNormalization.js';
import type { ValidationResult } from '../../services/import/metValidation.js';

const okValidation: ValidationResult = { status: 'ok', issues: [] };

describe('normalizeMetArtwork', () => {
  it('maps artistDisplayName to artistName', () => {
    const raw = { objectID: 1, artistDisplayName: 'Van Gogh' };
    const normalized = normalizeMetArtwork(raw, okValidation);
    expect(normalized.artistName).toBe('Van Gogh');
    expect(raw.artistDisplayName).toBe('Van Gogh');
  });

  it('maps primaryImage to images.primary', () => {
    const raw = { objectID: 1, primaryImage: 'https://example.com/img.jpg' };
    const normalized = normalizeMetArtwork(raw, okValidation);
    expect(normalized.images.primary).toBe('https://example.com/img.jpg');
    expect(normalized.images.additional).toEqual([]);
  });

  it('maps additionalImages to images.additional', () => {
    const raw = { objectID: 1, additionalImages: ['a.jpg', 'b.jpg'] };
    const normalized = normalizeMetArtwork(raw, okValidation);
    expect(normalized.images.additional).toEqual(['a.jpg', 'b.jpg']);
  });

  it('derives tags from department and culture', () => {
    const raw = { objectID: 1, department: 'Paintings', culture: 'French' };
    const normalized = normalizeMetArtwork(raw, okValidation);
    expect(normalized.tags).toContain('Paintings');
    expect(normalized.tags).toContain('French');
    expect(normalized.tags).toHaveLength(2);
  });

  it('trims and skips empty department/culture', () => {
    const raw = { objectID: 1, department: '  ', culture: '' };
    const normalized = normalizeMetArtwork(raw, okValidation);
    expect(normalized.tags).toEqual([]);
  });

  it('handles optional date parsing safely (objectDate string, yearStart/yearEnd)', () => {
    const raw = { objectID: 1, objectDate: '1850-1900' };
    const normalized = normalizeMetArtwork(raw, okValidation);
    expect(normalized.objectDate).toBe('1850-1900');
    expect(normalized.yearStart).toBe(1850);
    expect(normalized.yearEnd).toBe(1900);
  });

  it('handles missing or non-string objectDate safely', () => {
    const raw1 = { objectID: 1 };
    const normalized1 = normalizeMetArtwork(raw1, okValidation);
    expect(normalized1.objectDate).toBeUndefined();
    expect(normalized1.yearStart).toBeUndefined();
    expect(normalized1.yearEnd).toBeUndefined();

    const raw2 = { objectID: 1, objectDate: '' };
    const normalized2 = normalizeMetArtwork(raw2, okValidation);
    expect(normalized2.yearStart).toBeUndefined();
    expect(normalized2.yearEnd).toBeUndefined();
  });

  it('does not mutate raw input', () => {
    const raw = {
      objectID: 1,
      title: 'Starry Night',
      artistDisplayName: 'Van Gogh',
      primaryImage: 'img.jpg',
      additionalImages: ['a.jpg'],
      department: 'Paintings',
    };
    const before = { ...raw };
    normalizeMetArtwork(raw, okValidation);
    expect(raw).toEqual(before);
    expect(raw.artistDisplayName).toBe('Van Gogh');
  });
});
