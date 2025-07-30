import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'crypto';
import { EncryptionError } from '../errors/DatabaseError';

/**
 * Handles encryption and decryption of data using AES-256-CBC
 * with SHA-256 key derivation (deterministic).
 */
export class EncryptionManager {
  private key: Buffer;
  private algorithm: string;
  private readonly IV_LENGTH = 16;
  private readonly HEX_ENCODING = 'hex' as const;
  private readonly UTF8_ENCODING = 'utf8' as const;

  /**
   * @param encryptionKey Password/key for encryption
   * @param algorithm Encryption algorithm (default: aes-256-cbc)
   */
  constructor(encryptionKey: string, algorithm: string = 'aes-256-cbc') {
    this.algorithm = algorithm;
    this.key = this.deriveKey(encryptionKey);
  }

  /**
   * Derives a consistent 32-byte key using SHA-256.
   * @param password The encryption key (or password)
   * @returns 32-byte key buffer
   */
  private deriveKey(password: string): Buffer {
    return createHash('sha256').update(password).digest();
  }

  /**
   * Encrypts a string of data.
   * @param data String to encrypt
   * @returns Encrypted data in "iv:encrypted" format
   */
  encrypt(data: string): string {
    try {
      const iv = randomBytes(this.IV_LENGTH);
      const cipher = createCipheriv(this.algorithm, this.key, iv);

      const encrypted1 = cipher.update(data, this.UTF8_ENCODING);
      const encrypted2 = cipher.final();
      const encryptedBuffer = Buffer.concat([encrypted1, encrypted2]);

      return (
        iv.toString(this.HEX_ENCODING) +
        ':' +
        encryptedBuffer.toString(this.HEX_ENCODING)
      );
    } catch (error) {
      throw new EncryptionError(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypts a string from "iv:encrypted" format.
   * @param encryptedData Encrypted data string
   * @returns Decrypted string
   */
  decrypt(encryptedData: string): string {
    try {
      const colonIndex = encryptedData.indexOf(':');
      if (colonIndex === -1) {
        throw new EncryptionError('Invalid encrypted data format');
      }

      const ivHex = encryptedData.slice(0, colonIndex);
      const encrypted = encryptedData.slice(colonIndex + 1);

      if (!ivHex || !encrypted) {
        throw new EncryptionError('Invalid encrypted data format');
      }

      const iv = Buffer.from(ivHex, this.HEX_ENCODING);
      const encryptedBuffer = Buffer.from(encrypted, this.HEX_ENCODING);
      const decipher = createDecipheriv(this.algorithm, this.key, iv);

      const decrypted1 = decipher.update(encryptedBuffer);
      const decrypted2 = decipher.final();
      const decryptedBuffer = Buffer.concat([decrypted1, decrypted2]);

      return decryptedBuffer.toString(this.UTF8_ENCODING);
    } catch (error) {
      throw new EncryptionError(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Encrypts a JS object (by JSON.stringify)
   * @param obj Object to encrypt
   * @returns Encrypted JSON string
   */
  encryptObject(obj: any): string {
    if (typeof obj === 'string') {
      return this.encrypt(obj);
    }
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  /**
   * Decrypts encrypted JSON string to an object
   * @param encryptedData Encrypted JSON string
   * @returns Decrypted object
   */
  decryptObject(encryptedData: string): any {
    const decryptedString = this.decrypt(encryptedData);
    try {
      return JSON.parse(decryptedString);
    } catch (error) {
      return decryptedString;
    }
  }

  /** @param objects Array of objects to encrypt
   * @returns Array of encrypted objects */
  encryptObjectsBatch(objects: any[]): string[] {
    if (objects.length === 0) return [];

    const results: string[] = [];
    for (const obj of objects) {
      results.push(this.encryptObject(obj));
    }
    return results;
  }

  /** @param encryptedObjects Array of encrypted objects
   * @returns Array of decrypted objects */
  decryptObjectsBatch(encryptedObjects: string[]): any[] {
    if (encryptedObjects.length === 0) return [];

    const results: any[] = [];
    for (const encryptedObj of encryptedObjects) {
      results.push(this.decryptObject(encryptedObj));
    }
    return results;
  }
}
