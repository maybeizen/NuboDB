/** Base error class for all database-related errors */
export class DatabaseError extends Error {
  public readonly code: string;
  public readonly details?: any;

  /** @param message Error message
   * @param code Error code for programmatic handling */
  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
  }
}

/** Error thrown when collection operations fail */
export class CollectionError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'COLLECTION_ERROR', details);
    this.name = 'CollectionError';
  }
}

/** Error thrown when document operations fail */
export class DocumentError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'DOCUMENT_ERROR', details);
    this.name = 'DocumentError';
  }
}

export class SchemaError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'SCHEMA_ERROR', details);
    this.name = 'SchemaError';
  }
}

export class EncryptionError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'ENCRYPTION_ERROR', details);
    this.name = 'EncryptionError';
  }
}

export class StorageError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'STORAGE_ERROR', details);
    this.name = 'StorageError';
  }
}
