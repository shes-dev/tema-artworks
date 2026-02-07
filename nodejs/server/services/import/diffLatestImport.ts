/**
 * Diff service for Review Changes: compare current artworks with the previous
 * import snapshot (from artworks_history). Latest import = max(metadata.importedAt)
 * in artworks; previous snapshot = max(history.importedAt) in history where
 * history.importedAt < latest. NEW = in current not previous; UPDATED = in both
 * with different normalized; REMOVED = in previous not current. Deterministic; no randomness.
 */

import type { Db } from 'mongodb';
import type { ArtworkDocument } from '../../models/Artwork.js';
import type { ArtworkNormalized } from '../../models/Artwork.js';

const ARTWORKS_COLLECTION = 'artworks';
const HISTORY_COLLECTION = 'artworks_history';

export interface SummaryItem {
  source: string;
  sourceObjectId: number;
  title?: string;
  thumbnail?: string;
  changeType: 'new' | 'updated' | 'removed';
}

export interface SummaryResponse {
  importedAt: string;
  version: string;
  summary: { new: number; updated: number; removed: number };
  items: SummaryItem[];
}

function normalizedEqual(a: ArtworkNormalized, b: ArtworkNormalized): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function key(source: string, sourceObjectId: number): string {
  return `${source}:${sourceObjectId}`;
}

const DEBUG_LOG = (payload: Record<string, unknown>) => {
  fetch('http://127.0.0.1:7243/ingest/720206ef-7f62-4911-96d2-50a76ea3d4e3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {});
};

/**
 * Compute the latest import summary by diffing current artworks against the
 * previous snapshot in artworks_history. Returns null if there is no previous
 * snapshot to compare (no history or no history.importedAt < latestImportAt).
 */
export async function computeLatestImportSummary(db: Db): Promise<SummaryResponse | null> {
  // #region agent log
  DEBUG_LOG({ location: 'diffLatestImport.ts:entry', message: 'computeLatestImportSummary called', data: { dbName: db.databaseName }, hypothesisId: 'H5' });
  // #endregion
  const artworks = db.collection<ArtworkDocument>(ARTWORKS_COLLECTION);
  const history = db.collection(HISTORY_COLLECTION);

  const latestDoc = await artworks
    .find({ 'metadata.importedAt': { $exists: true, $ne: null } })
    .sort({ 'metadata.importedAt': -1 })
    .limit(1)
    .project({ 'metadata.importedAt': 1, 'metadata.version': 1 })
    .next();

  // #region agent log
  DEBUG_LOG({ location: 'diffLatestImport.ts:afterLatest', message: 'latestDoc from artworks', data: { hasLatestDoc: !!latestDoc, latestImportAt: latestDoc?.metadata?.importedAt }, hypothesisId: 'H2' });
  // #endregion
  if (!latestDoc?.metadata?.importedAt) {
    // #region agent log
    DEBUG_LOG({ location: 'diffLatestImport.ts:returnNull', message: 'return null: no latestDoc or no metadata.importedAt', data: {}, hypothesisId: 'H2' });
    // #endregion
    return null;
  }

  const latestImportAt = latestDoc.metadata.importedAt instanceof Date
    ? latestDoc.metadata.importedAt
    : new Date(latestDoc.metadata.importedAt);
  const version = latestDoc.metadata?.version ?? 'v1';

  const previousDoc = await history
    .find({ 'history.importedAt': { $lt: latestImportAt } })
    .sort({ 'history.importedAt': -1 })
    .limit(1)
    .project({ 'history.importedAt': 1 })
    .next();

  // #region agent log
  const historyCount = await history.countDocuments({});
  const historyBeforeCount = await history.countDocuments({ 'history.importedAt': { $lt: latestImportAt } });
  DEBUG_LOG({ location: 'diffLatestImport.ts:afterPrevious', message: 'previous snapshot lookup', data: { hasPreviousDoc: !!previousDoc, historyCount, historyBeforeCount, latestImportAt: latestImportAt.toISOString() }, hypothesisId: 'H1,H3' });
  // #endregion

  const currentDocs = await artworks
    .find({ 'metadata.importedAt': latestImportAt })
    .toArray();

  const currentMap = new Map<string, ArtworkDocument>();
  for (const d of currentDocs) {
    currentMap.set(key(d.source, d.sourceObjectId), d);
  }

  let previousMap = new Map<string, { source: string; sourceObjectId: number; normalized: ArtworkNormalized }>();
  if (previousDoc?.history?.importedAt) {
    const previousSnapshotAt = previousDoc.history.importedAt instanceof Date
      ? previousDoc.history.importedAt
      : new Date(previousDoc.history.importedAt);
    const previousDocs = await history
      .find({ 'history.importedAt': previousSnapshotAt })
      .toArray();
    for (const d of previousDocs) {
      const doc = d as unknown as ArtworkDocument & { history: { importedAt: Date; source: string; sourceObjectId: number } };
      previousMap.set(key(doc.source, doc.sourceObjectId), {
        source: doc.source,
        sourceObjectId: doc.sourceObjectId,
        normalized: doc.normalized ?? { images: { additional: [] }, tags: [] },
      });
    }
  }
  // When there is no previous snapshot (e.g. first import), we treat previous as empty:
  // all current artworks are reported as "new". No 501.

  const allKeys = new Set([...currentMap.keys(), ...previousMap.keys()]);
  const items: SummaryItem[] = [];
  let newCount = 0;
  let updatedCount = 0;
  let removedCount = 0;

  const sortedKeys = Array.from(allKeys).sort((a, b) => a.localeCompare(b));

  for (const k of sortedKeys) {
    const cur = currentMap.get(k);
    const prev = previousMap.get(k);

    if (cur && !prev) {
      newCount++;
      items.push({
        source: cur.source,
        sourceObjectId: cur.sourceObjectId,
        title: cur.normalized?.title,
        thumbnail: cur.normalized?.images?.primary,
        changeType: 'new',
      });
    } else if (!cur && prev) {
      removedCount++;
      items.push({
        source: prev.source,
        sourceObjectId: prev.sourceObjectId,
        title: prev.normalized?.title,
        thumbnail: prev.normalized?.images?.primary,
        changeType: 'removed',
      });
    } else if (cur && prev) {
      const same = normalizedEqual(
        cur.normalized ?? { images: { additional: [] }, tags: [] },
        prev.normalized
      );
      if (!same) {
        updatedCount++;
        items.push({
          source: cur.source,
          sourceObjectId: cur.sourceObjectId,
          title: cur.normalized?.title,
          thumbnail: cur.normalized?.images?.primary,
          changeType: 'updated',
        });
      }
    }
  }

  return {
    importedAt: latestImportAt.toISOString(),
    version,
    summary: { new: newCount, updated: updatedCount, removed: removedCount },
    items,
  };
}
