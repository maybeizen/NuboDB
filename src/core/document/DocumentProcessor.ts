import type { Document } from '../types';
import type { DocumentWithMetadata } from '../BaseCollection';
import { createDocumentMetadata, generateTimestamp } from '../../utils/id';
import { sanitizeDocument } from '../../utils/schema';

/** Processes document data for insertion/updates */
export class DocumentProcessor<T = Document> {
  /** Create a document with metadata from raw data
   * @param data Raw document data
   * @returns Document with metadata */
  createDocument(data: Partial<T>): T & DocumentWithMetadata {
    const metadata = createDocumentMetadata();
    return {
      _id: metadata.id,
      _createdAt: metadata.createdAt,
      _updatedAt: metadata.updatedAt,
      _version: 1,
      ...sanitizeDocument(data),
    } as T & DocumentWithMetadata;
  }

  /** Update document with new data and increment version
   * @param document Existing document
   * @param updateData Data to update
   * @returns Updated document */
  updateDocument(
    document: T & DocumentWithMetadata,
    updateData: Partial<T>
  ): T & DocumentWithMetadata {
    return {
      ...document,
      ...updateData,
      _updatedAt: generateTimestamp(),
      _version: (document._version || 1) + 1,
    } as T & DocumentWithMetadata;
  }

  /** Process multiple documents for batch operations
   * @param documents Array of raw document data
   * @returns Processed documents with metadata */
  processMany(documents: Partial<T>[]): (T & DocumentWithMetadata)[] {
    return documents.map(data => this.createDocument(data));
  }
}
