import { randomBytes } from 'crypto';
import { generateIdNative, isNativeAvailable } from '../native/index.js';

/**
 * @returns A unique string identifier
 */
export function generateId(): string {
  if (isNativeAvailable) {
    try {
      return generateIdNative();
    } catch (error) {
      console.warn('Native ID generation failed, using fallback:', error);
    }
  }
  return randomBytes(16).toString('hex');
}

/**
 * @returns Current date and time
 */
export function generateTimestamp(): Date {
  return new Date();
}

/**
 * @returns Object with ID and timestamps
 */
export function createDocumentMetadata(id?: string): {
  id: string;
  createdAt: Date;
  updatedAt: Date;
} {
  const now = generateTimestamp();
  return {
    id: id || generateId(),
    createdAt: now,
    updatedAt: now,
  };
}
