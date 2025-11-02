import type {
  Document,
  InsertResult,
  InsertManyResult,
  UpdateResult,
  DeleteResult,
  IndexDefinition,
  QueryFilter,
} from './types';
import type { DocumentWithMetadata } from './BaseCollection';
import { BaseCollection } from './BaseCollection';
import { DocumentError } from '../errors/DatabaseError';
import { QueryOperations } from './QueryOperations';
import { CollectionOptions } from './types';
import {
  DocumentProcessor,
  DocumentValidator,
  DocumentEncryption,
  IndexManager,
} from './document';

/** @typeParam T Document type for this collection */
export class DocumentOperations<T = Document> extends BaseCollection<T> {
  private queryOps: QueryOperations<T>;
  private processor: DocumentProcessor<T>;
  private validator: DocumentValidator<T>;
  private encryption: DocumentEncryption<T>;

  /** @param name Collection name
   * @param storage Storage engine instance
   * @param options Collection configuration */
  constructor(
    name: string,
    storage: import('../storage/FileStorage').FileStorage,
    options: CollectionOptions = {}
  ) {
    super(name, storage, options);
    this.queryOps = new QueryOperations<T>(name, storage, options);
    this.processor = new DocumentProcessor<T>();
    this.validator = new DocumentValidator<T>(this.schema);
    this.encryption = new DocumentEncryption<T>(this.encryptionManager);
  }

  /** @param data Document data to insert
   * @returns Insert result with generated ID and document */
  async insert(data: Partial<T>): Promise<InsertResult> {
    await this.ensureInitialized();

    try {
      const processedData = this.validator.validateAndProcess(data);
      const document = this.processor.createDocument(processedData);
      const documentToStore = this.encryption.encrypt(document);

      await this.storage.writeDocument(this.name, documentToStore);

      this.cache.set(document._id, document as T);

      if (this.options.autoIndex) {
        await this.updateIndexes(document, 'insert');
      }

      return {
        id: document._id,
        success: true,
        document: document as Document,
        insertedCount: 1,
      };
    } catch (error) {
      throw new DocumentError(
        `Insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** @param documents Array of documents to insert
   * @returns Bulk insert result with IDs and count */
  async insertMany(documents: Partial<T>[]): Promise<InsertManyResult> {
    await this.ensureInitialized();

    if (documents.length === 0) {
      return { insertedIds: [], insertedCount: 0, success: true };
    }

    try {
      const processedDocuments: (T & DocumentWithMetadata)[] = [];

      const batchSize = 100;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);

        for (const data of batch) {
          const processedData = this.validator.validateAndProcess(data);
          const document = this.processor.createDocument(processedData);
          processedDocuments.push(document);
        }
      }

      const writePromises = processedDocuments.map(async document => {
        const documentToStore = this.encryption.encrypt(document);
        return this.storage.writeDocument(this.name, documentToStore);
      });

      await Promise.all(writePromises);

      const indexUpdates: Promise<void>[] = [];
      processedDocuments.forEach(document => {
        if (this.cache.size < (this.options.maxCacheSize || 1000)) {
          this.cache.set(document._id, document as T);
        }

        if (this.options.autoIndex) {
          indexUpdates.push(this.updateIndexes(document, 'insert'));
        }
      });

      if (indexUpdates.length > 0) {
        await Promise.all(indexUpdates);
      }

      const insertedIds = processedDocuments.map(doc => doc._id);

      return {
        insertedIds,
        insertedCount: documents.length,
        success: true,
      };
    } catch (error) {
      throw new DocumentError(
        `InsertMany failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** @param filter Query filter to match documents
   * @param updateData Fields to update in matching documents
   * @returns Update result with modified count */
  async update(
    filter: QueryFilter,
    updateData: Partial<T>
  ): Promise<UpdateResult> {
    await this.ensureInitialized();

    try {
      const documents = await this.queryOps.find(filter);

      if (documents.documents.length === 0) {
        return { modifiedCount: 0, success: true };
      }

      let modifiedCount = 0;
      const updatePromises: Promise<void>[] = [];
      const indexUpdatePromises: Promise<void>[] = [];

      for (const document of documents.documents) {
        const docWithMetadata = document as T & DocumentWithMetadata;
        const updatedDocument = this.processor.updateDocument(
          docWithMetadata,
          updateData
        );
        const documentToStore = this.encryption.encrypt(updatedDocument);

        updatePromises.push(
          this.storage.writeDocument(this.name, documentToStore)
        );

        this.cache.set(updatedDocument._id, updatedDocument as T);

        if (this.options.autoIndex) {
          indexUpdatePromises.push(
            this.updateIndexes(updatedDocument, 'update')
          );
        }

        modifiedCount++;
      }

      await Promise.all(updatePromises);

      if (indexUpdatePromises.length > 0) {
        await Promise.all(indexUpdatePromises);
      }

      return {
        modifiedCount,
        success: true,
      };
    } catch (error) {
      throw new DocumentError(
        `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** @param filter Query filter to match documents
   * @param updateData Data to update or insert
   * @returns Update result with upsert information */
  async upsert(
    filter: QueryFilter,
    updateData: Partial<T>
  ): Promise<UpdateResult> {
    const existing = await this.queryOps.findOne(filter);

    if (existing) {
      return this.update(filter, updateData);
    } else {
      const result = await this.insert(updateData);
      return {
        modifiedCount: 0,
        success: true,
        upsertedId: result.id,
        upsertedCount: 1,
      };
    }
  }

  /** @param filter Query filter to match documents for deletion
   * @returns Delete result with deleted count */
  async delete(filter: QueryFilter): Promise<DeleteResult> {
    await this.ensureInitialized();

    try {
      const documents = await this.queryOps.find(filter);
      let deletedCount = 0;

      for (const document of documents.documents) {
        const docWithMetadata = document as T & DocumentWithMetadata;
        const deleted = await this.storage.deleteDocument(
          this.name,
          docWithMetadata._id
        );

        if (deleted) {
          this.cache.delete(docWithMetadata._id);

          if (this.options.autoIndex) {
            await this.updateIndexes(docWithMetadata, 'delete');
          }

          deletedCount++;
        }
      }

      return {
        deletedCount,
        success: true,
      };
    } catch (error) {
      throw new DocumentError(
        `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** @param filter Query filter to match document for deletion
   * @returns Delete result with deleted count (0 or 1) */
  async deleteOne(filter: QueryFilter): Promise<DeleteResult> {
    const document = await this.queryOps.findOne(filter);
    if (!document) {
      return { deletedCount: 0, success: true };
    }

    const docWithMetadata = document as T & DocumentWithMetadata;
    return this.delete({ _id: docWithMetadata._id });
  }

  /** @param definition Index definition with fields and options */
  async createIndex(definition: IndexDefinition): Promise<void> {
    await this.ensureInitialized();

    const indexName =
      definition.name || Object.keys(definition.fields).join('_');

    const documents = await this.getAllDocuments();
    this.indexManager.createIndex(documents, definition.fields, indexName);

    if (this.queryOps && (this.queryOps as any).rebuildIndexResolver) {
      await (this.queryOps as any).rebuildIndexResolver();
    }
  }
}
