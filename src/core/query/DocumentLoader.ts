import type { Document } from '../types';
import type { DocumentWithMetadata } from '../BaseCollection';
import type { FileStorage } from '../../storage/FileStorage';
import type { EncryptionManager } from '../../encryption/EncryptionManager';

/** Handles loading documents by IDs with cache optimization */
export class DocumentLoader<T = Document> {
  constructor(
    private storage: FileStorage,
    private encryptionManager: EncryptionManager | undefined,
    private cache: Map<string, T>,
    private collectionName: string,
    private maxCacheSize: number
  ) {}

  /** Load documents by IDs, using cache when available
   * Optimized to minimize passes and memory allocations
   * @param ids Array of document IDs to load
   * @returns Array of documents in the same order as IDs */
  async loadByIds(ids: string[]): Promise<T[]> {
    if (ids.length === 0) return [];

    const results: (T | null)[] = new Array(ids.length);
    const idsToLoad: Array<{ index: number; id: string }> = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (!id) continue;
      const cached = this.cache.get(id);
      if (cached) {
        results[i] = cached;
      } else {
        idsToLoad.push({ index: i, id });
      }
    }

    if (idsToLoad.length > 0) {
      const loadPromises = idsToLoad.map(({ id }) =>
        this.loadSingleDocument(id)
      );
      const loadedDocs = await Promise.all(loadPromises);

      for (let i = 0; i < loadedDocs.length; i++) {
        const doc = loadedDocs[i];
        if (doc) {
          const idx = idsToLoad[i]?.index;
          if (idx !== undefined) {
            results[idx] = doc;
          }
        }
      }
    }

    return results.filter((doc): doc is T => doc !== null);
  }

  /** Load a single document by ID
   * @param id Document ID
   * @returns Document or null if not found */
  private async loadSingleDocument(id: string): Promise<T | null> {
    try {
      const document = await this.storage.readDocument(this.collectionName, id);
      if (!document) {
        return null;
      }

      let decryptedDocument = document;
      if (this.encryptionManager && document.data) {
        decryptedDocument = this.encryptionManager.decryptObject(
          document.data as string
        );
      }

      if (this.cache.size < this.maxCacheSize) {
        this.cache.set(id, decryptedDocument as T);
      }

      return decryptedDocument as T;
    } catch {
      return null;
    }
  }
}
