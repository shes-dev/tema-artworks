/**
 * Import route. Accepts { objectIds } or { demo: true }. Returns jobId + status; runs imports async.
 * When demo is true, loads all *.json from the demoData folder and persists them via the DAL (no live MET API).
 */

import { Router } from 'express';
import { startMetImport } from '../controllers/importController.js';

const router = Router();

router.post('/import/met', startMetImport);

export default router;
