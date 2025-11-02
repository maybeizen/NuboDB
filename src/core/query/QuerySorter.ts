import type { Document } from '../types';

export class QuerySorter<T = Document> {
  async sort(
    documents: T[],
    sort: { [field: string]: 1 | -1 } | Array<[string, 1 | -1]>
  ): Promise<T[]> {
    if (documents.length <= 1) return documents;

    try {
      // @ts-ignore - Dynamic import for optional native bindings
      const { NativeFilterEngine } = await import('../../native/bindings');
      if (NativeFilterEngine.isAvailable()) {
        try {
          const sortObj = Array.isArray(sort) 
            ? Object.fromEntries(sort) 
            : sort;
          const result = await NativeFilterEngine.sortDocuments(documents, sortObj);
          return result as T[];
        } catch {
          return this.sortFallback(documents, sort);
        }
      }
    } catch {}

    return this.sortFallback(documents, sort);
  }

  private sortFallback(
    documents: T[],
    sort: { [field: string]: 1 | -1 } | Array<[string, 1 | -1]>
  ): T[] {
    const sortArray = Array.isArray(sort) ? sort : Object.entries(sort);
    const sortFields = sortArray.map(([field, direction]) => ({
      field,
      direction,
    }));

    return documents.slice().sort((a, b) => {
      for (const { field, direction } of sortFields) {
        const comparison = this.compareFields(
          (a as Record<string, unknown>)[field],
          (b as Record<string, unknown>)[field],
          direction
        );
        if (comparison !== 0) {
          return comparison;
        }
      }
      return 0;
    });
  }

  private compareFields(
    aVal: unknown,
    bVal: unknown,
    direction: 1 | -1
  ): number {
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return -1 * direction;
    if (bVal == null) return 1 * direction;

    const aType = typeof aVal;
    const bType = typeof bVal;

    if (aType === bType) {
      if (aType === 'string') {
        const result = (aVal as string).localeCompare(bVal as string);
        return result !== 0 ? result * direction : 0;
      } else if (aType === 'number') {
        const diff = (aVal as number) - (bVal as number);
        return diff !== 0 ? diff * direction : 0;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        const diff = aVal.getTime() - bVal.getTime();
        return diff !== 0 ? diff * direction : 0;
      } else {
        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
        return 0;
      }
    }

    return 0;
  }
}