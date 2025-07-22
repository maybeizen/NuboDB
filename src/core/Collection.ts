import type {
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
import type { FileStorage } from '../storage/FileStorage';
import { DocumentOperations } from './DocumentOperations';
import { QueryOperations } from './QueryOperations';

/**
 * @typeParam T - Shape of the documents stored in this collection
 */
export class Collection<T = Document> {
  private documentOps: DocumentOperations<T>;
  private queryOps: QueryOperations<T>;

  /**
   * @param name - Collection name
   * @param storage - Storage engine implementation
   * @param options - Optional collection-specific configuration
   */
  constructor(
    name: string,
    storage: FileStorage,
    options: CollectionOptions = {}
  ) {
    this.documentOps = new DocumentOperations<T>(name, storage, options);
    this.queryOps = new QueryOperations<T>(name, storage, options);
  }

  /**
   * @param data - Document data to insert
   * @returns Result containing the inserted document's ID and success status
   */
  async insert(data: Partial<T>): Promise<InsertResult> {
    return this.documentOps.insert(data);
  }

  /**
   * @param documents - Array of document data to insert
   * @returns Result containing all inserted document IDs and success status
   */
  async insertMany(documents: Partial<T>[]): Promise<InsertManyResult> {
    return this.documentOps.insertMany(documents);
  }

  /**
   * @param filter - Query criteria to match documents for updating
   * @param updateData - Partial document data to apply to matched documents
   * @returns Result containing count of modified documents and success status
   */
  async update(
    filter: QueryFilter,
    updateData: Partial<T>
  ): Promise<UpdateResult> {
    return this.documentOps.update(filter, updateData);
  }

  /**
   * @param filter - Query criteria to match documents for updating
   * @param updateData - Document data to apply or insert if no matches
   * @returns Result containing modified/inserted count and success status
   */
  async upsert(
    filter: QueryFilter,
    updateData: Partial<T>
  ): Promise<UpdateResult> {
    return this.documentOps.upsert(filter, updateData);
  }

  /**
   * @param filter - Query criteria to match documents for deletion
   * @returns Result containing count of deleted documents and success status
   */
  async delete(filter: QueryFilter): Promise<DeleteResult> {
    return this.documentOps.delete(filter);
  }

  /**
   * @param filter - Query criteria to match a single document for deletion
   * @returns Result containing count of deleted documents (0 or 1) and success status
   */
  async deleteOne(filter: QueryFilter): Promise<DeleteResult> {
    return this.documentOps.deleteOne(filter);
  }

  /**
   * @param definition - Index definition specifying fields and options
   */
  async createIndex(definition: IndexDefinition): Promise<void> {
    return this.documentOps.createIndex(definition);
  }

  /**
   * @param filter - Query criteria (MongoDB-like)
   * @param options - Pagination, sorting, projection
   */
  async find(
    filter: QueryFilter = {},
    options: QueryOptions = {}
  ): Promise<FindResult<T>> {
    return this.queryOps.find(filter, options);
  }

  /**
   * @param filter - Query criteria to match documents
   * @returns First matching document or null if no matches found
   */
  async findOne(filter: QueryFilter = {}): Promise<T | null> {
    return this.queryOps.findOne(filter);
  }

  /**
   * @param id - The document ID to search for
   * @returns Document with matching ID or null if not found
   */
  async findById(id: string): Promise<T | null> {
    return this.queryOps.findById(id);
  }

  /**
   * @returns QueryBuilder instance for chaining query operations
   */
  query(): QueryBuilder<T> {
    return this.queryOps.query();
  }

  /**
   * @param filter - Query criteria to match documents
   * @returns Number of documents matching the filter
   */
  async count(filter: QueryFilter = {}): Promise<number> {
    return this.queryOps.count(filter);
  }

  /**
   * @returns True if collection is empty, false otherwise
   */
  async isEmpty(): Promise<boolean> {
    return this.queryOps.isEmpty();
  }

  /**
   * Clear the in-memory LRU cache for this collection to free memory
   */
  clearCache(): void {
    this.documentOps.clearCache();
  }

  /**
   * @returns Object containing collection metrics and performance data
   */
  async stats(): Promise<{
    totalDocuments: number;
    totalSize: number;
    indexes: number;
    cacheSize: number;
  }> {
    return this.documentOps.stats();
  }

  /**
   * Initialize the collection by setting up document and query operations
   */
  async initialize(): Promise<void> {
    await Promise.all([
      this.documentOps.initialize(),
      this.queryOps.initialize(),
    ]);
  }
}
