import { DatabaseOptions, Schema, CollectionOptions } from './types';
import { Collection } from './Collection';
import { FileStorage } from '../storage/FileStorage';
import { EncryptionManager } from '../encryption/EncryptionManager';
import { DatabaseError } from '../errors/DatabaseError';

class NuboDB {
  private static instance: NuboDB | null = null;
  private options: DatabaseOptions;
  private storage: FileStorage;
  private encryptionManager?: EncryptionManager;
  private collections: Map<string, Collection> = new Map();
  private isOpen: boolean = false;

  private constructor(options: DatabaseOptions) {
    this.options = {
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
      ...options,
      path: options.path || './nubodb',
    };

    this.storage = new FileStorage(this.options.path);

    if (this.options.encrypt && this.options.encryptionKey) {
      this.encryptionManager = new EncryptionManager(
        this.options.encryptionKey,
        this.options.encryptionMethod
      );
    }
  }

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

  public async open(): Promise<void> {
    if (this.isOpen) {
      return;
    }

    try {
      await this.storage.ensureDirectory('');
      this.isOpen = true;
    } catch (error) {
      throw new DatabaseError(
        `Failed to open database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'OPEN_ERROR'
      );
    }
  }

  public async close(): Promise<void> {
    if (!this.isOpen) {
      return;
    }

    this.collections.clear();
    this.isOpen = false;
  }

  public collection(name: string, options?: CollectionOptions): Collection {
    if (!this.isOpen) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    if (!this.collections.has(name)) {
      const collectionOptions: CollectionOptions = {};

      if (this.options.encrypt) {
        collectionOptions.encrypt = true;
      }

      if (options) {
        Object.assign(collectionOptions, options);
      }

      const collection = new Collection(name, this.storage, collectionOptions);
      this.collections.set(name, collection);
    }

    return this.collections.get(name)!;
  }

  public async createCollection(
    name: string,
    schema?: Schema,
    options?: CollectionOptions
  ): Promise<Collection> {
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

    const collectionOptions: CollectionOptions = {};

    if (this.options.encrypt) {
      collectionOptions.encrypt = true;
    }

    if (schema) {
      collectionOptions.schema = schema;
    }

    if (options) {
      Object.assign(collectionOptions, options);
    }

    const collection = new Collection(name, this.storage, collectionOptions);
    this.collections.set(name, collection);

    return collection;
  }

  public async dropCollection(name: string): Promise<boolean> {
    if (!this.isOpen) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    const collection = this.collections.get(name);
    if (!collection) {
      return false;
    }

    const result = await collection.delete({});

    this.collections.delete(name);

    return result.success;
  }

  public async listCollections(): Promise<string[]> {
    if (!this.isOpen) {
      throw new DatabaseError(
        'Database is not open. Call open() first.',
        'NOT_OPEN_ERROR'
      );
    }

    return Array.from(this.collections.keys());
  }

  public getOptions(): DatabaseOptions {
    return { ...this.options };
  }

  public isDatabaseOpen(): boolean {
    return this.isOpen;
  }
}

export default NuboDB;
