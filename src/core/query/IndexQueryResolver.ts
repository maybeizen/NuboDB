import type { QueryFilter } from '../types';
import type { IndexFieldMetadata } from '../document/IndexManager';

/** Metadata about an index */
interface IndexMetadata {
  name: string;
  fields: string[];
  indexMap: Map<any, string[]>;
  sortedEntries?: Array<[any, string[]]>;
}

/** Resolves queries using indexes to get candidate document IDs */
export class IndexQueryResolver {
  private indexMetadata: Map<string, IndexMetadata> = new Map();
  private fieldToIndexMap: Map<string, Set<string>> = new Map();

  constructor(
    private indexes: Map<string, Map<any, string[]>>,
    private fieldMetadata?: Map<string, IndexFieldMetadata>
  ) {
    this.rebuildFieldMapping().catch(() => {
    });
  }

  async rebuildFieldMapping(): Promise<void> {
    this.fieldToIndexMap.clear();
    this.indexMetadata.clear();

    try {
      // @ts-ignore - Dynamic import for optional native bindings
      const { NativeFilterEngine } = await import('../../native/bindings');
      if (NativeFilterEngine.isAvailable()) {
        try {
          await NativeFilterEngine.rebuildIndexMapping(this.indexes);
        } catch {
        }
      }
    } catch {
    }

    for (const [indexName, indexMap] of this.indexes.entries()) {
      let fields: string[];

      if (this.fieldMetadata && this.fieldMetadata.has(indexName)) {
        fields = this.fieldMetadata.get(indexName)!.fields;
      } else {
        fields = this.extractFieldsFromIndexName(indexName);
      }

      const metadata: IndexMetadata = {
        name: indexName,
        fields,
        indexMap,
      };

      this.indexMetadata.set(indexName, metadata);

      for (const field of fields) {
        if (!this.fieldToIndexMap.has(field)) {
          this.fieldToIndexMap.set(field, new Set());
        }
        this.fieldToIndexMap.get(field)!.add(indexName);
      }
    }
  }

  /** Extract field names from index name (e.g., 'active_salary_index' -> ['active', 'salary']) */
  private extractFieldsFromIndexName(indexName: string): string[] {
    return indexName
      .replace(/_index$/, '')
      .split('_')
      .filter(Boolean);
  }

  /** Get candidate document IDs from indexes before loading documents
   * @param filter Query filter
   * @returns Set of candidate document IDs or null if indexes can't be used */
  async getCandidateIds(filter: QueryFilter): Promise<Set<string> | null> {
    try {
      // @ts-ignore - Dynamic import for optional native bindings
      const { NativeFilterEngine } = await import('../../native/bindings');
      if (NativeFilterEngine.isAvailable()) {
        try {
          const ids = await NativeFilterEngine.getCandidateIds(filter);
          if (ids) {
            return new Set(ids);
          }
        } catch {
        }
      }
    } catch {
    }

    const filterEntries = Object.entries(filter);
    let candidateIds: Set<string> | null = null;
    const usedIndexes = new Set<string>();

    for (const [field, value] of filterEntries) {
      if (field.startsWith('$')) continue;

      const candidateIndexes = this.findIndexesForField(field);

      for (const indexName of candidateIndexes) {
        if (usedIndexes.has(indexName)) continue;

        const metadata = this.indexMetadata.get(indexName);
        if (!metadata) continue;

        const fieldIds = this.getFieldIdsFromIndex(
          metadata.indexMap,
          value,
          metadata.fields,
          field,
          metadata
        );

        if (fieldIds === null) continue;

        usedIndexes.add(indexName);

        if (candidateIds === null) {
          candidateIds = fieldIds;
        } else {
          candidateIds = this.intersectSets(candidateIds, fieldIds);
          if (candidateIds.size === 0) {
            return candidateIds;
          }
        }
      }
    }

    return candidateIds;
  }

  /** Find indexes that can help with a field query
   * @param field Field name
   * @returns Array of index names that cover this field */
  private findIndexesForField(field: string): string[] {
    const indexNames = this.fieldToIndexMap.get(field);
    if (!indexNames) {
      return [];
    }
    return Array.from(indexNames);
  }

  /** Get document IDs from a single index field
   * @param index Index map for the field
   * @param value Filter value (can be object with operators)
   * @param indexFields Fields covered by this index
   * @param queryField Field being queried
   * @param metadata Index metadata
   * @returns Set of document IDs or null if index can't be used */
  private getFieldIdsFromIndex(
    index: Map<any, string[]>,
    value: unknown,
    indexFields: string[],
    queryField: string,
    metadata: IndexMetadata
  ): Set<string> | null {
    if (indexFields.length === 1 && indexFields[0] === queryField) {
      return this.getFieldIdsFromValue(index, value, metadata);
    }

    if (indexFields.length > 1 && indexFields.includes(queryField)) {
      return this.getFieldIdsFromCompositeIndex(
        index,
        value,
        indexFields,
        queryField
      );
    }

    return null;
  }

  /** Get IDs from simple value match */
  private getFieldIdsFromValue(
    index: Map<any, string[]>,
    value: unknown,
    metadata: IndexMetadata
  ): Set<string> | null {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return this.getFieldIdsFromOperators(
        index,
        value as Record<string, unknown>,
        metadata
      );
    }

    const ids = index.get(value) || [];
    return new Set(ids);
  }

  /** Get IDs from composite index (handles partial matches) */
  private getFieldIdsFromCompositeIndex(
    index: Map<any, string[]>,
    value: unknown,
    indexFields: string[],
    queryField: string
  ): Set<string> | null {
    const fieldIds = new Set<string>();

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const operators = value as Record<string, unknown>;
      if ('$eq' in operators) {
        for (const [key, ids] of index.entries()) {
          if (Array.isArray(key) && key.length === indexFields.length) {
            const fieldIndex = indexFields.indexOf(queryField);
            if (fieldIndex >= 0 && key[fieldIndex] === operators.$eq) {
              for (const id of ids) {
                fieldIds.add(id);
              }
            }
          }
        }
        return fieldIds.size > 0 ? fieldIds : null;
      }
      return null;
    }

    for (const [key, ids] of index.entries()) {
      if (Array.isArray(key) && key.length === indexFields.length) {
        const fieldIndex = indexFields.indexOf(queryField);
        if (fieldIndex >= 0 && key[fieldIndex] === value) {
          for (const id of ids) {
            fieldIds.add(id);
          }
        }
      }
    }

    return fieldIds.size > 0 ? fieldIds : null;
  }

  /** Get field IDs from comparison operators
   * @param index Index map
   * @param operators Comparison operators object
   * @param metadata Index metadata
   * @returns Set of document IDs or null if operators not supported */
  private getFieldIdsFromOperators(
    index: Map<any, string[]>,
    operators: Record<string, unknown>,
    metadata: IndexMetadata
  ): Set<string> | null {
    if ('$eq' in operators) {
      const ids = index.get(operators.$eq) || [];
      return new Set(ids);
    }

    if ('$in' in operators && Array.isArray(operators.$in)) {
      const fieldIds = new Set<string>();
      const inArray = operators.$in as unknown[];
      for (let i = 0; i < inArray.length; i++) {
        const val = inArray[i];
        if (val === undefined) continue;
        const ids = index.get(val) || [];
        for (let j = 0; j < ids.length; j++) {
          const id = ids[j];
          if (id) {
            fieldIds.add(id);
          }
        }
      }
      return fieldIds;
    }

    if (
      '$gte' in operators ||
      '$gt' in operators ||
      '$lte' in operators ||
      '$lt' in operators
    ) {
      return this.getFieldIdsFromRange(index, operators, metadata);
    }

    return null;
  }

  /** Get field IDs from range operators ($gte, $gt, $lte, $lt)
   * Optimized: caches sorted entries to avoid sorting on every query
   * @param index Index map
   * @param operators Range operators
   * @param metadata Index metadata
   * @returns Set of document IDs or null if not numeric */
  private getFieldIdsFromRange(
    index: Map<any, string[]>,
    operators: Record<string, unknown>,
    metadata: IndexMetadata
  ): Set<string> | null {
    const gte = operators.$gte as number | undefined;
    const gt = operators.$gt as number | undefined;
    const lte = operators.$lte as number | undefined;
    const lt = operators.$lt as number | undefined;

    const isNumber =
      (gte !== undefined && typeof gte === 'number') ||
      (gt !== undefined && typeof gt === 'number') ||
      (lte !== undefined && typeof lte === 'number') ||
      (lt !== undefined && typeof lt === 'number');

    if (!isNumber) {
      return null;
    }

    const minValue =
      gt !== undefined
        ? gt
        : gte !== undefined
          ? gte
          : Number.NEGATIVE_INFINITY;
    const maxValue =
      lt !== undefined
        ? lt
        : lte !== undefined
          ? lte
          : Number.POSITIVE_INFINITY;
    const useMinInclusive = gte !== undefined;
    const useMaxInclusive = lte !== undefined;

    const fieldIds = new Set<string>();

    let sortedEntries = metadata.sortedEntries;
    if (!sortedEntries) {
      sortedEntries = Array.from(index.entries()).sort((a, b) => {
        const aVal = typeof a[0] === 'number' ? a[0] : Number.NEGATIVE_INFINITY;
        const bVal = typeof b[0] === 'number' ? b[0] : Number.NEGATIVE_INFINITY;
        return aVal - bVal;
      });
      metadata.sortedEntries = sortedEntries;
    }

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      if (!entry) continue;
      const [indexValue, ids] = entry;
      if (typeof indexValue === 'number') {
        let matches = true;
        if (minValue !== Number.NEGATIVE_INFINITY) {
          matches =
            matches &&
            (useMinInclusive ? indexValue >= minValue : indexValue > minValue);
        }
        if (matches && maxValue !== Number.POSITIVE_INFINITY) {
          matches =
            matches &&
            (useMaxInclusive ? indexValue <= maxValue : indexValue < maxValue);
        }

        if (matches) {
          for (let j = 0; j < ids.length; j++) {
            const id = ids[j];
            if (id) {
              fieldIds.add(id);
            }
          }
        } else if (indexValue > maxValue) {
          break;
        }
      }
    }

    return fieldIds;
  }

  /** Intersect two sets of document IDs
   * @param set1 First set
   * @param set2 Second set
   * @returns Intersection of both sets */
  private intersectSets(set1: Set<string>, set2: Set<string>): Set<string> {
    const intersection = new Set<string>();
    const smallerSet = set1.size < set2.size ? set1 : set2;
    const largerSet = set1.size < set2.size ? set2 : set1;

    for (const id of smallerSet) {
      if (largerSet.has(id)) {
        intersection.add(id);
      }
    }

    return intersection;
  }
}
