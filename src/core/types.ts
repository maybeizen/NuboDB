/**
 * Configuration options for database initialization.
 */
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

/**
 * Definition of a single field in a document schema.
 */
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

/**
 * Complete schema definition for a collection.
 */
export interface Schema {
  [fieldName: string]: SchemaField;
}

/**
 * Base document interface with system metadata.
 */
export interface Document {
  _id: string;
  _createdAt: Date;
  _updatedAt: Date;
  _version?: number;
  [key: string]: any;
}

/**
 * Lightweight document metadata without full content.
 */
export interface DocumentMetadata {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  size: number;
  checksum?: string;
  version?: number;
}

/**
 * Supported query operators for filtering documents.
 */
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

/**
 * Query condition with operator and value.
 */
export interface QueryCondition {
  [operator: string]: any;
}

/**
 * MongoDB-like query filter for finding documents.
 */
export interface QueryFilter {
  [field: string]: any | QueryCondition;
}

/**
 * Options for query operations like sorting, pagination, and projection.
 */
export interface QueryOptions {
  limit?: number;
  skip?: number;
  sort?: { [field: string]: 1 | -1 } | Array<[string, 1 | -1]>;
  projection?: { [field: string]: 0 | 1 };
  explain?: boolean;
  hint?: string;
  timeout?: number;
}

/**
 * Configuration options for collections.
 */
export interface CollectionOptions {
  schema?: Schema;
  encrypt?: boolean;
  compression?: boolean;
  indexes?: IndexDefinition[];
  maxDocuments?: number;
  autoIndex?: boolean;
  maxCacheSize?: number;
}

/**
 * Definition of a database index.
 */
export interface IndexDefinition {
  fields: { [field: string]: 1 | -1 };
  unique?: boolean;
  sparse?: boolean;
  name?: string;
}

/**
 * Result of a single document insert operation.
 */
export interface InsertResult {
  id: string;
  success: boolean;
  document: Document;
  insertedCount: number;
}

/**
 * Result of a bulk document insert operation.
 */
export interface InsertManyResult {
  insertedIds: string[];
  insertedCount: number;
  success: boolean;
}

/**
 * Result of a document update operation.
 */
export interface UpdateResult {
  modifiedCount: number;
  success: boolean;
  upsertedId?: string;
  upsertedCount?: number;
}

/**
 * Result of a document delete operation.
 */
export interface DeleteResult {
  deletedCount: number;
  success: boolean;
}

/**
 * Result of a document find operation with pagination metadata.
 */
export interface FindResult<T = Document> {
  documents: T[];
  total: number;
  hasMore: boolean;
  page?: number;
  totalPages?: number;
}

/**
 * Fluent interface for building complex queries.
 */
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

/**
 * Database transaction interface (placeholder for future implementation).
 */
export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  collection<T = Document>(name: string): any;
}

/**
 * Database-wide statistics and metrics.
 */
export interface DatabaseStats {
  collections: number;
  totalDocuments: number;
  totalSize: number;
  indexes: number;
  uptime: number;
}

/**
 * Event types emitted by the database.
 */
export interface DatabaseEvents {
  'document:inserted': (collection: string, document: Document) => void;
  'document:updated': (collection: string, document: Document) => void;
  'document:deleted': (collection: string, documentId: string) => void;
  'collection:created': (name: string) => void;
  'collection:dropped': (name: string) => void;
  error: (error: Error) => void;
}
