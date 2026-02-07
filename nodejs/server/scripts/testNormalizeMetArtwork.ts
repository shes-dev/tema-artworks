/**
 * Phase 3 — Test Stage 3: normalizeMetArtwork field mapping; raw unchanged.
 */

import { normalizeMetArtwork } from '../services/import/metNormalization.js';

const raw = {
  title: 'Starry Night',
  artistDisplayName: 'Van Gogh',
  primaryImage: 'img.jpg',
  additionalImages: ['a.jpg'],
  department: 'Paintings',
};

const validation = { status: 'ok' as const, issues: [] };

const normalized = normalizeMetArtwork(raw, validation);

console.log('Normalized:', normalized);
console.log('Raw unchanged:', raw.artistDisplayName === 'Van Gogh');

const checks = [
  normalized.artistName === 'Van Gogh',
  normalized.images.primary === 'img.jpg',
  Array.isArray(normalized.images.additional) && normalized.images.additional.includes('a.jpg'),
  normalized.tags.includes('Paintings'),
  normalized.title === 'Starry Night',
  raw.artistDisplayName === 'Van Gogh',
];

if (checks.every(Boolean)) {
  console.log('Stage 3 (normalize): mapping and immutability OK.');
  process.exit(0);
} else {
  console.error('Assertions failed:', checks);
  process.exit(1);
}
