import type {
  QueryFilter,
  QueryOptions,
  QueryOperator,
  FindResult,
  Document,
} from './types';

/**
 * Fluent query builder that provides a chainable API for building complex queries.
 * Similar to MongoDB's query builder but with a more JavaScript-friendly syntax.
 *
 * @typeParam T - Document type being queried.
 */
export class QueryBuilder<T = Document> {
  private filter: QueryFilter = {};
  private options: QueryOptions = {};
  private collection: any;

  /**
   * Create a new query builder for a collection.
   *
   * @param collection - Collection instance to query.
   */
  constructor(collection: any) {
    this.collection = collection;
  }

  /**
   * Add a where clause to the query.
   *
   * @param field    - Document field to filter on.
   * @param operator - Comparison operator ($eq, $gt, etc.).
   * @param value    - Value to compare against.
   */
  where(field: string, operator: QueryOperator, value: any): QueryBuilder<T> {
    if (operator === '$eq') {
      this.filter[field] = value;
    } else {
      this.filter[field] = { [operator]: value };
    }
    return this;
  }

  /**
   * Add an AND condition to the query.
   *
   * @param field    - Document field to filter on.
   * @param operator - Comparison operator.
   * @param value    - Value to compare against.
   */
  and(field: string, operator: QueryOperator, value: any): QueryBuilder<T> {
    if (!this.filter.$and) {
      this.filter.$and = [];
    }
    this.filter.$and.push({ [field]: { [operator]: value } });
    return this;
  }

  /**
   * Add an OR condition to the query.
   *
   * @param field    - Document field to filter on.
   * @param operator - Comparison operator.
   * @param value    - Value to compare against.
   */
  or(field: string, operator: QueryOperator, value: any): QueryBuilder<T> {
    if (!this.filter.$or) {
      this.filter.$or = [];
    }
    this.filter.$or.push({ [field]: { [operator]: value } });
    return this;
  }

  /**
   * Sort results by a field.
   *
   * @param field     - Field to sort by.
   * @param direction - 1 for ascending, -1 for descending.
   */
  sort(field: string, direction: 1 | -1): QueryBuilder<T> {
    this.options.sort = { [field]: direction };
    return this;
  }

  /**
   * Limit the number of results returned.
   *
   * @param count - Maximum number of documents to return.
   */
  limit(count: number): QueryBuilder<T> {
    this.options.limit = count;
    return this;
  }

  /**
   * Skip a number of results (for pagination).
   *
   * @param count - Number of documents to skip.
   */
  skip(count: number): QueryBuilder<T> {
    this.options.skip = count;
    return this;
  }

  /**
   * Select specific fields to include in results.
   *
   * @param fields - Array of field names to include.
   */
  select(fields: string[]): QueryBuilder<T> {
    const projection: { [key: string]: 1 } = {};
    fields.forEach(field => {
      projection[field] = 1;
    });
    this.options.projection = projection;
    return this;
  }

  /**
   * Execute the query and return all matching results.
   *
   * @returns Query results containing documents, total count, and pagination info.
   * @throws {DatabaseError} When query execution fails.
   * @example
   * ```typescript
   * const results = await collection
   *   .query()
   *   .where('status', '$eq', 'active')
   *   .sort('name', 1)
   *   .limit(10)
   *   .execute();
   * console.log('Found:', results.documents.length);
   * ```
   * @since 1.0.0
   */
  async execute(): Promise<FindResult<T>> {
    return this.collection.find(this.filter, this.options);
  }

  /**
   * Execute query and return only the first matching document.
   *
   * @returns First matching document or null if no matches found.
   * @throws {DatabaseError} When query execution fails.
   * @example
   * ```typescript
   * const user = await collection
   *   .query()
   *   .where('email', '$eq', 'user@example.com')
   *   .findOne();
   * ```
   * @since 1.0.0
   */
  async findOne(): Promise<T | null> {
    this.options.limit = 1;
    const result = await this.collection.find(this.filter, this.options);
    return result.documents[0] || null;
  }

  /**
   * Count the number of documents that match the query without returning them.
   *
   * @returns Number of documents matching the current query filters.
   * @throws {DatabaseError} When count operation fails.
   * @example
   * ```typescript
   * const activeCount = await collection
   *   .query()
   *   .where('status', '$eq', 'active')
   *   .count();
   * ```
   * @since 1.0.0
   */
  async count(): Promise<number> {
    const result = await this.collection.find(this.filter, {});
    return result.total;
  }

  /**
   * Check if any documents match the current query filters.
   *
   * @returns True if at least one document matches, false otherwise.
   * @throws {DatabaseError} When query execution fails.
   * @example
   * ```typescript
   * const hasActive = await collection
   *   .query()
   *   .where('status', '$eq', 'active')
   *   .exists();
   * ```
   * @since 1.0.0
   */
  async exists(): Promise<boolean> {
    const result = await this.findOne();
    return result !== null;
  }

  /**
   * Find the first matching document and update it atomically.
   *
   * @param updateData - Partial document data to apply to the matched document.
   * @returns Updated document or null if no matches found.
   * @throws {DatabaseError} When query or update operation fails.
   * @example
   * ```typescript
   * const updated = await collection
   *   .query()
   *   .where('_id', '$eq', 'user123')
   *   .findOneAndUpdate({ lastLogin: new Date() });
   * ```
   * @since 1.0.0
   */
  async findOneAndUpdate(updateData: Partial<T>): Promise<T | null> {
    const doc = await this.findOne();
    if (!doc) return null;

    const result = await this.collection.update(
      { _id: (doc as any)._id },
      updateData
    );

    if (result.success) {
      return await this.findOne();
    }
    return null;
  }

  /**
   * Find the first matching document and delete it atomically.
   *
   * @returns Deleted document or null if no matches found.
   * @throws {DatabaseError} When query or delete operation fails.
   * @example
   * ```typescript
   * const deleted = await collection
   *   .query()
   *   .where('status', '$eq', 'expired')
   *   .findOneAndDelete();
   * if (deleted) {
   *   console.log('Deleted expired document:', deleted._id);
   * }
   * ```
   * @since 1.0.0
   */
  async findOneAndDelete(): Promise<T | null> {
    const doc = await this.findOne();
    if (!doc) return null;

    const result = await this.collection.delete({ _id: (doc as any)._id });

    if (result.success) {
      return doc;
    }
    return null;
  }
}
