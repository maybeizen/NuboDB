import NuboDB from './core/NuboDB';
import type { DatabaseOptions } from './core/types';
/**
 * Main database class - use this for creating database instances.
 */
export { default as NuboDB } from './core/NuboDB';
export { Collection } from './core/Collection';
/**
 * Fluent query builder for complex queries.
 */
export { QueryBuilder } from './core/QueryBuilder';

export { BaseCollection } from './core/BaseCollection';
export { DocumentOperations } from './core/DocumentOperations';
export { QueryOperations } from './core/QueryOperations';

/**
 * Type definitions for NuboDB.
 */
export type {
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

/**
 * Error classes for handling database errors.
 */
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

/**
 * File-based storage implementation.
 */
export { FileStorage } from './storage/FileStorage';
/**
 * AES-256 encryption manager.
 */
export { EncryptionManager } from './encryption/EncryptionManager';

/**
 * Convenience function for creating database instances.
 *
 * @param options - Database configuration options.
 * @returns Promise resolving to a database instance.
 */
export async function createDatabase(
  options: DatabaseOptions
): Promise<NuboDB> {
  return NuboDB.create(options);
}

export const getDatabase = NuboDB.getInstance;

export default NuboDB;
