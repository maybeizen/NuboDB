import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
} from 'crypto';
import { EncryptionError } from '../errors/DatabaseError';

export class EncryptionManager {
  private key: Buffer;
  private algorithm: string;

  constructor(encryptionKey: string, algorithm: string = 'aes-256-cbc') {
    this.algorithm = algorithm;
    this.key = this.deriveKey(encryptionKey);
  }

  private deriveKey(password: string, salt?: string): Buffer {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : randomBytes(16);
    const key = pbkdf2Sync(password, saltBuffer, 100000, 32, 'sha256');
    return key;
  }

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

  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new EncryptionError('Invalid encrypted data format');
      }

      const ivHex = parts[0];
      const encrypted = parts[1];

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

  encryptObject(obj: any): string {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  decryptObject(encryptedData: string): any {
    const decryptedString = this.decrypt(encryptedData);
    return JSON.parse(decryptedString);
  }
}
