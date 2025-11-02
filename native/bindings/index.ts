import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const binaryName = process.platform === 'win32'
  ? 'nubodb-native.exe'
  : 'nubodb-native';

function findBinaryPath(): string | null {
  const possiblePaths: string[] = [];
  
  possiblePaths.push(join(process.cwd(), 'dist', binaryName));
  
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      const currentFile = fileURLToPath(import.meta.url);
      const currentDir = dirname(currentFile);
      possiblePaths.push(join(currentDir, binaryName));
      possiblePaths.push(join(currentDir, '..', binaryName));
    }
  } catch {
  }
  
  if (typeof require !== 'undefined' && require.main && require.main.filename) {
    const mainDir = dirname(require.main.filename);
    possiblePaths.push(join(mainDir, binaryName));
    possiblePaths.push(join(mainDir, 'dist', binaryName));
  }

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

const binaryPath = findBinaryPath();

let processInstance: any = null;
let isAvailable = binaryPath !== null && existsSync(binaryPath);

function getProcess() {
  if (processInstance && !processInstance.killed) {
    return processInstance;
  }

  if (!binaryPath || !existsSync(binaryPath)) {
    isAvailable = false;
    return null;
  }

  try {
    processInstance = spawn(binaryPath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    processInstance.on('error', () => {
      processInstance = null;
      isAvailable = false;
    });

    processInstance.on('exit', () => {
      processInstance = null;
      isAvailable = false;
    });

    isAvailable = true;
    return processInstance;
  } catch {
    isAvailable = false;
    return null;
  }
}

function callMethod(method: string, params: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const proc = getProcess();
    if (!proc) {
      reject(new Error('Go binary not available'));
      return;
    }

    const request = {
      method,
      params,
    };

    let stdout = '';
    const onData = (data: Buffer) => {
      stdout += data.toString();
      const lines = stdout.split('\n');
      stdout = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            proc.stdout.removeListener('data', onData);
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response.result);
            }
          } catch (err) {
            proc.stdout.removeListener('data', onData);
            reject(err);
          }
        }
      }
    };

    proc.stdout.on('data', onData);
    proc.stdin.write(JSON.stringify(request) + '\n');
  });
}

export interface FilterResult {
  results?: any[];
  error?: string;
}

export interface CandidateIdsResult {
  ids?: string[];
  error?: string;
}

export interface SortResult {
  results?: any[];
  error?: string;
}

export interface ProjectResult {
  results?: any[];
  error?: string;
}

export class NativeFilterEngine {
  static async filterDocuments(documents: any[], filter: any, maxResults: number): Promise<any[]> {
    if (!isAvailable) {
      throw new Error('Native library not loaded');
    }

    try {
      const result: FilterResult = await callMethod('filterDocuments', {
        documents: JSON.stringify(documents),
        filter: JSON.stringify(filter),
        maxResults,
      });
      if (result.error) {
        throw new Error(result.error);
      }
      return result.results || [];
    } catch (error) {
      throw new Error(`Native filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getCandidateIds(filter: any): Promise<string[] | null> {
    if (!isAvailable) {
      return null;
    }

    try {
      const result: CandidateIdsResult = await callMethod('getCandidateIds', {
        filter: JSON.stringify(filter),
      });
      if (result.error) {
        return null;
      }
      return result.ids || null;
    } catch {
      return null;
    }
  }

  static async rebuildIndexMapping(indexes: Map<string, Map<any, string[]>>): Promise<void> {
    if (!isAvailable) {
      return;
    }

    try {
      const indexesObj: Record<string, Record<string, string[]>> = {};
      for (const [indexName, indexMap] of indexes.entries()) {
        const indexObj: Record<string, string[]> = {};
        for (const [key, ids] of indexMap.entries()) {
          const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
          indexObj[keyStr] = ids;
        }
        indexesObj[indexName] = indexObj;
      }
      await callMethod('rebuildIndexMapping', {
        indexes: JSON.stringify(indexesObj),
      });
    } catch (error) {
      console.warn('Failed to rebuild index mapping:', error);
    }
  }

  static async sortDocuments(documents: any[], sort: Record<string, 1 | -1>): Promise<any[]> {
    if (!isAvailable) {
      throw new Error('Native library not loaded');
    }

    try {
      const result: SortResult = await callMethod('sortDocuments', {
        documents: JSON.stringify(documents),
        sort: JSON.stringify(sort),
      });
      if (result.error) {
        throw new Error(result.error);
      }
      return result.results || [];
    } catch (error) {
      throw new Error(`Native sort failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async projectDocuments(documents: any[], projection: Record<string, 0 | 1>): Promise<any[]> {
    if (!isAvailable) {
      throw new Error('Native library not loaded');
    }

    try {
      const result: ProjectResult = await callMethod('projectDocuments', {
        documents: JSON.stringify(documents),
        projection: JSON.stringify(projection),
      });
      if (result.error) {
        throw new Error(result.error);
      }
      return result.results || [];
    } catch (error) {
      throw new Error(`Native projection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static isAvailable(): boolean {
    if (binaryPath && existsSync(binaryPath)) {
      return true;
    }
    const fallbackPath = join(process.cwd(), 'dist', binaryName);
    return existsSync(fallbackPath);
  }
}

export default NativeFilterEngine;
