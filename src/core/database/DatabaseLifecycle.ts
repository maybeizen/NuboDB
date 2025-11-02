import type { FileStorage } from '../../storage/FileStorage';
import { DatabaseError } from '../../errors/DatabaseError';

async function checkNativeBindings(): Promise<boolean> {
  const possiblePaths = [
    '../../native/bindings',
    '../../../native/bindings/index',
  ];

  for (const importPath of possiblePaths) {
    try {
      // @ts-ignore - Dynamic import for optional native bindings
      const bindingsModule = await import(importPath);
      const NativeFilterEngine =
        bindingsModule?.NativeFilterEngine || bindingsModule?.default;
      if (
        NativeFilterEngine &&
        typeof NativeFilterEngine.isAvailable === 'function'
      ) {
        const available = NativeFilterEngine.isAvailable();
        if (available) {
          return true;
        }
      }
    } catch {
      continue;
    }
  }

  try {
    const { join } = await import('path');
    const { existsSync } = await import('fs');
    const binaryPath = join(process.cwd(), 'dist', 'nubodb-native');
    return existsSync(binaryPath);
  } catch {
    return false;
  }
}

/** Manages database lifecycle (open/close) */
export class DatabaseLifecycle {
  private isOpen: boolean = false;

  constructor(
    private storage: FileStorage,
    private path: string,
    private log: (message: string, level: string) => void,
    private emit: (event: string, error: Error) => void
  ) {}

  /** Open the database */
  async open(): Promise<void> {
    if (this.isOpen) {
      this.log('Database is already open', 'warn');
      return;
    }

    try {
      this.log('Opening database...', 'info');
      await this.storage.ensureDirectory(this.path);

      const hasNativeBindings = await checkNativeBindings();
      if (hasNativeBindings) {
        this.log(
          '✅ Native Go bindings enabled - using accelerated query processing',
          'info'
        );
      } else {
        this.log(
          '⚠️  Native Go bindings not available - falling back to TypeScript implementation',
          'info'
        );
        this.log(
          '   Install Go and rebuild to enable native acceleration: npm run build',
          'info'
        );
      }

      this.isOpen = true;
      this.log('Database opened successfully', 'info');
    } catch (error) {
      const errorMsg = `Failed to open database: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMsg, 'error');
      this.emit('error', new Error(errorMsg));
      throw new DatabaseError(errorMsg, 'OPEN_ERROR');
    }
  }

  /** Close the database */
  async close(): Promise<void> {
    if (!this.isOpen) {
      this.log('Database is not open', 'warn');
      return;
    }

    try {
      this.log('Closing database...', 'info');
      this.isOpen = false;
      this.log('Database closed successfully', 'info');
    } catch (error) {
      const errorMsg = `Failed to close database: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMsg, 'error');
      this.emit('error', new Error(errorMsg));
      throw new DatabaseError(errorMsg, 'CLOSE_ERROR');
    }
  }

  /** Check if database is open */
  isDatabaseOpen(): boolean {
    return this.isOpen;
  }

  /** Set open state (used internally) */
  setOpenState(state: boolean): void {
    this.isOpen = state;
  }
}
