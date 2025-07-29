import type { Schema, Document } from '../core/types';
import { SchemaError } from '../errors/DatabaseError';

/** @param data Document data to validate
 * @param schema Schema definition to validate against */
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

/** @param data Document data
 * @param schema Schema with default values
 * @returns Data with defaults applied */
export function applyDefaults(data: any, schema: Schema): any {
  const result = { ...data };

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    if (result[fieldName] === undefined && fieldSchema.default !== undefined) {
      result[fieldName] = fieldSchema.default;
    }
  }

  return result;
}

/** @param data Raw document data
 * @returns Sanitized document data */
export function sanitizeDocument(
  data: any
): Omit<Document, '_id' | '_createdAt' | '_updatedAt'> {
  const { _id, _createdAt, _updatedAt, ...sanitized } = data;
  void _id; void _createdAt; void _updatedAt;
  return sanitized;
}

/** Validation helper functions for common field types */
export const validators = {
  /** Validate email format */
  email: (value: unknown): boolean | string => {
    if (typeof value !== 'string') return 'Email must be a string';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || 'Invalid email format';
  },

  /** Validate URL format */
  url: (value: unknown): boolean | string => {
    if (typeof value !== 'string') return 'URL must be a string';
    try {
      new URL(value);
      return true;
    } catch {
      return 'Invalid URL format';
    }
  },

  /** Validate phone number (basic international format) */
  phone: (value: unknown): boolean | string => {
    if (typeof value !== 'string') return 'Phone must be a string';
    const phoneRegex = /^\+?[\d\s\-\(\)]{7,}$/;
    return phoneRegex.test(value) || 'Invalid phone format';
  },

  /** Validate UUID format */
  uuid: (value: unknown): boolean | string => {
    if (typeof value !== 'string') return 'UUID must be a string';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value) || 'Invalid UUID format';
  },

  /** Create a minimum length validator */
  minLength: (min: number) => (value: unknown): boolean | string => {
    if (typeof value !== 'string') return 'Value must be a string';
    return value.length >= min || `Minimum length is ${min}`;
  },

  /** Create a maximum length validator */
  maxLength: (max: number) => (value: unknown): boolean | string => {
    if (typeof value !== 'string') return 'Value must be a string';
    return value.length <= max || `Maximum length is ${max}`;
  },

  /** Create a range validator for numbers */
  range: (min: number, max: number) => (value: unknown): boolean | string => {
    if (typeof value !== 'number') return 'Value must be a number';
    return (value >= min && value <= max) || `Value must be between ${min} and ${max}`;
  },

  /** Validate positive number */
  positive: (value: unknown): boolean | string => {
    if (typeof value !== 'number') return 'Value must be a number';
    return value > 0 || 'Value must be positive';
  },

  /** Validate non-negative number */
  nonNegative: (value: unknown): boolean | string => {
    if (typeof value !== 'number') return 'Value must be a number';
    return value >= 0 || 'Value must be non-negative';
  }
};

/** Helper to create schema fields with common validations */
export const createField = {
  /** Create an email field */
  email: (required = false, defaultValue?: string) => ({
    type: 'string' as const,
    required,
    default: defaultValue,
    validate: validators.email
  }),

  /** Create a URL field */
  url: (required = false, defaultValue?: string) => ({
    type: 'string' as const,
    required,
    default: defaultValue,
    validate: validators.url
  }),

  /** Create a phone field */
  phone: (required = false, defaultValue?: string) => ({
    type: 'string' as const,
    required,
    default: defaultValue,
    validate: validators.phone
  }),

  /** Create a UUID field */
  uuid: (required = false, defaultValue?: string) => ({
    type: 'string' as const,
    required,
    default: defaultValue,
    validate: validators.uuid
  }),

  /** Create a string field with length constraints */
  string: (options: { 
    required?: boolean; 
    minLength?: number; 
    maxLength?: number; 
    default?: string;
    pattern?: RegExp;
  } = {}) => {
    const field: any = {
      type: 'string' as const,
      required: options.required || false,
      default: options.default
    };

    if (options.pattern) {
      field.pattern = options.pattern;
    }

    if (options.minLength !== undefined) {
      field.min = options.minLength;
    }

    if (options.maxLength !== undefined) {
      field.max = options.maxLength;
    }

    return field;
  },

  /** Create a number field with range constraints */
  number: (options: {
    required?: boolean;
    min?: number;
    max?: number;
    default?: number;
    positive?: boolean;
  } = {}) => {
    const field: any = {
      type: 'number' as const,
      required: options.required || false,
      default: options.default
    };

    if (options.min !== undefined) {
      field.min = options.min;
    }

    if (options.max !== undefined) {
      field.max = options.max;
    }

    if (options.positive) {
      field.validate = validators.positive;
    }

    return field;
  }
};
