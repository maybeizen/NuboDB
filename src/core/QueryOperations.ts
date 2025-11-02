import type {
  Document,
  QueryFilter,
  QueryOptions,
  FindResult,
  QueryBuilder,
} from './types';
import type { DocumentWithMetadata } from './BaseCollection';
import { BaseCollection } from './BaseCollection';
import { CollectionError } from '../errors/DatabaseError';
import { QueryBuilder as QueryBuilderImpl } from './QueryBuilder';
import { QueryCacheManager } from './query/QueryCacheManager';
import { DocumentLoader } from './query/DocumentLoader';
import { IndexQueryResolver } from './query/IndexQueryResolver';
import { QueryFilterEngine } from './query/QueryFilter';
import { QuerySorter } from './query/QuerySorter';
import { QueryProjector } from './query/QueryProjector';

/** @typeParam T Document type for this collection */
export class QueryOperations<T = Document> extends BaseCollection<T> {
  private queryCache: QueryCacheManager<T>;
  private documentLoader: DocumentLoader<T>;
  private indexResolver: IndexQueryResolver;
  private filterEngine: QueryFilterEngine<T>;
  private sorter: QuerySorter<T>;
  private projector: QueryProjector<T>;

  constructor(
    name: string,
    storage: import('../storage/FileStorage').FileStorage,
    options: import('./types').CollectionOptions = {}
  ) {
    super(name, storage, options);

    this.queryCache = new QueryCacheManager<T>();
    this.documentLoader = new DocumentLoader<T>(
      this.storage,
      this.encryptionManager,
      this.cache,
      this.name,
      this.options.maxCacheSize || 1000
    );
    this.indexResolver = new IndexQueryResolver(
      this.indexes,
      this.indexManager.fieldMetadata
    );
    this.filterEngine = new QueryFilterEngine<T>();
    this.sorter = new QuerySorter<T>();
    this.projector = new QueryProjector<T>();
  }

  /** Rebuild index resolver mapping (call when indexes change) */
  public async rebuildIndexResolver(): Promise<void> {
    this.indexResolver = new IndexQueryResolver(
      this.indexes,
      this.indexManager.fieldMetadata
    );
    await this.indexResolver.rebuildFieldMapping();
  }

  /** Clear all query cache */
  public clearQueryCache(): void {
    this.queryCache.clear();
  }

  /** @param filter MongoDB-like query filter
   * @param options Query options (sort, limit, skip, projection)
   * @returns Query result with documents and metadata */
  async find(
    filter: QueryFilter = {},
    options: QueryOptions = {}
  ): Promise<FindResult<T>> {
    await this.ensureInitialized();

    const cacheKey = this.queryCache.getCacheKey(filter, options);
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const limit = options.limit || Number.MAX_SAFE_INTEGER;
      const skip = options.skip || 0;

      if (
        Object.keys(filter).length === 0 &&
        limit !== Number.MAX_SAFE_INTEGER
      ) {
        return this.handleEmptyFilterQuery(options, limit, skip);
      }

      const documents = await this.loadDocumentsForQuery(filter);
      const maxFilterResults =
        limit !== Number.MAX_SAFE_INTEGER
          ? Math.min(limit + skip, documents.length)
          : documents.length;

      let filteredDocuments = await this.filterEngine.filter(
        documents,
        filter,
        maxFilterResults
      );
      const total = await this.calculateTotalCount(filter, documents);

      if (options.sort && filteredDocuments.length > 1) {
        filteredDocuments = await this.sorter.sort(filteredDocuments, options.sort);
      }

      if (skip > 0) {
        filteredDocuments = filteredDocuments.slice(skip);
      }

      if (limit < Number.MAX_SAFE_INTEGER) {
        filteredDocuments = filteredDocuments.slice(0, limit);
      }

      if (options.projection) {
        filteredDocuments = await this.projector.project(
          filteredDocuments,
          options.projection
        );
      }

      const result = {
        documents: filteredDocuments,
        total,
        hasMore: total > skip + filteredDocuments.length,
      };

      this.queryCache.set(cacheKey, result);

      return result;
    } catch (error) {
      throw new CollectionError(
        `Find failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** Handle queries with empty filter
   * @param options Query options
   * @param limit Result limit
   * @param skip Skip count
   * @returns Query result */
  private async handleEmptyFilterQuery(
    options: QueryOptions,
    limit: number,
    skip: number
  ): Promise<FindResult<T>> {
    const documents = await this.getAllDocuments();
    const sliced = documents.slice(skip, skip + limit);

    let result = sliced;
    if (options.sort && result.length > 1) {
      result = await this.sorter.sort(result, options.sort);
    }
    if (options.projection) {
      result = await this.projector.project(result, options.projection);
    }

    return {
      documents: result,
      total: documents.length,
      hasMore: documents.length > skip + result.length,
    };
  }

  /** Load documents for a query, using indexes when available
   * @param filter Query filter
   * @returns Array of candidate documents */
  private async loadDocumentsForQuery(filter: QueryFilter): Promise<T[]> {
    if (this.indexes.size > 0) {
      const candidateIds = await this.indexResolver.getCandidateIds(filter);

      if (candidateIds && candidateIds.size > 0) {
        const candidateIdsArray = Array.from(candidateIds);
        return this.documentLoader.loadByIds(candidateIdsArray);
      } else if (candidateIds && candidateIds.size === 0) {
        return [];
      }
    }

    return this.getAllDocuments();
  }

  /** Calculate total count using indexes when possible
   * @param filter Query filter
   * @param documents Loaded documents
   * @returns Total count */
  private async calculateTotalCount(filter: QueryFilter, documents: T[]): Promise<number> {
    if (this.indexes.size > 0) {
      const candidateIds = await this.indexResolver.getCandidateIds(filter);
      if (candidateIds !== null) {
        return (await this.filterEngine.filter(documents, filter, documents.length))
          .length;
      }
    }
    return documents.length;
  }

  /** @param filter Query filter to match documents
   * @returns First matching document or null */
  async findOne(filter: QueryFilter = {}): Promise<T | null> {
    const result = await this.find(filter, { limit: 1 });
    return result.documents[0] || null;
  }

  /** @param id Document ID to lookup
   * @returns Document or null if not found */
  async findById(id: string): Promise<T | null> {
    await this.ensureInitialized();

    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    try {
      const documents = await this.documentLoader.loadByIds([id]);
      return documents[0] || null;
    } catch (error) {
      throw new CollectionError(
        `FindById failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** @returns QueryBuilder instance */
  query(): QueryBuilder<T> {
    return new QueryBuilderImpl<T>(this);
  }

  /** @param filter Query filter to match documents
   * @returns Number of matching documents */
  async count(filter: QueryFilter = {}): Promise<number> {
    const result = await this.find(filter);
    return result.total;
  }

  /** @returns True if collection is empty */
  async isEmpty(): Promise<boolean> {
    return (await this.count()) === 0;
  }

  /** Override clearCache to also clear query cache */
  clearCache(): void {
    super.clearCache();
    this.clearQueryCache();
  }
}
