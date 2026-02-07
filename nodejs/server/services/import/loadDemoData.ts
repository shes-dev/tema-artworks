/**
 * Load artwork documents from the demoData folder.
 * Discovers *.json files at runtime so user add/delete/modify is reflected.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { ArtworkDocument } from '../../models/Artwork.js';
import { validateMetRaw } from './metValidation.js';
import { normalizeMetArtwork } from './metNormalization.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// From dist/services/import/loadDemoData.js we need server/demoData
const DEMO_DATA_DIR = path.join(__dirname, '..', '..', '..', 'demoData');

/**
 * Discover all *.json files in demoData, read/validate/normalize each, and return
 * ArtworkDocument[] with the given importedAt. Skips non-numeric filenames and
 * files that fail to parse or validate. Returns [] if demoData directory is missing.
 */
export async function loadDemoDataAsArtworkDocuments(importedAt: Date): Promise<ArtworkDocument[]> {
  if (!fs.existsSync(DEMO_DATA_DIR)) {
    console.warn(`demoData directory not found: ${DEMO_DATA_DIR}`);
    return [];
  }

  const documents: ArtworkDocument[] = [];
  const files = fs.readdirSync(DEMO_DATA_DIR).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const base = path.basename(file, '.json');
    const objectIdFromFilename = parseInt(base, 10);
    if (Number.isNaN(objectIdFromFilename)) {
      continue;
    }

    const filePath = path.join(DEMO_DATA_DIR, file);
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const raw = JSON.parse(fileContent);

      const { raw: rawUnchanged, validation } = validateMetRaw(raw);
      const normalized = normalizeMetArtwork(rawUnchanged, validation);

      const rawObj = raw as Record<string, unknown>;
      const sourceObjectId = typeof rawObj?.objectID === 'number' ? rawObj.objectID : objectIdFromFilename;

      const document: ArtworkDocument = {
        source: 'met',
        sourceObjectId,
        raw: rawUnchanged,
        normalized,
        validation: {
          status: validation.status,
          issues: validation.issues,
        },
        metadata: {
          importedAt,
          version: 'v1',
        },
      };

      documents.push(document);
    } catch (err) {
      console.warn(`Skipping demo data file ${filePath}:`, err);
    }
  }

  return documents;
}
