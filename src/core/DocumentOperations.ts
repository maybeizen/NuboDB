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
import {
  validateSchema,
  applyDefaults,
  sanitizeDocument,
} from '../utils/schema';
import { createDocumentMetadata, generateTimestamp } from '../utils/id';
import { DocumentError } from '../errors/DatabaseError';
import { QueryOperations } from './QueryOperations';

/**
 * @typeParam T - Document type for this collection
 */
export class DocumentOperations<T = Document> extends BaseCollection<T> {
  private queryOps: QueryOperations<T>;

  /**
   * @param name - Collection name
   * @param storage - Storage engine instance
   * @param options - Collection configuration
   */
  constructor(name: string, storage: any, options: any = {}) {
    super(name, storage, options);
    this.queryOps = new QueryOperations<T>(name, storage, options);
  }

  /**
   * @param data - Document data to insert
   * @returns Insert result with generated ID and document
   */
  async insert(data: Partial<T>): Promise<InsertResult> {
    await this.ensureInitialized();

    try {
      let processedData = { ...data };

      if (this.schema) {
        validateSchema(processedData, this.schema);
        processedData = applyDefaults(processedData, this.schema);
      }

      const metadata = createDocumentMetadata();
      const document = {
        _id: metadata.id,
        _createdAt: metadata.createdAt,
        _updatedAt: metadata.updatedAt,
        _version: 1,
        ...sanitizeDocument(processedData),
      } as T & DocumentWithMetadata;

      let documentToStore = document;
      if (this.encryptionManager) {
        const encryptedData = this.encryptionManager.encryptObject(document);
        documentToStore = {
          _id: document._id,
          _createdAt: document._createdAt,
          _updatedAt: document._updatedAt,
          _version: document._version!,
          data: encryptedData,
        } as unknown as T & DocumentWithMetadata;
      }

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

  /**
   * @param documents - Array of documents to insert
   * @returns Bulk insert result with IDs and count
   */
  async insertMany(documents: Partial<T>[]): Promise<InsertManyResult> {
    await this.ensureInitialized();

    try {
      const insertedIds: string[] = [];
      const processedDocuments: (T & DocumentWithMetadata)[] = [];

      for (const data of documents) {
        let processedData = { ...data };

        if (this.schema) {
          validateSchema(processedData, this.schema);
          processedData = applyDefaults(processedData, this.schema);
        }

        const metadata = createDocumentMetadata();
        const document = {
          _id: metadata.id,
          _createdAt: metadata.createdAt,
          _updatedAt: metadata.updatedAt,
          _version: 1,
          ...sanitizeDocument(processedData),
        } as T & DocumentWithMetadata;

        insertedIds.push(document._id);
        processedDocuments.push(document);
      }

      const writePromises = processedDocuments.map(async document => {
        let documentToStore = document;
        if (this.encryptionManager) {
          const encryptedData = this.encryptionManager.encryptObject(document);
          documentToStore = {
            _id: document._id,
            _createdAt: document._createdAt,
            _updatedAt: document._updatedAt,
            _version: document._version!,
            data: encryptedData,
          } as unknown as T & DocumentWithMetadata;
        }
        return this.storage.writeDocument(this.name, documentToStore);
      });

      await Promise.all(writePromises);

      processedDocuments.forEach(document => {
        this.cache.set(document._id, document as T);
        if (this.options.autoIndex) {
          this.updateIndexes(document, 'insert');
        }
      });

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

  /**
   * @param filter - Query filter to match documents
   * @param updateData - Fields to update in matching documents
   * @returns Update result with modified count
   */
  async update(
    filter: QueryFilter,
    updateData: Partial<T>
  ): Promise<UpdateResult> {
    await this.ensureInitialized();

    try {
      const documents = await this.queryOps.find(filter);
      let modifiedCount = 0;

      for (const document of documents.documents) {
        const docWithMetadata = document as T & DocumentWithMetadata;
        const updatedDocument = {
          ...docWithMetadata,
          ...updateData,
          _updatedAt: generateTimestamp(),
          _version: (docWithMetadata._version || 1) + 1,
        } as T & DocumentWithMetadata;

        let documentToStore = updatedDocument;
        if (this.encryptionManager) {
          const encryptedData =
            this.encryptionManager.encryptObject(updatedDocument);
          documentToStore = {
            _id: updatedDocument._id,
            _createdAt: updatedDocument._createdAt,
            _updatedAt: updatedDocument._updatedAt,
            _version: updatedDocument._version!,
            data: encryptedData,
          } as unknown as T & DocumentWithMetadata;
        }

        await this.storage.writeDocument(this.name, documentToStore);

        this.cache.set(updatedDocument._id, updatedDocument as T);

        if (this.options.autoIndex) {
          await this.updateIndexes(updatedDocument, 'update');
        }

        modifiedCount++;
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

  /**
   * @param filter - Query filter to match documents
   * @param updateData - Data to update or insert
   * @returns Update result with upsert information
   */
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

  /**
   * @param filter - Query filter to match documents for deletion
   * @returns Delete result with deleted count
   */
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

  /**
   * @param filter - Query filter to match document for deletion
   * @returns Delete result with deleted count (0 or 1)
   */
  async deleteOne(filter: QueryFilter): Promise<DeleteResult> {
    const document = await this.queryOps.findOne(filter);
    if (!document) {
      return { deletedCount: 0, success: true };
    }

    const docWithMetadata = document as T & DocumentWithMetadata;
    return this.delete({ _id: docWithMetadata._id });
  }

  /**
   * @param definition - Index definition with fields and options
   */
  async createIndex(definition: IndexDefinition): Promise<void> {
    await this.ensureInitialized();

    const indexName =
      definition.name || Object.keys(definition.fields).join('_');
    const indexMap = new Map<any, string[]>();

    const documents = await this.getAllDocuments();

    for (const document of documents) {
      const docWithMetadata = document as T & DocumentWithMetadata;
      const key = this.extractIndexKey(docWithMetadata, definition.fields);
      if (!indexMap.has(key)) {
        indexMap.set(key, []);
      }
      indexMap.get(key)!.push(docWithMetadata._id);
    }

    this.indexes.set(indexName, indexMap);
  }
}
