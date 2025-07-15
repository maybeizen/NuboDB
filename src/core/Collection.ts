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

  /**
   * Insert a single document into the collection.
   *
   * @param data - Document data to insert. Missing fields will use schema defaults.
   * @returns Result containing the inserted document's ID and success status.
   * @throws {DocumentError} When document fails validation or insertion.
   * @example
   * ```typescript
   * const result = await collection.insert({ name: 'John', age: 30 });
   * console.log('Inserted with ID:', result.insertedId);
   * ```
   * @since 1.0.0
   */
  async insert(data: Partial<T>): Promise<InsertResult> {
    return this.documentOps.insert(data);
  }

  /**
   * Insert multiple documents in a single operation.
   *
   * @param documents - Array of document data to insert.
   * @returns Result containing all inserted document IDs and success status.
   * @throws {DocumentError} When any document fails validation or insertion.
   * @example
   * ```typescript
   * const result = await collection.insertMany([
   *   { name: 'John', age: 30 },
   *   { name: 'Jane', age: 25 }
   * ]);
   * console.log('Inserted IDs:', result.insertedIds);
   * ```
   * @since 1.0.0
   */
  async insertMany(documents: Partial<T>[]): Promise<InsertManyResult> {
    return this.documentOps.insertMany(documents);
  }

  /**
   * Update all documents that match the specified filter.
   *
   * @param filter - Query criteria to match documents for updating.
   * @param updateData - Partial document data to apply to matched documents.
   * @returns Result containing count of modified documents and success status.
   * @throws {DocumentError} When update operation fails or validation errors occur.
   * @example
   * ```typescript
   * const result = await collection.update(
   *   { status: 'pending' },
   *   { status: 'completed', updatedAt: new Date() }
   * );
   * console.log('Updated documents:', result.modifiedCount);
   * ```
   * @since 1.0.0
   */
  async update(
    filter: QueryFilter,
    updateData: Partial<T>
  ): Promise<UpdateResult> {
    return this.documentOps.update(filter, updateData);
  }

  /**
   * Update existing documents or insert a new one if no matches found.
   *
   * @param filter - Query criteria to match documents for updating.
   * @param updateData - Document data to apply or insert if no matches.
   * @returns Result containing modified/inserted count and success status.
   * @throws {DocumentError} When upsert operation fails or validation errors occur.
   * @example
   * ```typescript
   * const result = await collection.upsert(
   *   { email: 'user@example.com' },
   *   { name: 'Updated Name', email: 'user@example.com' }
   * );
   * console.log('Upserted:', result.upsertedId || 'Updated existing');
   * ```
   * @since 1.0.0
   */
  async upsert(
    filter: QueryFilter,
    updateData: Partial<T>
  ): Promise<UpdateResult> {
    return this.documentOps.upsert(filter, updateData);
  }

  /**
   * Delete all documents that match the specified filter.
   *
   * @param filter - Query criteria to match documents for deletion.
   * @returns Result containing count of deleted documents and success status.
   * @throws {DocumentError} When delete operation fails.
   * @example
   * ```typescript
   * const result = await collection.delete({ status: 'archived' });
   * console.log('Deleted documents:', result.deletedCount);
   * ```
   * @since 1.0.0
   */
  async delete(filter: QueryFilter): Promise<DeleteResult> {
    return this.documentOps.delete(filter);
  }

  /**
   * Delete the first document that matches the filter.
   *
   * @param filter - Query criteria to match a single document for deletion.
   * @returns Result containing count of deleted documents (0 or 1) and success status.
   * @throws {DocumentError} When delete operation fails.
   * @example
   * ```typescript
   * const result = await collection.deleteOne({ _id: 'user123' });
   * if (result.deletedCount > 0) {
   *   console.log('Document deleted successfully');
   * }
   * ```
   * @since 1.0.0
   */
  async deleteOne(filter: QueryFilter): Promise<DeleteResult> {
    return this.documentOps.deleteOne(filter);
  }

  /**
   * Manually create an index on the collection for improved query performance.
   *
   * @param definition - Index definition specifying fields and options.
   * @throws {DatabaseError} When index creation fails.
   * @example
   * ```typescript
   * await collection.createIndex({
   *   fields: ['email'],
   *   unique: true,
   *   name: 'email_unique_idx'
   * });
   * ```
   * @since 1.0.0
   */
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

  /**
   * Return the first document that matches the filter.
   *
   * @param filter - Query criteria to match documents. Defaults to empty object (match all).
   * @returns First matching document or null if no matches found.
   * @throws {DatabaseError} When query operation fails.
   * @example
   * ```typescript
   * const user = await collection.findOne({ email: 'user@example.com' });
   * if (user) {
   *   console.log('Found user:', user.name);
   * }
   * ```
   * @since 1.0.0
   */
  async findOne(filter: QueryFilter = {}): Promise<T | null> {
    return this.queryOps.findOne(filter);
  }

  /**
   * Lookup a document by its unique `_id` field.
   *
   * @param id - The document ID to search for.
   * @returns Document with matching ID or null if not found.
   * @throws {DatabaseError} When query operation fails.
   * @example
   * ```typescript
   * const user = await collection.findById('user123');
   * if (user) {
   *   console.log('Found user:', user);
   * }
   * ```
   * @since 1.0.0
   */
  async findById(id: string): Promise<T | null> {
    return this.queryOps.findById(id);
  }

  /**
   * Start a fluent QueryBuilder chain for complex queries.
   *
   * @returns QueryBuilder instance for chaining query operations.
   * @example
   * ```typescript
   * const results = await collection
   *   .query()
   *   .where('age').gte(18)
   *   .and('status').equals('active')
   *   .sort({ name: 1 })
   *   .limit(10)
   *   .execute();
   * ```
   * @since 1.0.0
   */
  query(): QueryBuilder<T> {
    return this.queryOps.query();
  }

  /**
   * Count documents that match the specified filter.
   *
   * @param filter - Query criteria to match documents. Defaults to empty object (count all).
   * @returns Number of documents matching the filter.
   * @throws {DatabaseError} When count operation fails.
   * @example
   * ```typescript
   * const totalUsers = await collection.count();
   * const activeUsers = await collection.count({ status: 'active' });
   * console.log(`${activeUsers} out of ${totalUsers} users are active`);
   * ```
   * @since 1.0.0
   */
  async count(filter: QueryFilter = {}): Promise<number> {
    return this.queryOps.count(filter);
  }

  /**
   * Check if the collection currently has zero documents.
   *
   * @returns True if collection is empty, false otherwise.
   * @throws {DatabaseError} When count operation fails.
   * @example
   * ```typescript
   * if (await collection.isEmpty()) {
   *   console.log('Collection is empty, initializing default data...');
   * }
   * ```
   * @since 1.0.0
   */
  async isEmpty(): Promise<boolean> {
    return this.queryOps.isEmpty();
  }

  /**
   * Clear the in-memory LRU cache for this collection to free memory.
   *
   * @example
   * ```typescript
   * collection.clearCache(); // Free up memory
   * ```
   * @since 1.0.0
   */
  clearCache(): void {
    this.documentOps.clearCache();
  }

  /**
   * Return collection statistics including size, document count, and cache info.
   *
   * @returns Object containing collection metrics and performance data.
   * @throws {DatabaseError} When stats operation fails.
   * @example
   * ```typescript
   * const stats = await collection.stats();
   * console.log(`Collection has ${stats.totalDocuments} documents (${stats.totalSize} bytes)`);
   * ```
   * @since 1.0.0
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
   * Initialize the collection by setting up document and query operations.
   * Lazily called by BaseCollection; can also be invoked manually.
   *
   * @throws {DatabaseError} When initialization fails.
   * @example
   * ```typescript
   * await collection.initialize(); // Ensure collection is ready
   * ```
   * @since 1.0.0
   */
  async initialize(): Promise<void> {
    await Promise.all([
      this.documentOps.initialize(),
      this.queryOps.initialize(),
    ]);
  }
}
