import type { Schema, Document, CollectionOptions } from './types';
import type { FileStorage } from '../storage/FileStorage';
import { EncryptionManager } from '../encryption/EncryptionManager';
import { CollectionError } from '../errors/DatabaseError';

/**
 * Document with system metadata
 */
export type DocumentWithMetadata = Document & {
  _id: string;
  _createdAt: Date;
  _updatedAt: Date;
  _version?: number;
};

/**
 * @typeParam T - Document type for this collection
 */
export abstract class BaseCollection<T = Document> {
  protected name: string;
  protected storage: FileStorage;
  protected encryptionManager?: EncryptionManager;
  protected schema?: Schema;
  protected options: CollectionOptions;
  protected cache: Map<string, T> = new Map();
  protected indexes: Map<string, Map<any, string[]>> = new Map();
  protected isInitialized: boolean = false;
  protected documentCount: number = 0;

  /**
   * @param name - Collection name
   * @param storage - Storage engine instance
   * @param options - Collection configuration
   */
  constructor(
    name: string,
    storage: FileStorage,
    options: CollectionOptions = {}
  ) {
    this.name = name;
    this.storage = storage;
    this.options = {
      autoIndex: true,
      maxDocuments: 1000000,
      ...options,
    };

    if (options.schema) {
      this.schema = options.schema;
    }

    if (options.encrypt) {
      this.encryptionManager = new EncryptionManager('default-encryption-key');
    }
  }

  /**
   * Load documents from storage, build indexes, and populate cache
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const documents = await this.storage.readAllDocuments(this.name);

      if (this.options.autoIndex && this.schema) {
        await this.buildIndexes(documents as T[]);
      }

      if (this.options.maxCacheSize && this.options.maxCacheSize > 0) {
        const recentDocs = documents
          .sort((a, b) => b._updatedAt.getTime() - a._updatedAt.getTime())
          .slice(0, this.options.maxCacheSize);

        recentDocs.forEach(doc => {
          this.cache.set(doc._id, doc as T);
        });
      }

      this.isInitialized = true;
    } catch (error) {
      throw new CollectionError(
        `Failed to initialize collection: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** Ensure collection is initialized */
  protected async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /** Get all documents from storage with decryption */
  protected async getAllDocuments(): Promise<T[]> {
    await this.ensureInitialized();

    if (this.cache.size > 0 && this.cache.size === this.documentCount) {
      return Array.from(this.cache.values());
    }

    try {
      const documents = await this.storage.readAllDocuments(this.name);
      const decryptedDocuments: T[] = [];

      const batchSize = 1000;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);

        for (const document of batch) {
          let decryptedDocument = document;
          if (this.encryptionManager && document.data) {
            decryptedDocument = this.encryptionManager.decryptObject(
              document.data
            );
          }
          decryptedDocuments.push(decryptedDocument as T);

          this.cache.set(document._id, decryptedDocument as T);
        }
      }

      this.documentCount = documents.length;
      return decryptedDocuments;
    } catch (error) {
      throw new CollectionError(
        `Failed to get documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * @param documents - Documents to index
   */
  protected async buildIndexes(documents: T[]): Promise<void> {
    if (!this.schema) return;

    for (const [fieldName, fieldDef] of Object.entries(this.schema)) {
      if (fieldDef.index) {
        const indexMap = new Map<any, string[]>();

        for (const document of documents) {
          const docWithMetadata = document as T & DocumentWithMetadata;
          const value = (document as any)[fieldName];
          if (!indexMap.has(value)) {
            indexMap.set(value, []);
          }
          indexMap.get(value)!.push(docWithMetadata._id);
        }

        this.indexes.set(fieldName, indexMap);
      }
    }
  }

  /**
   * @param document - Document being modified
   * @param operation - Type of operation (insert/update/delete)
   */
  protected async updateIndexes(
    document: T & DocumentWithMetadata,
    operation: 'insert' | 'update' | 'delete'
  ): Promise<void> {
    if (!this.schema) return;

    for (const [fieldName, fieldDef] of Object.entries(this.schema)) {
      if (fieldDef.index && this.indexes.has(fieldName)) {
        const index = this.indexes.get(fieldName)!;
        const value = (document as any)[fieldName];

        if (operation === 'delete') {
          const documentIds = index.get(value) || [];
          const updatedIds = documentIds.filter(id => id !== document._id);
          if (updatedIds.length === 0) {
            index.delete(value);
          } else {
            index.set(value, updatedIds);
          }
        } else {
          if (!index.has(value)) {
            index.set(value, []);
          }
          const documentIds = index.get(value)!;
          if (!documentIds.includes(document._id)) {
            documentIds.push(document._id);
          }
        }
      }
    }
  }

  /**
   * @param document - Document to extract key from
   * @param fields - Fields to include in index key
   */
  protected extractIndexKey(
    document: T & DocumentWithMetadata,
    fields: { [field: string]: 1 | -1 }
  ): any {
    const keys = Object.keys(fields);
    if (keys.length === 1) {
      const key = keys[0];
      if (key) {
        return (document as any)[key];
      }
    }
    return keys.map(key => (document as any)[key]);
  }

  /** Clear the document cache to free memory */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * @returns Object with document count, size, index count, and cache size
   */
  async stats(): Promise<{
    totalDocuments: number;
    totalSize: number;
    indexes: number;
    cacheSize: number;
  }> {
    await this.ensureInitialized();

    const documents = await this.getAllDocuments();
    const totalSize = documents.reduce(
      (sum, doc) => sum + JSON.stringify(doc).length,
      0
    );

    return {
      totalDocuments: documents.length,
      totalSize,
      indexes: this.indexes.size,
      cacheSize: this.cache.size,
    };
  }
}
