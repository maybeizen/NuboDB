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

/**
 * Handles all query operations for a collection including filtering, sorting,
 * and pagination. Extends BaseCollection to inherit caching and indexing.
 *
 * @typeParam T - Document type for this collection.
 */
export class QueryOperations<T = Document> extends BaseCollection<T> {
  /**
   * Find documents matching a filter with optional sorting and pagination.
   *
   * @param filter  - MongoDB-like query filter.
   * @param options - Query options (sort, limit, skip, projection).
   * @returns Query result with documents and metadata.
   */
  async find(
    filter: QueryFilter = {},
    options: QueryOptions = {}
  ): Promise<FindResult<T>> {
    await this.ensureInitialized();

    try {
      let documents = await this.getAllDocuments();

      if (this.indexes.size > 0) {
        const indexedDocs = this.useIndexesOptimized(documents, filter);
        if (indexedDocs.length < documents.length) {
          documents = indexedDocs;
        }
      }

      const limit = options.limit || Number.MAX_SAFE_INTEGER;
      const skip = options.skip || 0;

      let filteredDocuments = this.filterDocumentsOptimized(
        documents,
        filter,
        limit + skip
      );
      const total = filteredDocuments.length;

      if (options.sort && filteredDocuments.length > 1) {
        filteredDocuments = this.sortDocumentsOptimized(
          filteredDocuments,
          options.sort
        );
      }

      if (options.projection) {
        filteredDocuments = this.projectDocumentsOptimized(
          filteredDocuments,
          options.projection
        );
      }

      if (skip > 0) {
        filteredDocuments = filteredDocuments.slice(skip);
      }

      if (limit < Number.MAX_SAFE_INTEGER) {
        filteredDocuments = filteredDocuments.slice(0, limit);
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

  /**
   * Find the first document matching a filter.
   *
   * @param filter - Query filter to match documents.
   * @returns First matching document or null.
   */
  async findOne(filter: QueryFilter = {}): Promise<T | null> {
    const result = await this.find(filter, { limit: 1 });
    return result.documents[0] || null;
  }

  /**
   * Find a document by its unique ID (with cache lookup).
   *
   * @param id - Document ID to lookup.
   * @returns Document or null if not found.
   */
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
            document.data
          );
        }

        this.cache.set(id, decryptedDocument as T);
        return decryptedDocument as T;
      }

      return null;
    } catch (error) {
      throw new CollectionError(
        `FindById failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** Create a new QueryBuilder instance for this collection. */
  query(): QueryBuilder<T> {
    return new QueryBuilderImpl<T>(this);
  }

  /**
   * Count documents matching a filter.
   *
   * @param filter - Query filter to match documents.
   * @returns Number of matching documents.
   */
  async count(filter: QueryFilter = {}): Promise<number> {
    const result = await this.find(filter);
    return result.total;
  }

  /** Check if collection has no documents. */
  async isEmpty(): Promise<boolean> {
    return (await this.count()) === 0;
  }

  /**
   * Apply filter to a list of documents.
   *
   * @param documents - Documents to filter.
   * @param filter    - Query filter to apply.
   */
  private filterDocumentsOptimized(
    documents: T[],
    filter: QueryFilter,
    maxResults: number
  ): T[] {
    const results: T[] = [];
    const filterEntries = Object.entries(filter);

    for (const document of documents) {
      if (results.length >= maxResults) break;

      if (this.matchesFilterOptimized(document, filterEntries)) {
        results.push(document);
      }
    }

    return results;
  }

  /**
   * Check if a document matches a query filter.
   *
   * @param document - Document to check.
   * @param filter   - Query filter to match against.
   */
  private matchesFilterOptimized(
    document: T,
    filterEntries: [string, any][]
  ): boolean {
    for (const [field, value] of filterEntries) {
      if (field.startsWith('$')) {
        if (!this.matchesLogicalOperator(document, field, value as any[])) {
          return false;
        }
      } else {
        const fieldValue = (document as any)[field];
        if (typeof value === 'object' && value !== null) {
          if (!this.matchesComparisonOperatorsOptimized(fieldValue, value)) {
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
   * Handle logical operators ($and, $or, $nor) in query filters.
   *
   * @param document  - Document to check.
   * @param operator  - Logical operator.
   * @param conditions - Array of conditions to evaluate.
   */
  private matchesLogicalOperator(
    document: T,
    operator: string,
    conditions: any[]
  ): boolean {
    switch (operator) {
      case '$and':
        return conditions.every(condition =>
          this.matchesFilter(document, condition)
        );
      case '$or':
        return conditions.some(condition =>
          this.matchesFilter(document, condition)
        );
      case '$nor':
        return !conditions.some(condition =>
          this.matchesFilter(document, condition)
        );
      default:
        return true;
    }
  }

  /**
   * Handle comparison operators ($eq, $gt, $lt, etc.) in query filters.
   *
   * @param value     - Document field value.
   * @param operators - Comparison operators to apply.
   */
  private matchesComparisonOperatorsOptimized(
    value: any,
    operators: any
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
          if (value <= (operatorValue as number)) return false;
          break;
        case '$gte':
          if (value < (operatorValue as number)) return false;
          break;
        case '$lt':
          if (value >= (operatorValue as number)) return false;
          break;
        case '$lte':
          if (value > (operatorValue as number)) return false;
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
   * Sort documents by specified fields.
   *
   * @param documents - Documents to sort.
   * @param sort      - Sort specification (field: direction).
   */
  private sortDocumentsOptimized(
    documents: T[],
    sort: { [field: string]: 1 | -1 } | Array<[string, 1 | -1]>
  ): T[] {
    const sortArray = Array.isArray(sort) ? sort : Object.entries(sort);

    const sortFields = sortArray.map(([field, direction]) => ({
      field,
      direction,
    }));

    return documents.sort((a, b) => {
      for (const { field, direction } of sortFields) {
        const aVal = (a as any)[field];
        const bVal = (b as any)[field];

        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
      }
      return 0;
    });
  }

  /**
   * Apply field projection to documents (include/exclude fields).
   *
   * @param documents  - Documents to project.
   * @param projection - Field projection specification.
   */
  private projectDocumentsOptimized(
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
      const projected: any = {};

      if (includeFields.length > 0) {
        for (const field of includeFields) {
          if (Object.prototype.hasOwnProperty.call(document, field)) {
            projected[field] = (document as any)[field];
          }
        }
      } else {
        const docKeys = Object.keys(document as any);
        for (const field of docKeys) {
          if (!excludeFields.includes(field)) {
            projected[field] = (document as any)[field];
          }
        }
      }

      return projected as T;
    });
  }

  /**
   * Use available indexes to optimize document filtering.
   *
   * @param documents - Documents to filter.
   * @param filter    - Query filter to apply.
   */
  private useIndexesOptimized(documents: T[], filter: QueryFilter): T[] {
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

  private filterDocuments(documents: T[], filter: QueryFilter): T[] {
    return this.filterDocumentsOptimized(
      documents,
      filter,
      Number.MAX_SAFE_INTEGER
    );
  }

  private matchesFilter(document: T, filter: QueryFilter): boolean {
    return this.matchesFilterOptimized(document, Object.entries(filter));
  }

  private matchesComparisonOperators(value: any, operators: any): boolean {
    return this.matchesComparisonOperatorsOptimized(value, operators);
  }

  private sortDocuments(
    documents: T[],
    sort: { [field: string]: 1 | -1 } | Array<[string, 1 | -1]>
  ): T[] {
    return this.sortDocumentsOptimized(documents, sort);
  }

  private projectDocuments(
    documents: T[],
    projection: { [field: string]: 0 | 1 }
  ): T[] {
    return this.projectDocumentsOptimized(documents, projection);
  }

  private useIndexes(documents: T[], filter: QueryFilter): T[] {
    return this.useIndexesOptimized(documents, filter);
  }
}
