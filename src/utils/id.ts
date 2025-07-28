import { randomBytes } from 'crypto';

/** @returns A unique string identifier */
export function generateId(): string {
  return randomBytes(16).toString('hex');
}

/** @returns Current date and time */
export function generateTimestamp(): Date {
  return new Date();
}

/** @returns Object with ID and timestamps */
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
