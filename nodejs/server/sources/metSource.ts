/**
 * MET Museum API source. Fetches raw data only; no validation or normalization.
 */

import type { IArtworkSource } from './artworkSource.types.js';
import { fetchMetObject } from '../services/import/fetchMetObject.js';

export class MetArtworkSource implements IArtworkSource {
  async fetchOne(id: string | number): Promise<{ raw: unknown; sourceId: string | number }> {
    const objectId = typeof id === 'number' ? id : Number(id);
    const raw = await fetchMetObject(objectId);
    return {
      raw,
      sourceId: objectId,
    };
  }
}
