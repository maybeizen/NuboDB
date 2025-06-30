export interface DatabaseOptions {
  path: string;
  inMemory?: boolean;
  createIfMissing?: boolean;

  encrypt?: boolean;
  encryptionMethod?: string;
  encryptionKey?: string;
  encryptionKDF?: 'pbkdf2' | 'scrypt' | 'argon2';

  autoFlush?: boolean;
  flushInterval?: number;
  cacheDocuments?: boolean;
  maxCacheSize?: number;

  schemaValidation?: boolean | 'strict' | 'warn' | 'ignore';
  schemaPath?: string;
}

export interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
  required?: boolean;
  default?: any;
  unique?: boolean;
  index?: boolean;
}

export interface Schema {
  [fieldName: string]: SchemaField;
}

export interface Document {
  _id: string;
  _createdAt: Date;
  _updatedAt: Date;
  [key: string]: any;
}

export interface DocumentMetadata {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  size: number;
  checksum?: string;
}

export interface QueryFilter {
  [field: string]: any;
}

export interface QueryOptions {
  limit?: number;
  skip?: number;
  sort?: { [field: string]: 1 | -1 };
  projection?: { [field: string]: 0 | 1 };
}

export interface CollectionOptions {
  schema?: Schema;
  encrypt?: boolean;
  compression?: boolean;
}

export interface InsertResult {
  id: string;
  success: boolean;
  document: Document;
}

export interface UpdateResult {
  modifiedCount: number;
  success: boolean;
}

export interface DeleteResult {
  deletedCount: number;
  success: boolean;
}

export interface FindResult {
  documents: Document[];
  total: number;
  hasMore: boolean;
}
