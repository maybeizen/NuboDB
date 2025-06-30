import { randomBytes } from 'crypto';

export function generateId(): string {
  return randomBytes(16).toString('hex');
}

export function generateTimestamp(): Date {
  return new Date();
}

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
