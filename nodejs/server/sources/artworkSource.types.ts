/**
 * Artwork source contract — fetch raw data only. No validation or normalization.
 */

export interface IArtworkSource {
  /**
   * Fetch a single raw artwork payload from the source.
   * Must not validate or normalize.
   */
  fetchOne(id: string | number): Promise<{ raw: unknown; sourceId: string | number }>;

  /**
   * Optional batch fetch.
   * Default behavior may loop over fetchOne.
   */
  fetchBatch?(
    ids: Array<string | number>
  ): Promise<Array<{ raw: unknown; sourceId: string | number }>>;
}
