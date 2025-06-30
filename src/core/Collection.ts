import {
  Document,
  QueryFilter,
  QueryOptions,
  CollectionOptions,
  InsertResult,
  InsertManyResult,
  UpdateResult,
  DeleteResult,
  FindResult,
  IndexDefinition,
  QueryBuilder,
} from './types';
import { FileStorage } from '../storage/FileStorage';
import { DocumentOperations } from './DocumentOperations';
import { QueryOperations } from './QueryOperations';

/**
 * Public facade that combines CRUD (DocumentOperations) and query (QueryOperations)
 * capabilities for a collection.
 *
 * @typeParam T - Shape of the documents stored in this collection.
 */
export class Collection<T = Document> {
  private documentOps: DocumentOperations<T>;
  private queryOps: QueryOperations<T>;

  /**
   * Create a new Collection instance.
   *
   * @param name     - Logical name of the collection (also directory name on disk).
   * @param storage  - Low-level storage engine implementation.
   * @param options  - Optional collection-specific configuration.
   */
  constructor(
    name: string,
    storage: FileStorage,
    options: CollectionOptions = {}
  ) {
    this.documentOps = new DocumentOperations<T>(name, storage, options);
    this.queryOps = new QueryOperations<T>(name, storage, options);
  }

  /** Insert a single document. */
  async insert(data: Partial<T>): Promise<InsertResult> {
    return this.documentOps.insert(data);
  }

  /** Insert many documents in bulk. */
  async insertMany(documents: Partial<T>[]): Promise<InsertManyResult> {
    return this.documentOps.insertMany(documents);
  }

  /** Update all documents that match a filter. */
  async update(
    filter: QueryFilter,
    updateData: Partial<T>
  ): Promise<UpdateResult> {
    return this.documentOps.update(filter, updateData);
  }

  /** Update existing documents or insert a new one if nothing matches. */
  async upsert(
    filter: QueryFilter,
    updateData: Partial<T>
  ): Promise<UpdateResult> {
    return this.documentOps.upsert(filter, updateData);
  }

  /** Delete all matching documents. */
  async delete(filter: QueryFilter): Promise<DeleteResult> {
    return this.documentOps.delete(filter);
  }

  /** Delete the first document that matches the filter. */
  async deleteOne(filter: QueryFilter): Promise<DeleteResult> {
    return this.documentOps.deleteOne(filter);
  }

  /** Manually create an index. */
  async createIndex(definition: IndexDefinition): Promise<void> {
    return this.documentOps.createIndex(definition);
  }

  /**
   * Find documents matching a filter.
   *
   * @param filter   - Query criteria (MongoDB-like).
   * @param options  - Pagination, sorting, projection …
   */
  async find(
    filter: QueryFilter = {},
    options: QueryOptions = {}
  ): Promise<FindResult<T>> {
    return this.queryOps.find(filter, options);
  }

  /** Return first document that matches. */
  async findOne(filter: QueryFilter = {}): Promise<T | null> {
    return this.queryOps.findOne(filter);
  }

  /** Lookup a document by its `_id`. */
  async findById(id: string): Promise<T | null> {
    return this.queryOps.findById(id);
  }

  /** Start a fluent `QueryBuilder` chain. */
  query(): QueryBuilder<T> {
    return this.queryOps.query();
  }

  /** Count matching documents. */
  async count(filter: QueryFilter = {}): Promise<number> {
    return this.queryOps.count(filter);
  }

  /** Check if the collection currently has zero documents. */
  async isEmpty(): Promise<boolean> {
    return this.queryOps.isEmpty();
  }

  /** Clear in-memory LRU/cache for this collection. */
  clearCache(): void {
    this.documentOps.clearCache();
  }

  /** Return size, index & cache statistics. */
  async stats(): Promise<{
    totalDocuments: number;
    totalSize: number;
    indexes: number;
    cacheSize: number;
  }> {
    return this.documentOps.stats();
  }

  /** Lazily called by BaseCollection; can also be invoked manually. */
  async initialize(): Promise<void> {
    await Promise.all([
      this.documentOps.initialize(),
      this.queryOps.initialize(),
    ]);
  }
}
