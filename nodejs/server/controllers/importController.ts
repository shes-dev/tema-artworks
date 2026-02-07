import { Request, Response } from 'express';
import { startMetImport as startMetImportService, getLatestImportSummary } from '../services/importService.js';
import { asyncHandler } from './controllerWrapper.js';

export const startMetImport = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { objectIds?: number[]; demo?: boolean };
  const result = await startMetImportService(body);
  res.status(202).json(result);
});

export const getLatestSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await getLatestImportSummary();
  if (summary === null) {
    res.status(501).json({ error: 'No previous import to compare' });
    return;
  }
  res.status(200).json(summary);
});
