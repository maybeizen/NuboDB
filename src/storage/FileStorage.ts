import { promises as fs } from 'fs';
import { join } from 'path';
import type { Document, DocumentMetadata } from '../core/types';
import { StorageError } from '../errors/DatabaseError';

/** Collection-aware file storage engine */
export class FileStorage {
  private basePath: string;
  private ensuredDirs: Set<string> = new Set();
  private readonly MAX_CONCURRENT_FILES = 100;

  /** @param basePath Root directory where all collections will be stored */
  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /** Ensure a directory exists */
  async ensureDirectory(path: string): Promise<void> {
    if (this.ensuredDirs.has(path)) return;

    try {
      await fs.access(path);
    } catch {
      await fs.mkdir(path, { recursive: true });
    }

    this.ensuredDirs.add(path);
  }

  /** @param collectionPath Collection folder relative to basePath
   * @param document Document with metadata to write */
  async writeDocument(
    collectionPath: string,
    document: Document
  ): Promise<void> {
    const fullPath = join(this.basePath, collectionPath);
    const documentPath = join(fullPath, `${document._id}.json`);

    await this.ensureDirectory(fullPath);

    try {
      await fs.writeFile(documentPath, JSON.stringify(document), 'utf8');
    } catch (error) {
      throw new StorageError(
        `Failed to write document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** @returns The document or null if the file doesn't exist */
  async readDocument(
    collectionPath: string,
    documentId: string
  ): Promise<Document | null> {
    const documentPath = join(
      this.basePath,
      collectionPath,
      `${documentId}.json`
    );

    try {
      const data = await fs.readFile(documentPath, 'utf8');
      const document = JSON.parse(data);

      document._createdAt = new Date(document._createdAt);
      document._updatedAt = new Date(document._updatedAt);

      return document;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new StorageError(
        `Failed to read document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** @returns An array of documents */
  async readAllDocuments(collectionPath: string): Promise<Document[]> {
    const fullPath = join(this.basePath, collectionPath);

    try {
      await this.ensureDirectory(fullPath);
      const files = await fs.readdir(fullPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      const documents: Document[] = [];

      for (let i = 0; i < jsonFiles.length; i += this.MAX_CONCURRENT_FILES) {
        const batch = jsonFiles.slice(i, i + this.MAX_CONCURRENT_FILES);

        const batchResults = await Promise.all(
          batch.map(async file => {
            const documentId = file.replace('.json', '');
            return this.readDocument(collectionPath, documentId);
          })
        );

        documents.push(...(batchResults.filter(Boolean) as Document[]));
      }

      return documents;
    } catch (error) {
      throw new StorageError(
        `Failed to read documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** @returns true if the document was deleted, false if it didn't exist */
  async deleteDocument(
    collectionPath: string,
    documentId: string
  ): Promise<boolean> {
    const documentPath = join(
      this.basePath,
      collectionPath,
      `${documentId}.json`
    );

    try {
      await fs.unlink(documentPath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw new StorageError(
        `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** @returns true if the document exists, false if it doesn't */
  async documentExists(
    collectionPath: string,
    documentId: string
  ): Promise<boolean> {
    const documentPath = join(
      this.basePath,
      collectionPath,
      `${documentId}.json`
    );

    try {
      await fs.access(documentPath);
      return true;
    } catch {
      return false;
    }
  }

  /** Lightweight metadata fetch */
  async getDocumentMetadata(
    collectionPath: string,
    documentId: string
  ): Promise<DocumentMetadata | null> {
    const document = await this.readDocument(collectionPath, documentId);
    if (!document) return null;

    return {
      id: document._id,
      createdAt: document._createdAt,
      updatedAt: document._updatedAt,
      size: JSON.stringify(document).length,
    };
  }
}
