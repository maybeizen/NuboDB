import type { Schema, Document } from '../types';
import { validateSchema, applyDefaults } from '../../utils/schema';
import { SchemaError } from '../../errors/DatabaseError';

/** Validates and applies defaults to document data */
export class DocumentValidator<T = Document> {
  constructor(private schema?: Schema) {}

  /** Validate and apply defaults to document data
   * @param data Raw document data
   * @returns Validated and processed data */
  validateAndProcess(data: Partial<T>): Partial<T> {
    if (!this.schema) {
      return data;
    }

    let processedData = { ...data };
    validateSchema(processedData, this.schema);
    processedData = applyDefaults(processedData, this.schema);
    return processedData;
  }

  /** Validate document data without processing
   * @param data Document data to validate
   * @throws SchemaError if validation fails */
  validate(data: Partial<T>): void {
    if (this.schema) {
      validateSchema(data, this.schema);
    }
  }

  /** Apply schema defaults to document data
   * @param data Document data
   * @returns Data with defaults applied */
  applyDefaults(data: Partial<T>): Partial<T> {
    if (!this.schema) {
      return data;
    }
    return applyDefaults(data, this.schema);
  }
}
