/**
 * Configuration options for database initialization.
 *
 * @example
 * ```typescript
 * const options: DatabaseOptions = {
 *   path: './data/mydb',
 *   encrypt: true,
 *   encryptionKey: 'your-secret-key',
 *   cacheDocuments: true,
 *   maxCacheSize: 1000
 * };
 * ```
 */
export interface DatabaseOptions {
  /** Storage path for database files. Defaults to './nubodb'. */
  path?: string;
  /** Store data in memory only (no persistence). Defaults to false. */
  inMemory?: boolean;
  /** Create database directory if it doesn't exist. Defaults to true. */
  createIfMissing?: boolean;

  /** Enable encryption for stored data. Defaults to false. */
  encrypt?: boolean;
  /** Encryption algorithm to use. Defaults to 'aes-256-cbc'. */
  encryptionMethod?: 'aes-256-cbc' | 'aes-256-gcm' | 'chacha20-poly1305';
  /** Encryption key for data security. Required if encrypt is true. */
  encryptionKey?: string;
  /** Key derivation function for encryption. Defaults to 'pbkdf2'. */
  encryptionKDF?: 'pbkdf2' | 'scrypt' | 'argon2';

  /** Automatically flush changes to disk. Defaults to true. */
  autoFlush?: boolean;
  /** Interval in milliseconds for automatic flushing. Defaults to 1000. */
  flushInterval?: number;
  /** Enable in-memory document caching. Defaults to true. */
  cacheDocuments?: boolean;
  /** Maximum number of documents to cache. Defaults to 1000. */
  maxCacheSize?: number;
  /** Enable automatic indexing. Defaults to true. */
  enableIndexing?: boolean;

  /** Schema validation mode. Defaults to 'warn'. */
  schemaValidation?: 'strict' | 'warn' | 'ignore';
  /** Path to schema definition file. */
  schemaPath?: string;

  /** Enable debug logging. Defaults to false. */
  debug?: boolean;
  /** Logging level for debug output. Defaults to 'info'. */
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Definition of a single field in a document schema.
 *
 * @example
 * ```typescript
 * const userSchema: Schema = {
 *   name: {
 *     type: 'string',
 *     required: true,
 *     min: 2,
 *     max: 50
 *   },
 *   email: {
 *     type: 'string',
 *     required: true,
 *     unique: true,
 *     pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 *   },
 *   age: {
 *     type: 'number',
 *     min: 0,
 *     max: 150
 *   }
 * };
 * ```
 */
export interface SchemaField {
  /** Data type for this field. */
  type:
    | 'string'
    | 'number'
    | 'boolean'
    | 'object'
    | 'array'
    | 'date'
    | 'buffer';
  /** Whether this field is required. Defaults to false. */
  required?: boolean;
  /** Default value when field is not provided. */
  default?: any;
  /** Whether this field must have unique values across documents. */
  unique?: boolean;
  /** Whether to create an index on this field for faster queries. */
  index?: boolean;
  /** Minimum value (for numbers) or length (for strings/arrays). */
  min?: number;
  /** Maximum value (for numbers) or length (for strings/arrays). */
  max?: number;
  /** Regular expression pattern for string validation. */
  pattern?: RegExp;
  /** Array of allowed values for this field. */
  enum?: any[];
  /** Reference to another collection (for relationships). */
  ref?: string;
  /** Custom validation function. Return true for valid, string for error message. */
  validate?: (value: any) => boolean | string;
}

/**
 * Complete schema definition for a collection.
 * Maps field names to their schema definitions.
 *
 * @example
 * ```typescript
 * const userSchema: Schema = {
 *   name: { type: 'string', required: true },
 *   email: { type: 'string', required: true, unique: true },
 *   age: { type: 'number', min: 0 },
 *   isActive: { type: 'boolean', default: true }
 * };
 * ```
 */
export interface Schema {
  /** Schema field definitions indexed by field name. */
  [fieldName: string]: SchemaField;
}

/**
 * Base document interface with system metadata.
 * All documents stored in NuboDB extend this interface.
 *
 * @example
 * ```typescript
 * interface User extends Document {
 *   name: string;
 *   email: string;
 *   age?: number;
 * }
 * ```
 */
export interface Document {
  /** Unique identifier for this document. */
  _id: string;
  /** Timestamp when document was created. */
  _createdAt: Date;
  /** Timestamp when document was last updated. */
  _updatedAt: Date;
  /** Document version for optimistic concurrency control. */
  _version?: number;
  /** Additional user-defined fields. */
  [key: string]: any;
}

/**
 * Lightweight document metadata without full content.
 * Used for efficient document listings and cache management.
 */
export interface DocumentMetadata {
  /** Document unique identifier. */
  id: string;
  /** Creation timestamp. */
  createdAt: Date;
  /** Last update timestamp. */
  updatedAt: Date;
  /** Document size in bytes. */
  size: number;
  /** Document content checksum for integrity verification. */
  checksum?: string;
  /** Document version number. */
  version?: number;
}

/**
 * Supported query operators for filtering documents.
 * Similar to MongoDB query operators but with NuboDB-specific implementations.
 *
 * @example
 * ```typescript
 * // Equality and comparison
 * { age: { $gte: 18, $lt: 65 } }
 *
 * // Array membership
 * { status: { $in: ['active', 'pending'] } }
 *
 * // Logical operators
 * { $and: [{ age: { $gte: 18 } }, { status: 'active' }] }
 *
 * // Text search
 * { name: { $regex: /john/i } }
 * ```
 */
export type QueryOperator =
  /** Equality operator. */
  | '$eq'
  /** Not equal operator. */
  | '$ne'
  /** Greater than operator. */
  | '$gt'
  /** Greater than or equal operator. */
  | '$gte'
  /** Less than operator. */
  | '$lt'
  /** Less than or equal operator. */
  | '$lte'
  /** Value exists in array operator. */
  | '$in'
  /** Value not in array operator. */
  | '$nin'
  /** Field exists operator. */
  | '$exists'
  /** Regular expression match operator. */
  | '$regex'
  /** Full-text search operator. */
  | '$text'
  /** Logical AND operator. */
  | '$and'
  /** Logical OR operator. */
  | '$or'
  /** Logical NOR operator. */
  | '$nor'
  /** Logical NOT operator. */
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
