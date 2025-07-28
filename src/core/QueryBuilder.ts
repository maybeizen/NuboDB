import type {
  QueryFilter,
  QueryOptions,
  QueryOperator,
  FindResult,
  Document,
} from './types';

/** @typeParam T Document type being queried */
export class QueryBuilder<T = Document> {
  private filter: QueryFilter = {};
  private options: QueryOptions = {};
  private collection: any;

  /** @param collection Collection instance to query */
  constructor(collection: any) {
    this.collection = collection;
  }

  /** @param field Document field to filter on
   * @param operator Comparison operator ($eq, $gt, etc.)
   * @param value Value to compare against */
  where(
    field: string,
    operator: QueryOperator,
    value: unknown
  ): QueryBuilder<T> {
    if (operator === '$eq') {
      this.filter[field] = value;
    } else {
      this.filter[field] = { [operator]: value };
    }
    return this;
  }

  /** @param field Document field to filter on
   * @param operator Comparison operator
   * @param value Value to compare against */
  and(field: string, operator: QueryOperator, value: unknown): QueryBuilder<T> {
    if (!this.filter.$and) {
      this.filter.$and = [];
    }
    (this.filter.$and as Array<Record<string, Record<string, unknown>>>).push({
      [field]: { [operator]: value },
    });
    return this;
  }

  /** @param field Document field to filter on
   * @param operator Comparison operator
   * @param value Value to compare against */
  or(field: string, operator: QueryOperator, value: unknown): QueryBuilder<T> {
    if (!this.filter.$or) {
      this.filter.$or = [];
    }
    (this.filter.$or as Array<Record<string, Record<string, unknown>>>).push({
      [field]: { [operator]: value },
    });
    return this;
  }

  /** @param field Field to sort by
   * @param direction 1 for ascending, -1 for descending */
  sort(field: string, direction: 1 | -1): QueryBuilder<T> {
    this.options.sort = { [field]: direction };
    return this;
  }

  /** @param count Maximum number of documents to return */
  limit(count: number): QueryBuilder<T> {
    this.options.limit = count;
    return this;
  }

  /** @param count Number of documents to skip */
  skip(count: number): QueryBuilder<T> {
    this.options.skip = count;
    return this;
  }

  /** @param fields Array of field names to include */
  select(fields: string[]): QueryBuilder<T> {
    const projection: { [key: string]: 1 } = {};
    fields.forEach(field => {
      projection[field] = 1;
    });
    this.options.projection = projection;
    return this;
  }

  /** @returns Query results with documents, total count, and pagination info */
  async execute(): Promise<FindResult<T>> {
    return this.collection.find(this.filter, this.options);
  }

  /** @returns First matching document or null */
  async findOne(): Promise<T | null> {
    this.options.limit = 1;
    const result = await this.collection.find(this.filter, this.options);
    return result.documents[0] || null;
  }

  /** @returns Number of matching documents */
  async count(): Promise<number> {
    const result = await this.collection.find(this.filter, { limit: 1 });
    if (result.total === 0) return 0;

    const fullResult = await this.collection.find(this.filter, {});
    return fullResult.total;
  }

  /** @returns True if at least one document matches */
  async exists(): Promise<boolean> {
    const result = await this.collection.find(this.filter, { limit: 1 });
    return result.documents.length > 0;
  }

  /** @param updateData Partial document data to apply
   * @returns Updated document or null */
  async findOneAndUpdate(updateData: Partial<T>): Promise<T | null> {
    const result = await this.collection.find(this.filter, { limit: 1 });
    if (result.documents.length === 0) return null;

    const doc = result.documents[0];
    const docWithId = doc as T & { _id: string };
    const updateResult = await this.collection.update(
      { _id: docWithId._id },
      updateData
    );

    if (updateResult.success) {
      return await this.collection.findById(docWithId._id);
    }
    return null;
  }

  /** @returns Deleted document or null */
  async findOneAndDelete(): Promise<T | null> {
    const result = await this.collection.find(this.filter, { limit: 1 });
    if (result.documents.length === 0) return null;

    const doc = result.documents[0];
    const docWithId = doc as T & { _id: string };
    const deleteResult = await this.collection.delete({ _id: docWithId._id });

    if (deleteResult.success) {
      return doc;
    }
    return null;
  }
}
