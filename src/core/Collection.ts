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

export class Collection<T = Document> {
  private documentOps: DocumentOperations<T>;
  private queryOps: QueryOperations<T>;

  constructor(
    name: string,
    storage: FileStorage,
    options: CollectionOptions = {}
  ) {
    this.documentOps = new DocumentOperations<T>(name, storage, options);
    this.queryOps = new QueryOperations<T>(name, storage, options);
  }

  async insert(data: Partial<T>): Promise<InsertResult> {
    return this.documentOps.insert(data);
  }

  async insertMany(documents: Partial<T>[]): Promise<InsertManyResult> {
    return this.documentOps.insertMany(documents);
  }

  async update(
    filter: QueryFilter,
    updateData: Partial<T>
  ): Promise<UpdateResult> {
    return this.documentOps.update(filter, updateData);
  }

  async upsert(
    filter: QueryFilter,
    updateData: Partial<T>
  ): Promise<UpdateResult> {
    return this.documentOps.upsert(filter, updateData);
  }

  async delete(filter: QueryFilter): Promise<DeleteResult> {
    return this.documentOps.delete(filter);
  }

  async deleteOne(filter: QueryFilter): Promise<DeleteResult> {
    return this.documentOps.deleteOne(filter);
  }

  async createIndex(definition: IndexDefinition): Promise<void> {
    return this.documentOps.createIndex(definition);
  }

  async find(
    filter: QueryFilter = {},
    options: QueryOptions = {}
  ): Promise<FindResult<T>> {
    return this.queryOps.find(filter, options);
  }

  async findOne(filter: QueryFilter = {}): Promise<T | null> {
    return this.queryOps.findOne(filter);
  }

  async findById(id: string): Promise<T | null> {
    return this.queryOps.findById(id);
  }

  query(): QueryBuilder<T> {
    return this.queryOps.query();
  }

  async count(filter: QueryFilter = {}): Promise<number> {
    return this.queryOps.count(filter);
  }

  async isEmpty(): Promise<boolean> {
    return this.queryOps.isEmpty();
  }

  clearCache(): void {
    this.documentOps.clearCache();
  }

  async stats(): Promise<{
    totalDocuments: number;
    totalSize: number;
    indexes: number;
    cacheSize: number;
  }> {
    return this.documentOps.stats();
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.documentOps.initialize(),
      this.queryOps.initialize(),
    ]);
  }
}
