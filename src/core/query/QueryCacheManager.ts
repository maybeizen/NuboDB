import type { QueryFilter, QueryOptions, FindResult } from '../types';

interface CachedResult<T> {
  result: FindResult<T>;
  timestamp: number;
}

/** Fast cache key generator using object properties */
class FastCacheKey {
  static generate(filter: QueryFilter, options: QueryOptions): string {
    const parts: string[] = [];
    
    for (const [key, value] of Object.entries(filter).sort()) {
      if (typeof value === 'object' && value !== null) {
        parts.push(`${key}:${JSON.stringify(value)}`);
      } else {
        parts.push(`${key}:${String(value)}`);
      }
    }
    
    if (options.limit !== undefined) parts.push(`limit:${options.limit}`);
    if (options.skip !== undefined) parts.push(`skip:${options.skip}`);
    if (options.sort) {
      parts.push(`sort:${JSON.stringify(options.sort)}`);
    }
    if (options.projection) {
      parts.push(`proj:${JSON.stringify(options.projection)}`);
    }
    
    return parts.join('|');
  }
}

/** Manages query result caching with TTL */
export class QueryCacheManager<T> {
  private queryCache: Map<string, CachedResult<T>> = new Map();
  private readonly CACHE_TTL = 5000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  /** Start periodic cache cleanup */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      this.cleanCache();
    }, this.CACHE_TTL);
  }

  /** @param filter Query filter
   * @param options Query options
   * @returns Cache key string */
  getCacheKey(filter: QueryFilter, options: QueryOptions): string {
    return FastCacheKey.generate(filter, options);
  }

  /** @param timestamp Cache entry timestamp
   * @returns True if cache entry is still valid */
  isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  /** @param cacheKey Cache key
   * @returns Cached result or null if not found/invalid */
  get(cacheKey: string): FindResult<T> | null {
    const cached = this.queryCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.result;
    }
    if (cached) {
      this.queryCache.delete(cacheKey);
    }
    return null;
  }

  /** @param cacheKey Cache key
   * @param result Query result to cache */
  set(cacheKey: string, result: FindResult<T>): void {
    this.queryCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });

    if (this.queryCache.size > 1000) {
      this.cleanCache();
    }
  }

  /** Remove expired cache entries */
  cleanCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, { timestamp }] of this.queryCache) {
      if (now - timestamp >= this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.queryCache.delete(key);
    }
  }

  /** Clear all cached queries */
  clear(): void {
    this.queryCache.clear();
  }
}
