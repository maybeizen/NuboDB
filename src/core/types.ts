export interface DatabaseOptions {
  path?: string;
  inMemory?: boolean;
  createIfMissing?: boolean;
  encrypt?: boolean;
  encryptionMethod?: 'aes-256-cbc' | 'aes-256-gcm' | 'chacha20-poly1305';
  encryptionKey?: string;
  encryptionKDF?: 'pbkdf2' | 'scrypt' | 'argon2';
  autoFlush?: boolean;
  flushInterval?: number;
  cacheDocuments?: boolean;
  maxCacheSize?: number;
  enableIndexing?: boolean;
  schemaValidation?: 'strict' | 'warn' | 'ignore';
  schemaPath?: string;
  debug?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

export interface SchemaField {
  type:
    | 'string'
    | 'number'
    | 'boolean'
    | 'object'
    | 'array'
    | 'date'
    | 'buffer';
  required?: boolean;
  default?: any;
  unique?: boolean;
  index?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  ref?: string;
  validate?: (value: any) => boolean | string;
}

export interface Schema {
  [fieldName: string]: SchemaField;
}

export interface Document {
  _id: string;
  _createdAt: Date;
  _updatedAt: Date;
  _version?: number;
  [key: string]: any;
}

export interface DocumentMetadata {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  size: number;
  checksum?: string;
  version?: number;
}

export type QueryOperator =
  | '$eq'
  | '$ne'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$in'
  | '$nin'
  | '$exists'
  | '$regex'
  | '$text'
  | '$and'
  | '$or'
  | '$nor'
  | '$not';

export interface QueryCondition {
  [operator: string]: any;
}

export interface QueryFilter {
  [field: string]: any | QueryCondition;
}

export interface QueryOptions {
  limit?: number;
  skip?: number;
  sort?: { [field: string]: 1 | -1 } | Array<[string, 1 | -1]>;
  projection?: { [field: string]: 0 | 1 };
  explain?: boolean;
  hint?: string;
  timeout?: number;
}

export interface CollectionOptions {
  schema?: Schema;
  encrypt?: boolean;
  compression?: boolean;
  indexes?: IndexDefinition[];
  maxDocuments?: number;
  autoIndex?: boolean;
  maxCacheSize?: number;
}

export interface IndexDefinition {
  fields: { [field: string]: 1 | -1 };
  unique?: boolean;
  sparse?: boolean;
  name?: string;
}

export interface InsertResult {
  id: string;
  success: boolean;
  document: Document;
  insertedCount: number;
}

export interface InsertManyResult {
  insertedIds: string[];
  insertedCount: number;
  success: boolean;
}

export interface UpdateResult {
  modifiedCount: number;
  success: boolean;
  upsertedId?: string;
  upsertedCount?: number;
}

export interface DeleteResult {
  deletedCount: number;
  success: boolean;
}

export interface FindResult<T = Document> {
  documents: T[];
  total: number;
  hasMore: boolean;
  page?: number;
  totalPages?: number;
}

export interface QueryBuilder<T = Document> {
  where(field: string, operator: QueryOperator, value: any): QueryBuilder<T>;
  and(field: string, operator: QueryOperator, value: any): QueryBuilder<T>;
  or(field: string, operator: QueryOperator, value: any): QueryBuilder<T>;
  sort(field: string, direction: 1 | -1): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  skip(count: number): QueryBuilder<T>;
  select(fields: string[]): QueryBuilder<T>;
  execute(): Promise<FindResult<T>>;
  findOne(): Promise<T | null>;
  count(): Promise<number>;
}

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  collection(name: string): any;
}

export interface DatabaseStats {
  collections: number;
  totalDocuments: number;
  totalSize: number;
  indexes: number;
  uptime: number;
}

export interface DatabaseEvents {
  'document:inserted': (collection: string, document: Document) => void;
  'document:updated': (collection: string, document: Document) => void;
  'document:deleted': (collection: string, documentId: string) => void;
  'collection:created': (name: string) => void;
  'collection:dropped': (name: string) => void;
  error: (error: Error) => void;
}
