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
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return iv.toString('hex') + ':' + encrypted;
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
      const [ivHex, encrypted] = encryptedData.split(':');

      if (!ivHex || !encrypted) {
        throw new EncryptionError('Invalid encrypted data format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv(this.algorithm, this.key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
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
    return JSON.parse(decryptedString);
  }
}
