import type { Document } from '../types';
import type { DocumentWithMetadata } from '../BaseCollection';
import type { EncryptionManager } from '../../encryption/EncryptionManager';

/** Handles encryption/decryption of documents */
export class DocumentEncryption<T = Document> {
  constructor(private encryptionManager?: EncryptionManager) {}

  /** Encrypt a document if encryption is enabled
   * @param document Document to encrypt
   * @returns Encrypted document or original if encryption disabled */
  encrypt(document: T & DocumentWithMetadata): T & DocumentWithMetadata {
    if (!this.encryptionManager) {
      return document;
    }

    const encryptedData = this.encryptionManager.encryptObject(document);
    return {
      _id: document._id,
      _createdAt: document._createdAt,
      _updatedAt: document._updatedAt,
      _version: document._version!,
      data: encryptedData,
    } as unknown as T & DocumentWithMetadata;
  }

  /** Decrypt a document if encryption is enabled
   * @param document Document to decrypt
   * @returns Decrypted document or original if encryption disabled */
  decrypt(document: Document): T {
    if (!this.encryptionManager || !('data' in document)) {
      return document as T;
    }

    return this.encryptionManager.decryptObject(document.data as string) as T;
  }
}
