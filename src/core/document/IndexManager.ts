import type { Document } from '../types';
import type { DocumentWithMetadata } from '../BaseCollection';
import type { Schema } from '../types';

/** Index metadata for tracking field coverage */
export interface IndexFieldMetadata {
  fields: string[];
  indexName: string;
}

/** Manages index operations for collections */
export class IndexManager<T = Document> {
  public fieldMetadata: Map<string, IndexFieldMetadata> = new Map();

  constructor(
    private indexes: Map<string, Map<any, string[]>>,
    private schema?: Schema
  ) {}

  /** Build indexes from documents
   * @param documents Documents to index */
  buildIndexes(documents: T[]): void {
    if (!this.schema) return;

    for (const [fieldName, fieldDef] of Object.entries(this.schema)) {
      if (fieldDef.index) {
        const indexMap = new Map<any, string[]>();

        for (let i = 0; i < documents.length; i++) {
          const document = documents[i];
          const docWithMetadata = document as T & DocumentWithMetadata;
          const value = (document as any)[fieldName];
          let ids = indexMap.get(value);
          if (!ids) {
            ids = [];
            indexMap.set(value, ids);
          }
          ids.push(docWithMetadata._id);
        }

        this.indexes.set(fieldName, indexMap);
        this.fieldMetadata.set(fieldName, {
          fields: [fieldName],
          indexName: fieldName,
        });
      }
    }
  }

  /** Update indexes when a document is modified
   * @param document Document being modified
   * @param operation Type of operation (insert/update/delete) */
  updateIndexes(
    document: T & DocumentWithMetadata,
    operation: 'insert' | 'update' | 'delete'
  ): void {
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

  /** Extract index key from document
   * @param document Document to extract key from
   * @param fields Fields to include in index key
   * @returns Index key value */
  extractIndexKey(
    document: T & DocumentWithMetadata,
    fields: { [field: string]: 1 | -1 }
  ): unknown | unknown[] {
    const keys = Object.keys(fields);
    if (keys.length === 1) {
      const key = keys[0];
      if (key) {
        return (document as Record<string, unknown>)[key];
      }
    }
    return keys.map(key => (document as Record<string, unknown>)[key]);
  }

  /** Create an index from documents
   * @param documents Documents to index
   * @param fields Fields to index
   * @param indexName Name of the index
   * @returns Index map */
  createIndex(
    documents: T[],
    fields: { [field: string]: 1 | -1 },
    indexName: string
  ): Map<unknown, string[]> {
    const indexMap = new Map<unknown, string[]>();
    const fieldNames = Object.keys(fields);

    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      const docWithMetadata = document as T & DocumentWithMetadata;
      const key = this.extractIndexKey(docWithMetadata, fields);
      let ids = indexMap.get(key);
      if (!ids) {
        ids = [];
        indexMap.set(key, ids);
      }
      ids.push(docWithMetadata._id);
    }

    this.indexes.set(indexName, indexMap);

    const metadata: IndexFieldMetadata = {
      fields: fieldNames,
      indexName,
    };
    this.fieldMetadata.set(indexName, metadata);

    for (let i = 0; i < fieldNames.length; i++) {
      const fieldName = fieldNames[i];
      if (fieldName && !this.fieldMetadata.has(fieldName)) {
        this.fieldMetadata.set(fieldName, metadata);
      }
    }

    return indexMap;
  }
}

