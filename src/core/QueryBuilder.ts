import {
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

  /** Execute the query and return results. */
  async execute(): Promise<FindResult<T>> {
    return this.collection.find(this.filter, this.options);
  }

  /** Execute query and return the first result only. */
  async findOne(): Promise<T | null> {
    this.options.limit = 1;
    const result = await this.collection.find(this.filter, this.options);
    return result.documents[0] || null;
  }

  /** Count documents matching the query. */
  async count(): Promise<number> {
    const result = await this.collection.find(this.filter, {});
    return result.total;
  }

  /** Check if any documents match the query. */
  async exists(): Promise<boolean> {
    const result = await this.findOne();
    return result !== null;
  }

  /**
   * Find first matching document and update it.
   *
   * @param updateData - Fields to update.
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

  /** Find first matching document and delete it. */
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
