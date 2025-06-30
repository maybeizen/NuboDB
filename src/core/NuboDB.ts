import {
  DatabaseOptions,
  Schema,
  CollectionOptions,
  DatabaseStats,
  DatabaseEvents,
} from './types';
import { Collection } from './Collection';
import { FileStorage } from '../storage/FileStorage';
import { EncryptionManager } from '../encryption/EncryptionManager';
import { DatabaseError } from '../errors/DatabaseError';
import { EventEmitter } from 'events';

/**
 * Main database instance that manages collections and provides the public API.
 * Implements the singleton pattern for global database access.
 */
class NuboDB extends EventEmitter {
  private static instance: NuboDB | null = null;
  private options: DatabaseOptions;
  private storage: FileStorage;
  private encryptionManager?: EncryptionManager;
  private collections: Map<string, Collection> = new Map();
  private isOpen: boolean = false;
  private startTime: number = Date.now();
  private logger: any;

  /**
   * Private constructor for singleton pattern.
   *
   * @param options - Database configuration including storage path, encryption, etc.
   */
  private constructor(options: DatabaseOptions) {
    super();

    this.options = {
      path: './nubodb',
      inMemory: false,
      createIfMissing: true,
      encrypt: false,
      encryptionMethod: 'aes-256-cbc',
      encryptionKey: '',
      encryptionKDF: 'pbkdf2',
      autoFlush: true,
      flushInterval: 1000,
      cacheDocuments: true,
      maxCacheSize: 1000,
      schemaValidation: 'warn',
      debug: false,
      logLevel: 'info',
      ...options,
    };

    this.storage = new FileStorage(this.options.path!);
    this.setupLogger();

    if (this.options.encrypt && this.options.encryptionKey) {
      this.encryptionManager = new EncryptionManager(
        this.options.encryptionKey,
        this.options.encryptionMethod
      );
    }
  }

  /**
   * Get the singleton database instance. Creates one if it doesn't exist.
   *
   * @param options - Required for first initialization.
   */
  public static async getInstance(options?: DatabaseOptions): Promise<NuboDB> {
    if (!NuboDB.instance) {
      if (!options) {
        throw new DatabaseError(
          'Database options are required for first initialization',
          'INIT_ERROR'
        );
      }
      NuboDB.instance = new NuboDB(options);
    }
    return NuboDB.instance;
  }

  /**
   * Create a new database instance (bypasses singleton).
   *
   * @param options - Database configuration.
   */
  public static async create(options: DatabaseOptions): Promise<NuboDB> {
    return new NuboDB(options);
  }

  /** Initialize the database and create storage directories. */
  public async open(): Promise<void> {
    if (this.isOpen) {
      this.log('Database is already open', 'warn');
      return;
    }

    try {
      this.log('Opening database...', 'info');
      await this.storage.ensureDirectory(this.options.path!);
      this.isOpen = true;
      this.log('Database opened successfully', 'info');
    } catch (error) {
      const errorMsg = `Failed to open database: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMsg, 'error');
      this.emit('error', new Error(errorMsg));
      throw new DatabaseError(errorMsg, 'OPEN_ERROR');
    }
  }

  /** Clean up resources and close all collections. */
  public async close(): Promise<void> {
    if (!this.isOpen) {
      this.log('Database is not open', 'warn');
      return;
    }

    try {
      this.log('Closing database...', 'info');

      for (const collection of this.collections.values()) {
        collection.clearCache();
      }
      this.collections.clear();

      this.isOpen = false;
      this.log('Database closed successfully', 'info');
    } catch (error) {
      const errorMsg = `Failed to close database: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMsg, 'error');
      this.emit('error', new Error(errorMsg));
      throw new DatabaseError(errorMsg, 'CLOSE_ERROR');
    }
  }

  /**
   * Get or create a collection by name.
   *
   * @param name    - Collection name.
   * @param options - Optional collection-specific settings.
   * @returns Collection instance for CRUD operations.
   */
  public collection<T = any>(
    name: string,
    options?: CollectionOptions
  ): Collection<T> {
    if (!this.isOpen) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    if (!this.collections.has(name)) {
      const collectionOptions: CollectionOptions = {
        autoIndex: true,
        maxDocuments: 1000000,
        ...options,
      };

      if (this.options.encrypt) {
        collectionOptions.encrypt = true;
      }

      const collection = new Collection<T>(
        name,
        this.storage,
        collectionOptions
      );
      this.collections.set(name, collection as any);

      this.log(`Collection '${name}' accessed`, 'debug');
      this.emit('collection:accessed', name);
    }

    return this.collections.get(name)! as Collection<T>;
  }

  /**
   * Explicitly create a new collection with optional schema.
   *
   * @param name    - Collection name.
   * @param schema  - Optional schema for validation.
   * @param options - Collection configuration.
   */
  public async createCollection<T = any>(
    name: string,
    schema?: Schema,
    options?: CollectionOptions
  ): Promise<Collection<T>> {
    if (!this.isOpen) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    if (this.collections.has(name)) {
      throw new DatabaseError(
        `Collection '${name}' already exists`,
        'COLLECTION_EXISTS_ERROR'
      );
    }

    const collectionOptions: CollectionOptions = {
      autoIndex: true,
      maxDocuments: 1000000,
      ...options,
    };

    if (this.options.encrypt) {
      collectionOptions.encrypt = true;
    }

    if (schema) {
      collectionOptions.schema = schema;
    }

    const collection = new Collection<T>(name, this.storage, collectionOptions);
    this.collections.set(name, collection as any);

    this.log(`Collection '${name}' created`, 'info');
    this.emit('collection:created', name);

    return collection;
  }

  /**
   * Delete all documents in a collection and remove it from memory.
   *
   * @param name - Collection to drop.
   * @returns Success status.
   */
  public async dropCollection(name: string): Promise<boolean> {
    if (!this.isOpen) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    const collection = this.collections.get(name);
    if (!collection) {
      this.log(`Collection '${name}' not found`, 'warn');
      return false;
    }

    try {
      const result = await (collection as any).delete({});
      this.collections.delete(name);

      this.log(`Collection '${name}' dropped`, 'info');
      this.emit('collection:dropped', name);

      return result.success;
    } catch (error) {
      const errorMsg = `Failed to drop collection '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMsg, 'error');
      this.emit('error', new Error(errorMsg));
      return false;
    }
  }

  /** Get names of all currently loaded collections. */
  public async listCollections(): Promise<string[]> {
    if (!this.isOpen) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    return Array.from(this.collections.keys());
  }

  /** Check if a collection is currently loaded in memory. */
  public hasCollection(name: string): boolean {
    return this.collections.has(name);
  }

  /** Get aggregated statistics across all collections. */
  public async getStats(): Promise<DatabaseStats> {
    if (!this.isOpen) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    let totalDocuments = 0;
    let totalSize = 0;
    let indexes = 0;

    for (const collection of this.collections.values()) {
      const stats = await (collection as any).stats();
      totalDocuments += stats.totalDocuments;
      totalSize += stats.totalSize;
      indexes += stats.indexes;
    }

    return {
      collections: this.collections.size,
      totalDocuments,
      totalSize,
      indexes,
      uptime: Date.now() - this.startTime,
    };
  }

  /** Get a copy of current database configuration. */
  public getOptions(): DatabaseOptions {
    return { ...this.options };
  }

  /** Check if database is currently open and ready for operations. */
  public isDatabaseOpen(): boolean {
    return this.isOpen;
  }

  /** Get the storage path where database files are located. */
  public getPath(): string {
    return this.options.path!;
  }

  /** Clear all collection caches to free memory. */
  public clearCaches(): void {
    for (const collection of this.collections.values()) {
      collection.clearCache();
    }
    this.log('All caches cleared', 'info');
  }

  /**
   * Create a backup of the database (placeholder implementation).
   *
   * @param backupPath - Destination for backup files.
   */
  public async backup(backupPath: string): Promise<void> {
    if (!this.isOpen) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    try {
      this.log(`Creating backup to ${backupPath}`, 'info');
      this.log('Backup completed successfully', 'info');
    } catch (error) {
      const errorMsg = `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMsg, 'error');
      this.emit('error', new Error(errorMsg));
      throw new DatabaseError(errorMsg, 'BACKUP_ERROR');
    }
  }

  /** Perform database compaction to optimize storage (placeholder). */
  public async compact(): Promise<void> {
    if (!this.isOpen) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    try {
      this.log('Starting database compaction...', 'info');

      for (const collection of this.collections.values()) {
        await collection.stats();
      }

      this.log('Database compaction completed', 'info');
    } catch (error) {
      const errorMsg = `Compaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMsg, 'error');
      this.emit('error', new Error(errorMsg));
      throw new DatabaseError(errorMsg, 'COMPACT_ERROR');
    }
  }

  private setupLogger(): void {
    if (this.options.debug) {
      this.logger = {
        log: (level: string, message: string) => {
          const timestamp = new Date().toISOString();
          console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        },
      };
    }
  }

  private log(message: string, level: string = 'info'): void {
    if (this.options.debug && this.logger) {
      this.logger.log(level, `[NuboDB] ${message}`);
    }
  }

  public on<K extends keyof DatabaseEvents>(
    event: K,
    listener: DatabaseEvents[K]
  ): this {
    return super.on(event, listener);
  }

  public once<K extends keyof DatabaseEvents>(
    event: K,
    listener: DatabaseEvents[K]
  ): this {
    return super.once(event, listener);
  }

  public off<K extends keyof DatabaseEvents>(
    event: K,
    listener: DatabaseEvents[K]
  ): this {
    return super.off(event, listener);
  }
}

export default NuboDB;
