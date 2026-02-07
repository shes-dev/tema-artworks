/**
 * Read APIs for the collection. GET /collection (list with pagination, tags, text search),
 * GET /collection/:source/:sourceObjectId (single artwork), and POST .../enrich (suggest tags via LLM).
 * Does not expose raw. Uses IArtworkDAL and llmDAL for enrich.
 */

import { Router, Request, Response } from 'express';
import type { IArtworkDAL } from '../dal/artworkDAL.types.js';
import { suggestTagsForArtwork } from '../dal/llmDAL.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function parseTags(query: Request['query'], key: string): string[] {
  const raw = query[key];
  if (raw === undefined) return [];
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string');
  return typeof raw === 'string' ? [raw] : [];
}

export function createCollectionRouter(dal: IArtworkDAL): Router {
  const router = Router();

  /**
   * GET /collection
   * Query: page (default 1), limit (default 10, max 100), tags[] (AND), query (free-text on title + tags).
   * Response: { items, total, page, limit }. Items are list projection (source, sourceObjectId, normalized, metadata.importedAt); no raw.
   */
  router.get('/collection', async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
      const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, parseInt(String(req.query.limit), 10) || DEFAULT_LIMIT)
      );
      const tags = parseTags(req.query, 'tags');
      const query = typeof req.query.query === 'string' ? req.query.query : undefined;

      const result = await dal.findCollectionPage({ page, limit, tags: tags.length ? tags : undefined, query });

      const items = result.items.map((doc) => ({
        source: doc.source,
        sourceObjectId: doc.sourceObjectId,
        normalized: doc.normalized ?? {},
        metadata: { importedAt: doc.metadata?.importedAt ?? new Date(0) },
      }));

      res.json({ items, total: result.total, page, limit });
    } catch (err) {
      console.error('GET /collection error:', err);
      res.status(500).json({ error: 'Failed to list collection' });
    }
  });

  /**
   * GET /collection/:source/:sourceObjectId
   * Returns canonical normalized view + image(s). No raw.
   */
  router.get('/collection/:source/:sourceObjectId', async (req: Request, res: Response) => {
    const source = Array.isArray(req.params.source) ? req.params.source[0] : req.params.source;
    const sourceObjectId = parseInt(
      Array.isArray(req.params.sourceObjectId) ? req.params.sourceObjectId[0] : req.params.sourceObjectId ?? '',
      10
    );
    if (source === undefined || Number.isNaN(sourceObjectId)) {
      res.status(400).json({ error: 'Invalid source or sourceObjectId' });
      return;
    }
    try {
      const doc = await dal.findBySourceId(source, sourceObjectId);
      if (doc === null) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json({
        source: doc.source,
        sourceObjectId: doc.sourceObjectId,
        normalized: doc.normalized,
      });
    } catch (err) {
      console.error('GET /collection/:source/:sourceObjectId error:', err);
      res.status(500).json({ error: 'Failed to get artwork' });
    }
  });

  /**
   * POST /collection/:source/:sourceObjectId/enrich
   * Load artwork, call LLM for tag suggestions, return { tags }. Optional body { "apply": true } merges
   * suggested tags into normalized.tags (no removals) and persists the document; response then includes applied: true.
   */
  router.post('/collection/:source/:sourceObjectId/enrich', async (req: Request, res: Response) => {
    const source = Array.isArray(req.params.source) ? req.params.source[0] : req.params.source;
    const sourceObjectId = parseInt(
      Array.isArray(req.params.sourceObjectId) ? req.params.sourceObjectId[0] : req.params.sourceObjectId ?? '',
      10
    );
    if (source === undefined || Number.isNaN(sourceObjectId)) {
      res.status(400).json({ error: 'Invalid source or sourceObjectId' });
      return;
    }
    const apply = req.body?.apply === true;
    try {
      const doc = await dal.findBySourceId(source, sourceObjectId);
      if (doc === null) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      const tags = await suggestTagsForArtwork({
        title: doc.normalized?.title,
        tags: doc.normalized?.tags,
        medium: doc.normalized?.medium,
        classification: doc.normalized?.classification,
      });
      if (apply) {
        const existing = doc.normalized?.tags ?? [];
        const merged = [...existing, ...tags.tags].filter((t, i, a) => a.indexOf(t) === i);
        doc.normalized.tags = merged;
        await dal.persistArtwork(doc);
        res.status(200).json({ tags: tags.tags, applied: true });
        return;
      }
      res.status(200).json({ tags: tags.tags });
    } catch (err) {
      console.error('POST /collection/:source/:sourceObjectId/enrich error:', err);
      res.status(500).json({ error: 'Enrichment failed. Check LLM configuration.' });
    }
  });

  return router;
}
