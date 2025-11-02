import { DatabaseError } from '../../errors/DatabaseError';

/** Manages collection aliases */
export class AliasManager {
  private aliases: Map<string, string> = new Map();

  constructor(private log: (message: string, level: string) => void) {}

  /** Create an alias for a collection
   * @param alias Alias name
   * @param collectionName Actual collection name */
  createAlias(alias: string, collectionName: string): void {
    if (this.aliases.has(alias)) {
      throw new DatabaseError(
        `Alias '${alias}' already exists`,
        'ALIAS_EXISTS_ERROR'
      );
    }
    this.aliases.set(alias, collectionName);
    this.log(
      `Alias '${alias}' created for collection '${collectionName}'`,
      'debug'
    );
  }

  /** Remove an alias
   * @param alias Alias to remove
   * @returns True if removed */
  removeAlias(alias: string): boolean {
    const removed = this.aliases.delete(alias);
    if (removed) {
      this.log(`Alias '${alias}' removed`, 'debug');
    }
    return removed;
  }

  /** Get all aliases
   * @returns Record of aliases */
  getAliases(): Record<string, string> {
    return Object.fromEntries(this.aliases);
  }

  /** Check if a name is an alias
   * @param name Name to check
   * @returns True if alias */
  isAlias(name: string): boolean {
    return this.aliases.has(name);
  }

  /** Resolve alias to actual collection name
   * @param name Alias or collection name
   * @returns Actual collection name */
  resolve(name: string): string {
    return this.aliases.get(name) || name;
  }
}
