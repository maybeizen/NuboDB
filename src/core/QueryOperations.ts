import {
  Document,
  QueryFilter,
  QueryOptions,
  FindResult,
  QueryBuilder,
} from './types';
import { BaseCollection, DocumentWithMetadata } from './BaseCollection';
import { CollectionError } from '../errors/DatabaseError';
import { QueryBuilder as QueryBuilderImpl } from './QueryBuilder';

export class QueryOperations<T = Document> extends BaseCollection<T> {
  async find(
    filter: QueryFilter = {},
    options: QueryOptions = {}
  ): Promise<FindResult<T>> {
    await this.ensureInitialized();

    try {
      let documents = await this.getAllDocuments();

      if (Object.keys(this.indexes).length > 0) {
        documents = this.useIndexes(documents, filter);
      }

      let filteredDocuments = this.filterDocuments(documents, filter);

      if (options.sort) {
        filteredDocuments = this.sortDocuments(filteredDocuments, options.sort);
      }

      if (options.projection) {
        filteredDocuments = this.projectDocuments(
          filteredDocuments,
          options.projection
        );
      }

      const total = filteredDocuments.length;

      if (options.skip) {
        filteredDocuments = filteredDocuments.slice(options.skip);
      }

      if (options.limit) {
        filteredDocuments = filteredDocuments.slice(0, options.limit);
      }

      return {
        documents: filteredDocuments,
        total,
        hasMore: total > (options.skip || 0) + filteredDocuments.length,
      };
    } catch (error) {
      throw new CollectionError(
        `Find failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findOne(filter: QueryFilter = {}): Promise<T | null> {
    const result = await this.find(filter, { limit: 1 });
    return result.documents[0] || null;
  }

  async findById(id: string): Promise<T | null> {
    await this.ensureInitialized();

    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    try {
      const document = await this.storage.readDocument(this.name, id);
      if (document) {
        let decryptedDocument = document;
        if (this.encryptionManager && document.data) {
          decryptedDocument = this.encryptionManager.decryptObject(
            document.data
          );
        }

        this.cache.set(id, decryptedDocument as T);
        return decryptedDocument as T;
      }

      return null;
    } catch (error) {
      throw new CollectionError(
        `FindById failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  query(): QueryBuilder<T> {
    return new QueryBuilderImpl<T>(this);
  }

  async count(filter: QueryFilter = {}): Promise<number> {
    const result = await this.find(filter);
    return result.total;
  }

  async isEmpty(): Promise<boolean> {
    return (await this.count()) === 0;
  }

  private filterDocuments(documents: T[], filter: QueryFilter): T[] {
    return documents.filter(document => this.matchesFilter(document, filter));
  }

  private matchesFilter(document: T, filter: QueryFilter): boolean {
    for (const [field, value] of Object.entries(filter)) {
      if (field.startsWith('$')) {
        if (!this.matchesLogicalOperator(document, field, value as any[])) {
          return false;
        }
      } else {
        const fieldValue = (document as any)[field];
        if (typeof value === 'object' && value !== null) {
          if (!this.matchesComparisonOperators(fieldValue, value)) {
            return false;
          }
        } else {
          if (fieldValue !== value) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private matchesLogicalOperator(
    document: T,
    operator: string,
    conditions: any[]
  ): boolean {
    switch (operator) {
      case '$and':
        return conditions.every(condition =>
          this.matchesFilter(document, condition)
        );
      case '$or':
        return conditions.some(condition =>
          this.matchesFilter(document, condition)
        );
      case '$nor':
        return !conditions.some(condition =>
          this.matchesFilter(document, condition)
        );
      default:
        return true;
    }
  }

  private matchesComparisonOperators(value: any, operators: any): boolean {
    for (const [operator, operatorValue] of Object.entries(operators)) {
      switch (operator) {
        case '$eq':
          if (value !== operatorValue) return false;
          break;
        case '$ne':
          if (value === operatorValue) return false;
          break;
        case '$gt':
          if (value <= (operatorValue as number)) return false;
          break;
        case '$gte':
          if (value < (operatorValue as number)) return false;
          break;
        case '$lt':
          if (value >= (operatorValue as number)) return false;
          break;
        case '$lte':
          if (value > (operatorValue as number)) return false;
          break;
        case '$in':
          if (
            !Array.isArray(operatorValue) ||
            !(operatorValue as any[]).includes(value)
          )
            return false;
          break;
        case '$nin':
          if (
            Array.isArray(operatorValue) &&
            (operatorValue as any[]).includes(value)
          )
            return false;
          break;
        case '$exists':
          if (operatorValue && value === undefined) return false;
          if (!operatorValue && value !== undefined) return false;
          break;
        case '$regex':
          if (
            typeof value !== 'string' ||
            !new RegExp(operatorValue as string).test(value)
          )
            return false;
          break;
      }
    }
    return true;
  }

  private sortDocuments(
    documents: T[],
    sort: { [field: string]: 1 | -1 } | Array<[string, 1 | -1]>
  ): T[] {
    const sortArray = Array.isArray(sort) ? sort : Object.entries(sort);

    return documents.sort((a, b) => {
      for (const [field, direction] of sortArray) {
        const aVal = (a as any)[field];
        const bVal = (b as any)[field];

        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
      }
      return 0;
    });
  }

  private projectDocuments(
    documents: T[],
    projection: { [field: string]: 0 | 1 }
  ): T[] {
    const includeFields = Object.entries(projection)
      .filter(([_, value]) => value === 1)
      .map(([field, _]) => field);

    const excludeFields = Object.entries(projection)
      .filter(([_, value]) => value === 0)
      .map(([field, _]) => field);

    return documents.map(document => {
      const projected: any = {};

      if (includeFields.length > 0) {
        includeFields.forEach(field => {
          if ((document as any).hasOwnProperty(field)) {
            projected[field] = (document as any)[field];
          }
        });
      } else {
        Object.keys(document as any).forEach(field => {
          if (!excludeFields.includes(field)) {
            projected[field] = (document as any)[field];
          }
        });
      }

      return projected as T;
    });
  }

  private useIndexes(documents: T[], filter: QueryFilter): T[] {
    for (const [field, value] of Object.entries(filter)) {
      if (this.indexes.has(field) && typeof value !== 'object') {
        const index = this.indexes.get(field)!;
        const documentIds = index.get(value) || [];
        return documents.filter(doc => {
          const docWithMetadata = doc as T & DocumentWithMetadata;
          return documentIds.includes(docWithMetadata._id);
        });
      }
    }
    return documents;
  }
}
