import type { Collection } from '../Collection';
import type { DatabaseStats } from '../types';

/** Calculates database statistics */
export class DatabaseStatsCalculator {
  constructor(private startTime: number) {}

  /** Calculate database statistics
   * @param collections Map of collections
   * @returns Database statistics */
  async calculateStats(
    collections: Map<string, Collection>
  ): Promise<DatabaseStats> {
    let totalDocuments = 0;
    let totalSize = 0;
    let indexes = 0;

    for (const collection of collections.values()) {
      const stats = await collection.stats();
      totalDocuments += stats.totalDocuments;
      totalSize += stats.totalSize;
      indexes += stats.indexes;
    }

    return {
      collections: collections.size,
      totalDocuments,
      totalSize,
      indexes,
      uptime: Date.now() - this.startTime,
    };
  }
}

