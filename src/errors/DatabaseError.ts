export class DatabaseError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
  }
}

export class CollectionError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'COLLECTION_ERROR', details);
    this.name = 'CollectionError';
  }
}

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
