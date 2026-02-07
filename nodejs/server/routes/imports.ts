/**
 * GET /imports/latest/summary — diff of current artworks vs previous snapshot (history collection).
 * Returns 501 when there is no previous snapshot to compare.
 */

import { Router } from 'express';
import { getLatestSummary } from '../controllers/importController.js';

const router = Router();

router.get('/imports/latest/summary', getLatestSummary);

export default router;
