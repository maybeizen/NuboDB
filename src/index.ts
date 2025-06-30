import NuboDB from './core/NuboDB';
export { default as NuboDB } from './core/NuboDB';
export { Collection } from './core/Collection';
export { QueryBuilder } from './core/QueryBuilder';

export { BaseCollection } from './core/BaseCollection';
export { DocumentOperations } from './core/DocumentOperations';
export { QueryOperations } from './core/QueryOperations';

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
  InsertManyResult,
  UpdateResult,
  DeleteResult,
  FindResult,
  IndexDefinition,
  QueryBuilder as QueryBuilderType,
  Transaction,
  DatabaseStats,
  DatabaseEvents,
  QueryOperator,
  QueryCondition,
} from './core/types';

export type { DocumentWithMetadata } from './core/BaseCollection';

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

export { FileStorage } from './storage/FileStorage';
export { EncryptionManager } from './encryption/EncryptionManager';

export const createDatabase = NuboDB.create;
export const getDatabase = NuboDB.getInstance;

export default NuboDB;
