import { Schema, Document, CollectionOptions } from './types';
import { FileStorage } from '../storage/FileStorage';
import { EncryptionManager } from '../encryption/EncryptionManager';
import { CollectionError } from '../errors/DatabaseError';

export type DocumentWithMetadata = Document & {
  _id: string;
  _createdAt: Date;
  _updatedAt: Date;
  _version?: number;
};

export abstract class BaseCollection<T = Document> {
  protected name: string;
  protected storage: FileStorage;
  protected encryptionManager?: EncryptionManager;
  protected schema?: Schema;
  protected options: CollectionOptions;
  protected cache: Map<string, T> = new Map();
  protected indexes: Map<string, Map<any, string[]>> = new Map();
  protected isInitialized: boolean = false;

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

  protected async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  protected async getAllDocuments(): Promise<T[]> {
    await this.ensureInitialized();

    try {
      const documents = await this.storage.readAllDocuments(this.name);
      const decryptedDocuments: T[] = [];

      for (const document of documents) {
        let decryptedDocument = document;
        if (this.encryptionManager && document.data) {
          decryptedDocument = this.encryptionManager.decryptObject(
            document.data
          );
        }
        decryptedDocuments.push(decryptedDocument as T);
      }

      return decryptedDocuments;
    } catch (error) {
      throw new CollectionError(
        `Failed to get documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

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

  clearCache(): void {
    this.cache.clear();
  }

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
