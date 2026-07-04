import type { IArtworkDAL } from '../dal/artworkDAL.types.js';
import type { ArtworkDocument } from '../models/Artwork.js';
import { importMetArtwork } from './import/importMetArtwork.js';

const MET_MUSEUM_NAME = 'The Metropolitan Museum of Art';
const MET_MUSEUM_SEARCH_URL = 'https://www.metmuseum.org/art/collection/search';

// Prefer records that already exist in demoData so local startup seeding makes the
// daily endpoint useful without a broad live import.
const DAILY_MET_OBJECT_IDS = [
  904354,
  41918,
  437935,
  394744,
  203012,
  394311,
  386907,
  394376,
] as const;

interface MetRawArtworkLike {
  primaryImageSmall?: string;
}

export interface DailyArtworkPayload {
  date_key: string;
  title: string | null;
  artist: string | null;
  museum: string;
  object_date: string | null;
  image_url: string | null;
  artwork_url: string;
  explanation: string;
  source: 'met';
  source_object_id: number;
  image_credit: string;
}

export interface GetDailyArtworkOptions {
  dateKey?: string;
}

export interface DailyArtworkDependencies {
  now?: () => Date;
  importMetArtworkFn?: typeof importMetArtwork;
}

export function isValidDateKey(dateKey: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;

  const [year, month, day] = dateKey.split('-').map((part) => parseInt(part, 10));
  if ([year, month, day].some((part) => Number.isNaN(part))) return false;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function getJerusalemDateKey(now = new Date()): string {
  const localNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
  const year = localNow.getFullYear();
  const month = String(localNow.getMonth() + 1).padStart(2, '0');
  const day = String(localNow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function selectDailyMetObjectId(dateKey: string): number {
  let hash = 0;
  for (const char of dateKey) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return DAILY_MET_OBJECT_IDS[hash % DAILY_MET_OBJECT_IDS.length];
}

function toNullableString(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildMetArtworkUrl(sourceObjectId: number): string {
  return `${MET_MUSEUM_SEARCH_URL}/${sourceObjectId}`;
}

function buildExplanation(doc: ArtworkDocument): string {
  const title = toNullableString(doc.normalized.title);
  const artist = toNullableString(doc.normalized.artistName);
  const objectDate = toNullableString(doc.normalized.objectDate);

  if (artist && objectDate) {
    return `${artist}, ${objectDate}. From The Metropolitan Museum of Art collection.`;
  }
  if (artist) {
    return `By ${artist}. From The Metropolitan Museum of Art collection.`;
  }
  if (title && objectDate) {
    return `${title}, ${objectDate}. From The Metropolitan Museum of Art collection.`;
  }
  if (objectDate) {
    return `From The Metropolitan Museum of Art collection, dated ${objectDate}.`;
  }
  return 'From The Metropolitan Museum of Art collection.';
}

export function toDailyArtworkPayload(
  doc: ArtworkDocument,
  dateKey: string
): DailyArtworkPayload {
  const raw = (doc.raw ?? {}) as MetRawArtworkLike;
  const imageUrl =
    toNullableString(doc.normalized.images.primary) ??
    toNullableString(raw.primaryImageSmall);

  return {
    date_key: dateKey,
    title: toNullableString(doc.normalized.title),
    artist: toNullableString(doc.normalized.artistName),
    museum: MET_MUSEUM_NAME,
    object_date: toNullableString(doc.normalized.objectDate),
    image_url: imageUrl,
    artwork_url: buildMetArtworkUrl(doc.sourceObjectId),
    explanation: buildExplanation(doc),
    source: 'met',
    source_object_id: doc.sourceObjectId,
    image_credit: MET_MUSEUM_NAME,
  };
}

export async function getDailyArtwork(
  dal: IArtworkDAL,
  options: GetDailyArtworkOptions = {},
  dependencies: DailyArtworkDependencies = {}
): Promise<DailyArtworkPayload> {
  const now = dependencies.now?.() ?? new Date();
  const dateKey = options.dateKey ?? getJerusalemDateKey(now);
  const importMetArtworkFn = dependencies.importMetArtworkFn ?? importMetArtwork;

  const sourceObjectId = selectDailyMetObjectId(dateKey);
  let doc = await dal.findBySourceId('met', sourceObjectId);

  if (doc === null) {
    doc = await importMetArtworkFn(sourceObjectId, dal, { importedAt: now });
  }

  return toDailyArtworkPayload(doc, dateKey);
}
