import {
  QueryFilter,
  QueryOptions,
  QueryOperator,
  FindResult,
  Document,
} from './types';

export class QueryBuilder<T = Document> {
  private filter: QueryFilter = {};
  private options: QueryOptions = {};
  private collection: any;

  constructor(collection: any) {
    this.collection = collection;
  }

  where(field: string, operator: QueryOperator, value: any): QueryBuilder<T> {
    if (operator === '$eq') {
      this.filter[field] = value;
    } else {
      this.filter[field] = { [operator]: value };
    }
    return this;
  }

  and(field: string, operator: QueryOperator, value: any): QueryBuilder<T> {
    if (!this.filter.$and) {
      this.filter.$and = [];
    }
    this.filter.$and.push({ [field]: { [operator]: value } });
    return this;
  }

  or(field: string, operator: QueryOperator, value: any): QueryBuilder<T> {
    if (!this.filter.$or) {
      this.filter.$or = [];
    }
    this.filter.$or.push({ [field]: { [operator]: value } });
    return this;
  }

  sort(field: string, direction: 1 | -1): QueryBuilder<T> {
    this.options.sort = { [field]: direction };
    return this;
  }

  limit(count: number): QueryBuilder<T> {
    this.options.limit = count;
    return this;
  }

  skip(count: number): QueryBuilder<T> {
    this.options.skip = count;
    return this;
  }

  select(fields: string[]): QueryBuilder<T> {
    const projection: { [key: string]: 1 } = {};
    fields.forEach(field => {
      projection[field] = 1;
    });
    this.options.projection = projection;
    return this;
  }

  async execute(): Promise<FindResult<T>> {
    return this.collection.find(this.filter, this.options);
  }

  async findOne(): Promise<T | null> {
    this.options.limit = 1;
    const result = await this.collection.find(this.filter, this.options);
    return result.documents[0] || null;
  }

  async count(): Promise<number> {
    const result = await this.collection.find(this.filter, {});
    return result.total;
  }

  async exists(): Promise<boolean> {
    const result = await this.findOne();
    return result !== null;
  }

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
