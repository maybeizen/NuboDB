import { randomBytes } from 'crypto';

/**
 * Generate a unique document ID using crypto.randomUUID().
 *
 * @returns A unique string identifier.
 */
export function generateId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Get the current timestamp as a Date object.
 *
 * @returns Current date and time.
 */
export function generateTimestamp(): Date {
  return new Date();
}

/**
 * Create metadata for a new document.
 *
 * @returns Object with ID and timestamps.
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
