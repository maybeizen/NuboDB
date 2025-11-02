import type { Document } from '../types';

export class QueryProjector<T = Document> {
  async project(
    documents: T[],
    projection: { [field: string]: 0 | 1 }
  ): Promise<T[]> {
    if (documents.length === 0) return documents;

    try {
      // @ts-ignore - Dynamic import for optional native bindings
      const { NativeFilterEngine } = await import('../../native/bindings');
      if (NativeFilterEngine.isAvailable()) {
        try {
          const result = await NativeFilterEngine.projectDocuments(documents, projection);
          return result as T[];
        } catch {
          return this.projectFallback(documents, projection);
        }
      }
    } catch {}

    return this.projectFallback(documents, projection);
  }

  private projectFallback(
    documents: T[],
    projection: { [field: string]: 0 | 1 }
  ): T[] {
    const projectionEntries = Object.entries(projection);
    const includeFields = projectionEntries
      .filter(([_, value]) => value === 1)
      .map(([field, _]) => field);

    const excludeFields = projectionEntries
      .filter(([_, value]) => value === 0)
      .map(([field, _]) => field);

    return documents.map(document => {
      const projected: Record<string, unknown> = {};

      if (includeFields.length > 0) {
        for (const field of includeFields) {
          if (Object.prototype.hasOwnProperty.call(document, field)) {
            projected[field] = (document as Record<string, unknown>)[field];
          }
        }
      } else {
        const docKeys = Object.keys(document as Record<string, unknown>);
        for (const field of docKeys) {
          if (!excludeFields.includes(field)) {
            projected[field] = (document as Record<string, unknown>)[field];
          }
        }
      }

      return projected as T;
    });
  }
}