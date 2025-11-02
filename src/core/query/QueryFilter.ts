import type { QueryFilter, Document } from '../types';

export class QueryFilterEngine<T = Document> {
  private filterCache: WeakMap<
    QueryFilter,
    { entries: Array<[string, unknown]> }
  > = new WeakMap();

  async filter(
    documents: T[],
    filter: QueryFilter,
    maxResults: number
  ): Promise<T[]> {
    if (maxResults === 0 || documents.length === 0) return [];
    if (Object.keys(filter).length === 0) {
      return documents.slice(0, maxResults);
    }

    try {
      // @ts-ignore - Dynamic import for optional native bindings
      const { NativeFilterEngine } = await import('../../native/bindings');
      if (NativeFilterEngine.isAvailable()) {
        try {
          const result = await NativeFilterEngine.filterDocuments(
            documents,
            filter,
            maxResults
          );
          return result as T[];
        } catch {
          return this.filterFallback(documents, filter, maxResults);
        }
      }
    } catch {}

    return this.filterFallback(documents, filter, maxResults);
  }

  private filterFallback(
    documents: T[],
    filter: QueryFilter,
    maxResults: number
  ): T[] {
    const cachedFilter = this.getCachedFilter(filter);
    const results: T[] = [];
    const entries = cachedFilter.entries;

    for (let i = 0; i < documents.length && results.length < maxResults; i++) {
      const document = documents[i];
      if (document !== undefined && this.matchesFilter(document, entries)) {
        results.push(document as T);
      }
    }

    return results;
  }

  private getCachedFilter(filter: QueryFilter): {
    entries: Array<[string, unknown]>;
  } {
    let cached = this.filterCache.get(filter);
    if (!cached) {
      cached = { entries: Object.entries(filter) };
      this.filterCache.set(filter, cached);
    }
    return cached;
  }

  private matchesFilter(
    document: T,
    filterEntries: Array<[string, unknown]>
  ): boolean {
    for (const [field, value] of filterEntries) {
      if (field.startsWith('$')) {
        if (!this.matchesLogicalOperator(document, field, value as unknown[])) {
          return false;
        }
      } else {
        const fieldValue = (document as Record<string, unknown>)[field];
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        ) {
          if (
            !this.matchesComparisonOperators(
              fieldValue,
              value as Record<string, unknown>
            )
          ) {
            return false;
          }
        } else {
          if (fieldValue !== value) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private matchesLogicalOperator(
    document: T,
    operator: string,
    conditions: unknown[]
  ): boolean {
    switch (operator) {
      case '$and':
        return conditions.every(condition =>
          this.matchesFilter(
            document,
            Object.entries(condition as Record<string, unknown>)
          )
        );
      case '$or':
        return conditions.some(condition =>
          this.matchesFilter(
            document,
            Object.entries(condition as Record<string, unknown>)
          )
        );
      case '$nor':
        return !conditions.some(condition =>
          this.matchesFilter(
            document,
            Object.entries(condition as Record<string, unknown>)
          )
        );
      default:
        return true;
    }
  }

  private matchesComparisonOperators(
    value: unknown,
    operators: Record<string, unknown>
  ): boolean {
    for (const [operator, operatorValue] of Object.entries(operators)) {
      switch (operator) {
        case '$eq':
          if (value !== operatorValue) return false;
          break;
        case '$ne':
          if (value === operatorValue) return false;
          break;
        case '$gt':
          if (
            typeof value === 'number' &&
            typeof operatorValue === 'number' &&
            value <= operatorValue
          )
            return false;
          break;
        case '$gte':
          if (
            typeof value === 'number' &&
            typeof operatorValue === 'number' &&
            value < operatorValue
          )
            return false;
          break;
        case '$lt':
          if (
            typeof value === 'number' &&
            typeof operatorValue === 'number' &&
            value >= operatorValue
          )
            return false;
          break;
        case '$lte':
          if (
            typeof value === 'number' &&
            typeof operatorValue === 'number' &&
            value > operatorValue
          )
            return false;
          break;
        case '$in':
          if (!Array.isArray(operatorValue)) return false;
          const inSet = new Set(operatorValue as unknown[]);
          if (!inSet.has(value)) return false;
          break;
        case '$nin':
          if (Array.isArray(operatorValue)) {
            const ninSet = new Set(operatorValue as unknown[]);
            if (ninSet.has(value)) return false;
          }
          break;
        case '$exists':
          if (operatorValue && value === undefined) return false;
          if (!operatorValue && value !== undefined) return false;
          break;
        case '$regex':
          if (typeof value !== 'string') return false;
          const regex = new RegExp(operatorValue as string);
          if (!regex.test(value)) return false;
          break;
      }
    }
    return true;
  }
}
