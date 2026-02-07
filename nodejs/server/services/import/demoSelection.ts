/**
 * Demo-mode selection helpers only. Pure functions; no validation, normalization, or DAL.
 * Used to deterministically choose which object IDs to import for a "changing pull" demo.
 */

/** Fixed seed when no previous import exists. Valid MET object IDs. */
const DEFAULT_SEED_OBJECT_IDS: number[] = [436121, 437234, 438001, 439002, 440003, 441004, 442005, 443006, 444007, 445008];

/** Deterministic pool for getNextMetObjectIds (ordered). */
const MET_OBJECT_ID_POOL: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  100, 101, 102, 200, 201, 202, 300, 301, 400, 401, 436121, 437234, 438001, 439002, 440003,
];

/**
 * Return previous IDs if provided and non-empty; otherwise return default seed.
 * Caller is responsible for supplying previousIds (e.g. from DAL or storage).
 */
export function getLastImportedObjectIds(previousIds: number[] | null): number[] {
  if (previousIds != null && previousIds.length > 0) return previousIds;
  return [...DEFAULT_SEED_OBJECT_IDS];
}

/**
 * Return up to `count` object IDs from a deterministic pool that are not in `exclude`.
 */
export function getNextMetObjectIds(options: {
  exclude: number[];
  count: number;
}): number[] {
  const { exclude, count } = options;
  const excludeSet = new Set(exclude);
  const out: number[] = [];
  for (const id of MET_OBJECT_ID_POOL) {
    if (out.length >= count) break;
    if (!excludeSet.has(id)) out.push(id);
  }
  return out;
}

/**
 * Build the next pull set: first `stableCount` from previous, then `totalCount - stableCount` new IDs.
 */
export function selectMetObjectIdsForImport(options: {
  previousIds: number[] | null;
  totalCount: number;
  stableCount: number;
}): number[] {
  const { previousIds, totalCount, stableCount } = options;
  const prev = getLastImportedObjectIds(previousIds);
  const stableIds = prev.slice(0, stableCount);
  const newIds = getNextMetObjectIds({ exclude: prev, count: totalCount - stableCount });
  return [...stableIds, ...newIds];
}
