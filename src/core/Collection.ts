import {
  Schema,
  Document,
  QueryFilter,
  QueryOptions,
  CollectionOptions,
  InsertResult,
  UpdateResult,
  DeleteResult,
  FindResult,
} from './types';
import { FileStorage } from '../storage/FileStorage';
import { EncryptionManager } from '../encryption/EncryptionManager';
import {
  validateSchema,
  applyDefaults,
  sanitizeDocument,
} from '../utils/schema';
import { createDocumentMetadata, generateTimestamp } from '../utils/id';
import { CollectionError, DocumentError } from '../errors/DatabaseError';

export class Collection {
  private name: string;
  private storage: FileStorage;
  private encryptionManager?: EncryptionManager;
  private schema?: Schema;
  private options: CollectionOptions;

  constructor(
    name: string,
    storage: FileStorage,
    options: CollectionOptions = {}
  ) {
    this.name = name;
    this.storage = storage;
    this.options = options;

    if (options.schema) {
      this.schema = options.schema;
    }

    if (options.encrypt) {
      this.encryptionManager = new EncryptionManager('default-encryption-key');
    }
  }

  async insert(data: any): Promise<InsertResult> {
    try {
      if (this.schema) {
        validateSchema(data, this.schema);
        data = applyDefaults(data, this.schema);
      }

      const metadata = createDocumentMetadata();
      const document: Document = {
        _id: metadata.id,
        _createdAt: metadata.createdAt,
        _updatedAt: metadata.updatedAt,
        ...sanitizeDocument(data),
      };

      if (this.encryptionManager) {
        const encryptedData = this.encryptionManager.encryptObject(document);
        const encryptedDocument: Document = {
          _id: document._id,
          _createdAt: document._createdAt,
          _updatedAt: document._updatedAt,
          data: encryptedData,
        };
        await this.storage.writeDocument(this.name, encryptedDocument);
      } else {
        await this.storage.writeDocument(this.name, document);
      }

      return {
        id: document._id,
        success: true,
        document,
      };
    } catch (error) {
      throw new DocumentError(
        `Insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async find(
    filter: QueryFilter = {},
    options: QueryOptions = {}
  ): Promise<FindResult> {
    try {
      const allDocuments = await this.getAllDocuments();
      let filteredDocuments = this.filterDocuments(allDocuments, filter);

      if (options.sort) {
        filteredDocuments = this.sortDocuments(filteredDocuments, options.sort);
      }

      if (options.projection) {
        filteredDocuments = this.projectDocuments(
          filteredDocuments,
          options.projection
        );
      }

      const total = filteredDocuments.length;

      if (options.skip) {
        filteredDocuments = filteredDocuments.slice(options.skip);
      }

      if (options.limit) {
        filteredDocuments = filteredDocuments.slice(0, options.limit);
      }

      return {
        documents: filteredDocuments,
        total,
        hasMore: total > (options.skip || 0) + filteredDocuments.length,
      };
    } catch (error) {
      throw new CollectionError(
        `Find failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findOne(filter: QueryFilter = {}): Promise<Document | null> {
    const result = await this.find(filter, { limit: 1 });
    return result.documents[0] || null;
  }

  async update(filter: QueryFilter, updateData: any): Promise<UpdateResult> {
    try {
      const documents = await this.find(filter);
      let modifiedCount = 0;

      for (const document of documents.documents) {
        if (this.schema) {
          const updatedData = { ...document, ...updateData };
          validateSchema(updatedData, this.schema);
        }

        const updatedDocument: Document = {
          ...document,
          ...updateData,
          _updatedAt: generateTimestamp(),
        };

        if (this.encryptionManager) {
          const encryptedData =
            this.encryptionManager.encryptObject(updatedDocument);
          const encryptedDocument: Document = {
            _id: updatedDocument._id,
            _createdAt: updatedDocument._createdAt,
            _updatedAt: updatedDocument._updatedAt,
            data: encryptedData,
          };
          await this.storage.writeDocument(this.name, encryptedDocument);
        } else {
          await this.storage.writeDocument(this.name, updatedDocument);
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

  async delete(filter: QueryFilter): Promise<DeleteResult> {
    try {
      const documents = await this.find(filter);
      let deletedCount = 0;

      for (const document of documents.documents) {
        const deleted = await this.storage.deleteDocument(
          this.name,
          document._id
        );
        if (deleted) {
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

  async deleteOne(filter: QueryFilter): Promise<DeleteResult> {
    const document = await this.findOne(filter);
    if (!document) {
      return { deletedCount: 0, success: true };
    }

    const deleted = await this.storage.deleteDocument(this.name, document._id);
    return {
      deletedCount: deleted ? 1 : 0,
      success: true,
    };
  }

  private async getAllDocuments(): Promise<Document[]> {
    const documents = await this.storage.readAllDocuments(this.name);

    if (this.encryptionManager) {
      return documents.map(doc => {
        if (doc.data) {
          return this.encryptionManager!.decryptObject(doc.data);
        }
        return doc;
      });
    }

    return documents;
  }

  private filterDocuments(
    documents: Document[],
    filter: QueryFilter
  ): Document[] {
    return documents.filter(document => {
      for (const [key, value] of Object.entries(filter)) {
        if (document[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  private sortDocuments(
    documents: Document[],
    sort: { [field: string]: 1 | -1 }
  ): Document[] {
    return documents.sort((a, b) => {
      for (const [field, direction] of Object.entries(sort)) {
        const aVal = a[field];
        const bVal = b[field];

        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
      }
      return 0;
    });
  }

  private projectDocuments(
    documents: Document[],
    projection: { [field: string]: 0 | 1 }
  ): Document[] {
    return documents.map(document => {
      const projected: any = {};

      for (const [field, include] of Object.entries(projection)) {
        if (include === 1 && document.hasOwnProperty(field)) {
          projected[field] = document[field];
        }
      }

      projected._id = document._id;
      projected._createdAt = document._createdAt;
      projected._updatedAt = document._updatedAt;

      return projected;
    });
  }
}
