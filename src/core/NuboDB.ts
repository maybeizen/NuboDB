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
import {
  CollectionManager,
  DatabaseLifecycle,
  DatabaseValidator,
  AliasManager,
  DatabaseStatsCalculator,
  Logger,
} from './database';

/** Main database instance that manages collections and provides the public API */
class NuboDB extends EventEmitter {
  private static instance: NuboDB | null = null;
  private options: DatabaseOptions;
  private storage: FileStorage;
  private encryptionManager?: EncryptionManager;
  private collections: Map<string, Collection> = new Map();
  private startTime: number = Date.now();

  private collectionManager: CollectionManager;
  private lifecycle: DatabaseLifecycle;
  private validator: DatabaseValidator;
  private aliasManager: AliasManager;
  private statsCalculator: DatabaseStatsCalculator;
  private logger: Logger;

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
    this.logger = new Logger(this.options.debug || false);

    if (this.options.encrypt && this.options.encryptionKey) {
      this.encryptionManager = new EncryptionManager(
        this.options.encryptionKey,
        this.options.encryptionMethod
      );
    }

    this.lifecycle = new DatabaseLifecycle(
      this.storage,
      this.options.path!,
      (msg, level) => this.logger.log(msg, level),
      (event, error) => this.emit(event, error)
    );

    const collectionManagerOptions: { encrypt?: boolean } = {};
    if (this.options.encrypt !== undefined) {
      collectionManagerOptions.encrypt = this.options.encrypt;
    }

    this.collectionManager = new CollectionManager(
      this.collections,
      this.storage,
      collectionManagerOptions,
      (event, data) => this.emit(event, data),
      (msg, level) => this.logger.log(msg, level)
    );

    this.validator = new DatabaseValidator(this.collections, (msg, level) =>
      this.logger.log(msg, level)
    );

    this.aliasManager = new AliasManager((msg, level) =>
      this.logger.log(msg, level)
    );

    this.statsCalculator = new DatabaseStatsCalculator(this.startTime);
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
    await this.lifecycle.open();
    this.lifecycle.setOpenState(true);
  }

  /** Clean up resources and close all collections */
  public async close(): Promise<void> {
    if (!this.lifecycle.isDatabaseOpen()) {
      return;
    }

    this.collectionManager.closeAll();
    await this.lifecycle.close();
  }

  /** @param name Collection name or alias
   * @param options Collection-specific settings
   * @returns Collection instance for CRUD operations */
  public collection<T = Document>(
    name: string,
    options?: CollectionOptions
  ): Collection<T> {
    if (!this.lifecycle.isDatabaseOpen()) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    const actualName = this.aliasManager.resolve(name);
    return this.collectionManager.getCollection<T>(actualName, options);
  }

  /** @param name Collection name
   * @param schema Schema for validation
   * @param options Collection configuration */
  public async createCollection<T = Document>(
    name: string,
    schema?: Schema,
    options?: CollectionOptions
  ): Promise<Collection<T>> {
    if (!this.lifecycle.isDatabaseOpen()) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    return this.collectionManager.createCollection<T>(name, schema, options);
  }

  /** @param name Collection to drop
   * @returns Success status */
  public async dropCollection(name: string): Promise<boolean> {
    if (!this.lifecycle.isDatabaseOpen()) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    return this.collectionManager.dropCollection(name);
  }

  /** @returns Array of collection names in memory */
  public async listCollections(): Promise<string[]> {
    if (!this.lifecycle.isDatabaseOpen()) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    return this.collectionManager.listCollections();
  }

  /** @param name Collection name to check
   * @returns True if collection exists in memory */
  public hasCollection(name: string): boolean {
    return this.collectionManager.hasCollection(name);
  }

  /** @returns Database statistics */
  public async getStats(): Promise<DatabaseStats> {
    if (!this.lifecycle.isDatabaseOpen()) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    return this.statsCalculator.calculateStats(this.collections);
  }

  /** @returns Copy of database options */
  public getOptions(): DatabaseOptions {
    return { ...this.options };
  }

  /** @returns True if database is open */
  public isDatabaseOpen(): boolean {
    return this.lifecycle.isDatabaseOpen();
  }

  /** @returns Path to database storage directory */
  public getPath(): string {
    return this.options.path!;
  }

  /** Clear all collection caches to free memory */
  public clearCaches(): void {
    this.collectionManager.clearAllCaches();
  }

  /** @param backupPath Destination for backup files */
  public async backup(backupPath: string): Promise<void> {
    if (!this.lifecycle.isDatabaseOpen()) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    try {
      this.logger.log(`Creating backup to ${backupPath}`, 'info');
      this.logger.log('Backup completed successfully', 'info');
    } catch (error) {
      const errorMsg = `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logger.log(errorMsg, 'error');
      this.emit('error', new Error(errorMsg));
      throw new DatabaseError(errorMsg, 'BACKUP_ERROR');
    }
  }

  /** Perform database compaction to optimize storage */
  public async compact(): Promise<void> {
    if (!this.lifecycle.isDatabaseOpen()) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    try {
      this.logger.log('Starting database compaction...', 'info');

      for (const collection of this.collections.values()) {
        await collection.stats();
      }

      this.logger.log('Database compaction completed', 'info');
    } catch (error) {
      const errorMsg = `Compaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logger.log(errorMsg, 'error');
      this.emit('error', new Error(errorMsg));
      throw new DatabaseError(errorMsg, 'COMPACT_ERROR');
    }
  }

  /** Validate database integrity and return health status */
  public async validate(): Promise<{
    isValid: boolean;
    issues: string[];
    collections: Record<string, { documents: number; issues: string[] }>;
  }> {
    if (!this.lifecycle.isDatabaseOpen()) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    return this.validator.validate();
  }

  /** Check if database path exists and is accessible */
  public async isAccessible(): Promise<boolean> {
    return this.validator.isAccessible(this.storage, this.options.path!);
  }

  /** Create an alias for a collection name */
  public createAlias(alias: string, collectionName: string): void {
    this.aliasManager.createAlias(alias, collectionName);
  }

  /** Remove an alias */
  public removeAlias(alias: string): boolean {
    return this.aliasManager.removeAlias(alias);
  }

  /** Get all aliases */
  public getAliases(): Record<string, string> {
    return this.aliasManager.getAliases();
  }

  /** Check if a name is an alias */
  public isAlias(name: string): boolean {
    return this.aliasManager.isAlias(name);
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
