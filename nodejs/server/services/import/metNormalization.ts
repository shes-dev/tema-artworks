/**
 * Stage 3 — Normalization. Build normalized object from raw; never mutate raw.
 * Only read fields that are present (validation may be partial). Tags from department/culture.
 */

import type { ArtworkNormalized } from '../../models/Artwork.js';
import type { ValidationResult } from './metValidation.js';

interface MetRawLike {
  objectID?: number;
  title?: string;
  artistDisplayName?: string;
  objectDate?: string;
  medium?: string;
  department?: string;
  primaryImage?: string;
  primaryImageSmall?: string;
  additionalImages?: string[];
  culture?: string;
}

function parseYearRange(objectDate: string | undefined): { yearStart?: number; yearEnd?: number } {
  if (!objectDate || typeof objectDate !== 'string') return {};
  const trimmed = objectDate.trim();
  const numbers = trimmed.match(/\d{4}/g);
  if (!numbers || numbers.length === 0) return {};
  const parsed = numbers.map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
  if (parsed.length === 0) return {};
  const min = Math.min(...parsed);
  const max = Math.max(...parsed);
  return { yearStart: min, yearEnd: max };
}

export function normalizeMetArtwork(
  raw: unknown,
  _validation: ValidationResult
): ArtworkNormalized {
  const r = raw as MetRawLike;

  const additionalImages = Array.isArray(r?.additionalImages) ? r.additionalImages : [];
  const tags: string[] = [];
  if (typeof r?.department === 'string' && r.department.trim()) tags.push(r.department.trim());
  if (typeof r?.culture === 'string' && r.culture.trim()) tags.push(r.culture.trim());

  const { yearStart, yearEnd } = parseYearRange(r?.objectDate);

  return {
    title: typeof r?.title === 'string' ? r.title : undefined,
    artistName: typeof r?.artistDisplayName === 'string' ? r.artistDisplayName : undefined,
    objectDate: typeof r?.objectDate === 'string' ? r.objectDate : undefined,
    yearStart,
    yearEnd,
    medium: typeof r?.medium === 'string' ? r.medium : undefined,
    classification: typeof r?.department === 'string' ? r.department : undefined,
    images: {
      primary: typeof r?.primaryImage === 'string' ? r.primaryImage : undefined,
      additional: additionalImages,
    },
    tags,
  };
}
