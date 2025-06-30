import { Schema, Document } from '../core/types';
import { SchemaError } from '../errors/DatabaseError';

/**
 * Validate document data against a schema definition.
 *
 * @param data   - Document data to validate.
 * @param schema - Schema definition to validate against.
 * @throws Error if validation fails.
 */
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

/**
 * Apply default values from schema to document data.
 *
 * @param data   - Document data.
 * @param schema - Schema with default values.
 * @returns Data with defaults applied.
 */
export function applyDefaults(data: any, schema: Schema): any {
  const result = { ...data };

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    if (result[fieldName] === undefined && fieldSchema.default !== undefined) {
      result[fieldName] = fieldSchema.default;
    }
  }

  return result;
}

/**
 * Remove undefined values and sanitize document data.
 *
 * @param data - Raw document data.
 * @returns Sanitized document data.
 */
export function sanitizeDocument(
  data: any
): Omit<Document, '_id' | '_createdAt' | '_updatedAt'> {
  const { _id, _createdAt, _updatedAt, ...sanitized } = data;
  return sanitized;
}
