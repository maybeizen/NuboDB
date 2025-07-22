import type {
  QueryFilter,
  QueryOptions,
  QueryOperator,
  FindResult,
  Document,
} from './types';

/**
 * @typeParam T - Document type being queried
 */
export class QueryBuilder<T = Document> {
  private filter: QueryFilter = {};
  private options: QueryOptions = {};
  private collection: any;

  /**
   * @param collection - Collection instance to query
   */
  constructor(collection: any) {
    this.collection = collection;
  }

  /**
   * @param field - Document field to filter on
   * @param operator - Comparison operator ($eq, $gt, etc.)
   * @param value - Value to compare against
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
   * @param field - Document field to filter on
   * @param operator - Comparison operator
   * @param value - Value to compare against
   */
  and(field: string, operator: QueryOperator, value: any): QueryBuilder<T> {
    if (!this.filter.$and) {
      this.filter.$and = [];
    }
    this.filter.$and.push({ [field]: { [operator]: value } });
    return this;
  }

  /**
   * @param field - Document field to filter on
   * @param operator - Comparison operator
   * @param value - Value to compare against
   */
  or(field: string, operator: QueryOperator, value: any): QueryBuilder<T> {
    if (!this.filter.$or) {
      this.filter.$or = [];
    }
    this.filter.$or.push({ [field]: { [operator]: value } });
    return this;
  }

  /**
   * @param field - Field to sort by
   * @param direction - 1 for ascending, -1 for descending
   */
  sort(field: string, direction: 1 | -1): QueryBuilder<T> {
    this.options.sort = { [field]: direction };
    return this;
  }

  /**
   * @param count - Maximum number of documents to return
   */
  limit(count: number): QueryBuilder<T> {
    this.options.limit = count;
    return this;
  }

  /**
   * @param count - Number of documents to skip
   */
  skip(count: number): QueryBuilder<T> {
    this.options.skip = count;
    return this;
  }

  /**
   * @param fields - Array of field names to include
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
   * @returns Query results containing documents, total count, and pagination info
   */
  async execute(): Promise<FindResult<T>> {
    return this.collection.find(this.filter, this.options);
  }

  /**
   * @returns First matching document or null if no matches found
   */
  async findOne(): Promise<T | null> {
    this.options.limit = 1;
    const result = await this.collection.find(this.filter, this.options);
    return result.documents[0] || null;
  }

  /**
   * @returns Number of documents matching the current query filters
   */
  async count(): Promise<number> {
    const result = await this.collection.find(this.filter, {});
    return result.total;
  }

  /**
   * @returns True if at least one document matches, false otherwise
   */
  async exists(): Promise<boolean> {
    const result = await this.findOne();
    return result !== null;
  }

  /**
   * @param updateData - Partial document data to apply to the matched document
   * @returns Updated document or null if no matches found
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
   * @returns Deleted document or null if no matches found
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
