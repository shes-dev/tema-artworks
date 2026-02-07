/**
 * Fetch demo MET artwork data and save to demoData folder.
 * Run once to populate demoData/*.json files for seeding the database.
 */

import { fetchMetObject } from '../services/import/fetchMetObject.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const DEMO_OBJECT_IDS = [823360, 203012, 438008, 437935, 488293, 386907, 394744, 394376, 394311, 904354, 41918];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEMO_DATA_DIR = path.join(__dirname, '..', 'demoData');

async function main() {
  // Ensure demoData directory exists
  if (!fs.existsSync(DEMO_DATA_DIR)) {
    fs.mkdirSync(DEMO_DATA_DIR, { recursive: true });
    console.log(`Created directory: ${DEMO_DATA_DIR}`);
  }

  console.log(`Fetching ${DEMO_OBJECT_IDS.length} MET objects...`);

  for (const objectId of DEMO_OBJECT_IDS) {
    try {
      console.log(`Fetching object ${objectId}...`);
      const raw = await fetchMetObject(objectId);
      const filePath = path.join(DEMO_DATA_DIR, `${objectId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf-8');
      console.log(`  Saved: ${filePath}`);
    } catch (err) {
      console.error(`  Failed to fetch object ${objectId}:`, err);
      process.exit(1);
    }
  }

  console.log(`\nDone! Fetched ${DEMO_OBJECT_IDS.length} objects to ${DEMO_DATA_DIR}`);
}

main().catch((err) => {
  console.error('fetchDemoData failed:', err);
  process.exit(1);
});
