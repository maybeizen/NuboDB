import type { Collection } from '../Collection';
import { DatabaseError } from '../../errors/DatabaseError';

/** Manages database validation and health checks */
export class DatabaseValidator {
  constructor(
    private collections: Map<string, Collection>,
    private log: (message: string, level: string) => void
  ) {}

  /** Validate database integrity
   * @returns Validation result with health status */
  async validate(): Promise<{
    isValid: boolean;
    issues: string[];
    collections: Record<string, { documents: number; issues: string[] }>;
  }> {
    const issues: string[] = [];
    const collections: Record<string, { documents: number; issues: string[] }> =
      {};

    try {
      for (const [name, collection] of this.collections) {
        const collectionIssues: string[] = [];
        const stats = await collection.stats();

        if (stats.totalDocuments === 0 && stats.cacheSize > 0) {
          collectionIssues.push('Cache-storage mismatch detected');
        }

        collections[name] = {
          documents: stats.totalDocuments,
          issues: collectionIssues,
        };

        issues.push(
          ...collectionIssues.map(issue => `Collection '${name}': ${issue}`)
        );
      }

      return {
        isValid: issues.length === 0,
        issues,
        collections,
      };
    } catch (error) {
      const errorMsg = `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMsg, 'error');
      throw new DatabaseError(errorMsg, 'VALIDATION_ERROR');
    }
  }

  /** Check if database path is accessible
   * @param storage Storage instance
   * @param path Database path
   * @returns True if accessible */
  async isAccessible(
    storage: { ensureDirectory: (path: string) => Promise<void> },
    path: string
  ): Promise<boolean> {
    try {
      await storage.ensureDirectory(path);
      return true;
    } catch {
      return false;
    }
  }
}

