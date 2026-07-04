import { Router } from 'express';
import type { IArtworkDAL } from '../dal/artworkDAL.types.js';
import { requireTemaApiKey } from '../middleware/apiKeyAuth.js';
import {
  getDailyArtwork,
  isValidDateKey,
} from '../services/dailyArtwork.js';

export function createDailyArtworkRouter(artworkDAL: IArtworkDAL): Router {
  const router = Router();

  router.get('/daily-artwork', requireTemaApiKey(), async (req, res, next) => {
    try {
      const dateKey =
        typeof req.query.date_key === 'string' ? req.query.date_key : undefined;

      if (dateKey != null && !isValidDateKey(dateKey)) {
        res.status(400).json({ error: 'date_key must be YYYY-MM-DD' });
        return;
      }

      const payload = await getDailyArtwork(artworkDAL, { dateKey });
      res.status(200).json(payload);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
