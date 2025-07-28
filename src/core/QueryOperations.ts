import type {
  Document,
  QueryFilter,
  QueryOptions,
  FindResult,
  QueryBuilder,
} from './types';
import type { DocumentWithMetadata } from './BaseCollection';
import { BaseCollection } from './BaseCollection';
import { CollectionError } from '../errors/DatabaseError';
import { QueryBuilder as QueryBuilderImpl } from './QueryBuilder';

/** @typeParam T Document type for this collection */
export class QueryOperations<T = Document> extends BaseCollection<T> {
  /** @param filter MongoDB-like query filter
   * @param options Query options (sort, limit, skip, projection)
   * @returns Query result with documents and metadata */
  async find(
    filter: QueryFilter = {},
    options: QueryOptions = {}
  ): Promise<FindResult<T>> {
    await this.ensureInitialized();

    try {
      const limit = options.limit || Number.MAX_SAFE_INTEGER;
      const skip = options.skip || 0;

      if (
        Object.keys(filter).length === 0 &&
        limit !== Number.MAX_SAFE_INTEGER
      ) {
        const documents = await this.getAllDocuments();
        const sliced = documents.slice(skip, skip + limit);

        let result = sliced;
        if (options.sort && result.length > 1) {
          result = this.sortDocuments(result, options.sort);
        }
        if (options.projection) {
          result = this.projectDocuments(result, options.projection);
        }

        return {
          documents: result,
          total: documents.length,
          hasMore: documents.length > skip + result.length,
        };
      }

      let documents: T[];
      let useIndexOptimization = false;

      if (this.indexes.size > 0) {
        const allDocs = await this.getAllDocuments();
        const indexedDocs = this.useIndexes(allDocs, filter);
        if (indexedDocs.length < allDocs.length && indexedDocs.length > 0) {
          documents = indexedDocs;
          useIndexOptimization = true;
        } else {
          documents = allDocs;
        }
      } else {
        documents = await this.getAllDocuments();
      }

      let filteredDocuments = this.filterDocuments(
        documents,
        filter,
        useIndexOptimization ? documents.length : limit + skip
      );
      const total = filteredDocuments.length;

      if (options.sort && filteredDocuments.length > 1) {
        filteredDocuments = this.sortDocuments(filteredDocuments, options.sort);
      }

      if (skip > 0) {
        filteredDocuments = filteredDocuments.slice(skip);
      }

      if (limit < Number.MAX_SAFE_INTEGER) {
        filteredDocuments = filteredDocuments.slice(0, limit);
      }

      if (options.projection) {
        filteredDocuments = this.projectDocuments(
          filteredDocuments,
          options.projection
        );
      }

      return {
        documents: filteredDocuments,
        total,
        hasMore: total > skip + filteredDocuments.length,
      };
    } catch (error) {
      throw new CollectionError(
        `Find failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** @param filter Query filter to match documents
   * @returns First matching document or null */
  async findOne(filter: QueryFilter = {}): Promise<T | null> {
    const result = await this.find(filter, { limit: 1 });
    return result.documents[0] || null;
  }

  /** @param id Document ID to lookup
   * @returns Document or null if not found */
  async findById(id: string): Promise<T | null> {
    await this.ensureInitialized();

    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    try {
      const document = await this.storage.readDocument(this.name, id);
      if (document) {
        let decryptedDocument = document;
        if (this.encryptionManager && document.data) {
          decryptedDocument = this.encryptionManager.decryptObject(
            document.data as string
          );
        }

        if (this.cache.size < (this.options.maxCacheSize || 1000)) {
          this.cache.set(id, decryptedDocument as T);
        }
        return decryptedDocument as T;
      }

      return null;
    } catch (error) {
      throw new CollectionError(
        `FindById failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** @returns QueryBuilder instance */
  query(): QueryBuilder<T> {
    return new QueryBuilderImpl<T>(this);
  }

  /** @param filter Query filter to match documents
   * @returns Number of matching documents */
  async count(filter: QueryFilter = {}): Promise<number> {
    const result = await this.find(filter);
    return result.total;
  }

  /** @returns True if collection is empty */
  async isEmpty(): Promise<boolean> {
    return (await this.count()) === 0;
  }

  /**
   * @param documents - Documents to filter
   * @param filter - Query filter to apply
   */
  private filterDocuments(
    documents: T[],
    filter: QueryFilter,
    maxResults: number
  ): T[] {
    const results: T[] = [];
    const filterEntries = Object.entries(filter);

    for (const document of documents) {
      if (results.length >= maxResults) break;

      if (this.matchesFilter(document, filterEntries)) {
        results.push(document);
      }
    }

    return results;
  }

  /**
   * @param document - Document to check
   * @param filterEntries - Query filter entries
   */
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
        if (typeof value === 'object' && value !== null) {
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

  /**
   * @param document - Document to check
   * @param operator - Logical operator
   * @param conditions - Array of conditions to evaluate
   */
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

  /**
   * @param value - Document field value
   * @param operators - Comparison operators to apply
   */
  private matchesComparisonOperators(
    value: unknown,
    operators: Record<string, unknown>
  ): boolean {
    const operatorEntries = Object.entries(operators);

    for (const [operator, operatorValue] of operatorEntries) {
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
          if (
            !Array.isArray(operatorValue) ||
            !(operatorValue as any[]).includes(value)
          ) {
            return false;
          }
          break;
        case '$nin':
          if (
            Array.isArray(operatorValue) &&
            (operatorValue as any[]).includes(value)
          ) {
            return false;
          }
          break;
        case '$exists':
          if (operatorValue && value === undefined) return false;
          if (!operatorValue && value !== undefined) return false;
          break;
        case '$regex':
          if (
            typeof value !== 'string' ||
            !new RegExp(operatorValue as string).test(value)
          ) {
            return false;
          }
          break;
      }
    }
    return true;
  }

  /**
   * @param documents - Documents to sort
   * @param sort - Sort specification (field: direction)
   */
  private sortDocuments(
    documents: T[],
    sort: { [field: string]: 1 | -1 } | Array<[string, 1 | -1]>
  ): T[] {
    if (documents.length <= 1) return documents;

    const sortArray = Array.isArray(sort) ? sort : Object.entries(sort);
    const sortFields = sortArray.map(([field, direction]) => ({
      field,
      direction,
    }));

    return documents.slice().sort((a, b) => {
      for (const { field, direction } of sortFields) {
        const aVal = (a as Record<string, unknown>)[field];
        const bVal = (b as Record<string, unknown>)[field];

        if (aVal == null && bVal == null) continue;
        if (aVal == null) return -1 * direction;
        if (bVal == null) return 1 * direction;

        const aType = typeof aVal;
        const bType = typeof bVal;

        if (aType === bType) {
          if (aType === 'string') {
            const result = (aVal as string).localeCompare(bVal as string);
            if (result !== 0) return result * direction;
          } else if (aType === 'number') {
            const diff = (aVal as number) - (bVal as number);
            if (diff !== 0) return diff * direction;
          } else if (aVal instanceof Date && bVal instanceof Date) {
            const diff = aVal.getTime() - bVal.getTime();
            if (diff !== 0) return diff * direction;
          } else {
            if (aVal < bVal) return -1 * direction;
            if (aVal > bVal) return 1 * direction;
          }
        }
      }
      return 0;
    });
  }

  /**
   * @param documents - Documents to project
   * @param projection - Field projection specification
   */
  private projectDocuments(
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

  /**
   * @param documents - Documents to filter
   * @param filter - Query filter to apply
   */
  private useIndexes(documents: T[], filter: QueryFilter): T[] {
    const filterEntries = Object.entries(filter);

    for (const [field, value] of filterEntries) {
      if (this.indexes.has(field) && typeof value !== 'object') {
        const index = this.indexes.get(field)!;
        const documentIds = index.get(value) || [];

        if (documentIds.length === 0) {
          return [];
        }

        const idSet = new Set(documentIds);

        const filtered: T[] = [];
        for (const doc of documents) {
          const docWithMetadata = doc as T & DocumentWithMetadata;
          if (idSet.has(docWithMetadata._id)) {
            filtered.push(doc);
          }
        }

        return filtered;
      }
    }
    return documents;
  }
}
