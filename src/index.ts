export { default as NuboDB } from './core/NuboDB';
export { Collection } from './core/Collection';

export type {
  DatabaseOptions,
  Schema,
  SchemaField,
  Document,
  DocumentMetadata,
  QueryFilter,
  QueryOptions,
  CollectionOptions,
  InsertResult,
  UpdateResult,
  DeleteResult,
  FindResult,
} from './core/types';

export {
  DatabaseError,
  CollectionError,
  DocumentError,
  SchemaError,
  EncryptionError,
  StorageError,
} from './errors/DatabaseError';

export {
  generateId,
  generateTimestamp,
  createDocumentMetadata,
} from './utils/id';
export {
  validateSchema,
  applyDefaults,
  sanitizeDocument,
} from './utils/schema';
