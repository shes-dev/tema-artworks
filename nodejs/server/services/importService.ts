/**
 * Import orchestration service. Delegates to services/import/* and DAL.
 * Used by importController; routes do not call this directly.
 */

import { MongoArtworkDAL } from '../dal/mongodbArtworkDAL.js';
import { getDb } from '../db/database.js';
import { importMetArtworkBatch } from './import/importMetArtworkBatch.js';
import { loadDemoDataAsArtworkDocuments } from './import/loadDemoData.js';
import { computeLatestImportSummary, type SummaryResponse } from './import/diffLatestImport.js';

export interface StartMetImportResult {
  jobId: string;
  status: string;
}

/**
 * Start a MET import (demo or objectIds). Returns immediately with jobId and status;
 * actual import runs in the background. Background errors are logged only.
 */
export async function startMetImport(body: {
  objectIds?: number[];
  demo?: boolean;
}): Promise<StartMetImportResult> {
  const jobId = `job-${Date.now()}`;
  const runImportedAt = new Date();

  if (body.demo === true) {
    const dal = new MongoArtworkDAL();
    void loadDemoDataAsArtworkDocuments(runImportedAt)
      .then(async (docs) => {
        for (const doc of docs) {
          await dal.persistArtwork(doc);
        }
      })
      .catch((err) => {
        console.error('Import batch (demo) failed:', err);
      });
    return { jobId, status: 'started' };
  }

  const objectIds = Array.isArray(body?.objectIds) ? body.objectIds : [];
  if (objectIds.length > 0) {
    const dal = new MongoArtworkDAL();
    void importMetArtworkBatch(objectIds, dal, {
      concurrency: 2,
      importedAt: runImportedAt
    }).catch((err) => {
      console.error('Import batch failed:', err);
    });
  }

  return { jobId, status: 'started' };
}

/**
 * Compute the latest import summary (diff vs previous snapshot). Returns null when
 * there is no previous snapshot to compare.
 */
export async function getLatestImportSummary(): Promise<SummaryResponse | null> {
  const db = await getDb();
  return computeLatestImportSummary(db);
}
