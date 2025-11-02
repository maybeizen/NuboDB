import type { CollectionOptions, Schema, Document } from '../types';
import type { Collection } from '../Collection';
import type { FileStorage } from '../../storage/FileStorage';
import { DatabaseError } from '../../errors/DatabaseError';
import { Collection as CollectionClass } from '../Collection';

/** Manages collection lifecycle and operations */
export class CollectionManager {
  constructor(
    private collections: Map<string, Collection>,
    private storage: FileStorage,
    private options: { encrypt?: boolean },
    private emit: (event: string, data: any) => void,
    private log: (message: string, level: string) => void
  ) {}

  /** Get or create a collection
   * @param name Collection name
   * @param options Collection options
   * @returns Collection instance */
  getCollection<T = Document>(
    name: string,
    options?: CollectionOptions
  ): Collection<T> {
    if (!this.collections.has(name)) {
      const collectionOptions: CollectionOptions = {
        autoIndex: true,
        maxDocuments: 1000000,
        ...options,
      };

      if (this.options.encrypt) {
        collectionOptions.encrypt = true;
      }

      const collection = new CollectionClass<T>(name, this.storage, collectionOptions);
      this.collections.set(name, collection as Collection);

      this.log(`Collection '${name}' accessed`, 'debug');
      this.emit('collection:accessed', name);
    }

    return this.collections.get(name)! as Collection<T>;
  }

  /** Create a new collection
   * @param name Collection name
   * @param schema Optional schema
   * @param options Collection options
   * @returns Collection instance */
  async createCollection<T = Document>(
    name: string,
    schema?: Schema,
    options?: CollectionOptions
  ): Promise<Collection<T>> {
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

    const collection = new CollectionClass<T>(name, this.storage, collectionOptions);
    this.collections.set(name, collection as Collection);

    this.log(`Collection '${name}' created`, 'info');
    this.emit('collection:created', name);

    return collection;
  }

  /** Drop a collection
   * @param name Collection name
   * @returns Success status */
  async dropCollection(name: string): Promise<boolean> {
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

  /** List all collections
   * @returns Array of collection names */
  listCollections(): string[] {
    return Array.from(this.collections.keys());
  }

  /** Check if collection exists
   * @param name Collection name
   * @returns True if exists */
  hasCollection(name: string): boolean {
    return this.collections.has(name);
  }

  /** Clear all collection caches */
  clearAllCaches(): void {
    for (const collection of this.collections.values()) {
      collection.clearCache();
    }
    this.log('All caches cleared', 'info');
  }

  /** Close all collections */
  closeAll(): void {
    for (const collection of this.collections.values()) {
      collection.clearCache();
    }
    this.collections.clear();
  }
}

