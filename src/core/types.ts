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