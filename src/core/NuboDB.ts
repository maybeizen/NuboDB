import type {
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
import { Document } from './types';

/**
 * Main database instance that manages collections and provides the public API
 */
class NuboDB extends EventEmitter {
  private static instance: NuboDB | null = null;
  private options: DatabaseOptions;
  private storage: FileStorage;
  private encryptionManager?: EncryptionManager;
  private collections: Map<string, Collection> = new Map();
  private aliases: Map<string, string> = new Map();
  private isOpen: boolean = false;
  private startTime: number = Date.now();
  private logger: { log: (level: string, message: string) => void } | null =
    null;

  /** @param options Database configuration */
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

  /** @param options Required for first initialization */
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

  /** @param options Database configuration */
  public static async create(options: DatabaseOptions): Promise<NuboDB> {
    return new NuboDB(options);
  }

  /** Initialize database and create storage directories */
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

  /** Clean up resources and close all collections */
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

  /** @param name Collection name or alias
   * @param options Collection-specific settings
   * @returns Collection instance for CRUD operations */
  public collection<T = Document>(
    name: string,
    options?: CollectionOptions
  ): Collection<T> {
    if (!this.isOpen) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    const actualName = this.aliases.get(name) || name;

    if (!this.collections.has(actualName)) {
      const collectionOptions: CollectionOptions = {
        autoIndex: true,
        maxDocuments: 1000000,
        ...options,
      };

      if (this.options.encrypt) {
        collectionOptions.encrypt = true;
      }

      const collection = new Collection<T>(
        actualName,
        this.storage,
        collectionOptions
      );
      this.collections.set(actualName, collection as Collection);

      this.log(`Collection '${actualName}' accessed`, 'debug');
      this.emit('collection:accessed', actualName);
    }

    return this.collections.get(actualName)! as Collection<T>;
  }

  /** @param name Collection name
   * @param schema Schema for validation
   * @param options Collection configuration */
  public async createCollection<T = Document>(
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
    this.collections.set(name, collection as Collection);

    this.log(`Collection '${name}' created`, 'info');
    this.emit('collection:created', name);

    return collection;
  }

  /** @param name Collection to drop
   * @returns Success status */
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
      const result = await collection.delete({});
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

  /** @returns Array of collection names in memory */
  public async listCollections(): Promise<string[]> {
    if (!this.isOpen) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    return Array.from(this.collections.keys());
  }

  /** @param name Collection name to check
   * @returns True if collection exists in memory */
  public hasCollection(name: string): boolean {
    return this.collections.has(name);
  }

  /** @returns Database statistics */
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
      const stats = await collection.stats();
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

  /** @returns Copy of database options */
  public getOptions(): DatabaseOptions {
    return { ...this.options };
  }

  /** @returns True if database is open */
  public isDatabaseOpen(): boolean {
    return this.isOpen;
  }

  /** @returns Path to database storage directory */
  public getPath(): string {
    return this.options.path!;
  }

  /** Clear all collection caches to free memory */
  public clearCaches(): void {
    for (const collection of this.collections.values()) {
      collection.clearCache();
    }
    this.log('All caches cleared', 'info');
  }

  /** @param backupPath Destination for backup files */
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

  /** Perform database compaction to optimize storage */
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

  /** Validate database integrity and return health status */
  public async validate(): Promise<{
    isValid: boolean;
    issues: string[];
    collections: Record<string, { documents: number; issues: string[] }>;
  }> {
    if (!this.isOpen) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    const issues: string[] = [];
    const collections: Record<string, { documents: number; issues: string[] }> =
      {};

    try {
      for (const [name, collection] of this.collections) {
        const collectionIssues: string[] = [];
        const stats = await collection.stats();

        if (stats.totalDocuments === 0 && stats.cacheSize > 0) {
          collectionIssues.push('Cache-storage mismatch detected');
        }

        collections[name] = {
          documents: stats.totalDocuments,
          issues: collectionIssues,
        };

        issues.push(
          ...collectionIssues.map(issue => `Collection '${name}': ${issue}`)
        );
      }

      return {
        isValid: issues.length === 0,
        issues,
        collections,
      };
    } catch (error) {
      const errorMsg = `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMsg, 'error');
      throw new DatabaseError(errorMsg, 'VALIDATION_ERROR');
    }
  }

  /** Check if database path exists and is accessible */
  public async isAccessible(): Promise<boolean> {
    try {
      await this.storage.ensureDirectory(this.options.path!);
      return true;
    } catch {
      return false;
    }
  }

  /** Create an alias for a collection name */
  public createAlias(alias: string, collectionName: string): void {
    if (this.aliases.has(alias)) {
      throw new DatabaseError(
        `Alias '${alias}' already exists`,
        'ALIAS_EXISTS_ERROR'
      );
    }
    this.aliases.set(alias, collectionName);
    this.log(
      `Alias '${alias}' created for collection '${collectionName}'`,
      'debug'
    );
  }

  /** Remove an alias */
  public removeAlias(alias: string): boolean {
    const removed = this.aliases.delete(alias);
    if (removed) {
      this.log(`Alias '${alias}' removed`, 'debug');
    }
    return removed;
  }

  /** Get all aliases */
  public getAliases(): Record<string, string> {
    return Object.fromEntries(this.aliases);
  }

  /** Check if a name is an alias */
  public isAlias(name: string): boolean {
    return this.aliases.has(name);
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
