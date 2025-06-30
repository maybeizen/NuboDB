import { Schema, Document } from '../core/types';
import { SchemaError } from '../errors/DatabaseError';

export function validateSchema(data: any, schema: Schema): void {
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const value = data[fieldName];

    if (fieldSchema.required && (value === undefined || value === null)) {
      throw new SchemaError(`Required field '${fieldName}' is missing`);
    }

    if (value === undefined || value === null) {
      continue;
    }

    if (!validateFieldType(value, fieldSchema.type)) {
      throw new SchemaError(
        `Field '${fieldName}' has invalid type. Expected ${fieldSchema.type}, got ${typeof value}`
      );
    }
  }
}

export function validateFieldType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return (
        typeof value === 'object' && !Array.isArray(value) && value !== null
      );
    case 'array':
      return Array.isArray(value);
    case 'date':
      return (
        value instanceof Date ||
        (typeof value === 'string' && !isNaN(Date.parse(value)))
      );
    default:
      return false;
  }
}

export function applyDefaults(data: any, schema: Schema): any {
  const result = { ...data };

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    if (result[fieldName] === undefined && fieldSchema.default !== undefined) {
      result[fieldName] = fieldSchema.default;
    }
  }

  return result;
}

export function sanitizeDocument(
  data: any
): Omit<Document, '_id' | '_createdAt' | '_updatedAt'> {
  const { _id, _createdAt, _updatedAt, ...sanitized } = data;
  return sanitized;
}
