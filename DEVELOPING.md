# Developing NuboDB

This guide is for developers working on NuboDB's internals, architecture, and core functionality.

## 🏗️ Architecture Overview

NuboDB follows a modular architecture with clear separation of concerns:

```
NuboDB
├── Core (src/core/)
│   ├── NuboDB.ts           # Main database class
│   ├── BaseCollection.ts   # Foundation collection class
│   ├── DocumentOperations.ts # CRUD operations
│   ├── QueryOperations.ts  # Query and search operations
│   ├── Collection.ts       # Main collection facade
│   ├── QueryBuilder.ts     # Fluent query interface
│   └── types.ts           # Core type definitions
├── Storage (src/storage/)
│   └── FileStorage.ts      # File-based storage implementation
├── Encryption (src/encryption/)
│   └── EncryptionManager.ts # Encryption/decryption logic
├── Utils (src/utils/)
│   ├── id.ts              # ID generation utilities
│   └── schema.ts          # Schema validation utilities
└── Errors (src/errors/)
    └── DatabaseError.ts   # Custom error classes
```

## 🔧 Core Components

### Database Class (`NuboDB.ts`)

The main entry point that orchestrates all database operations:

```typescript
class NuboDB {
  private storage: Storage;
  private encryptionManager?: EncryptionManager;
  private collections: Map<string, Collection>;

  async open(): Promise<void>;
  async close(): Promise<void>;
  collection(name: string): Collection;
  async createCollection(name: string, schema?: Schema): Promise<Collection>;
}
```

### Collection Architecture

Collections use composition pattern with specialized classes:

```typescript
class Collection {
  private baseCollection: BaseCollection;
  private documentOps: DocumentOperations;
  private queryOps: QueryOperations;

  // Delegates to specialized classes
  async insert(data: any): Promise<InsertResult>;
  async find(filter?: Filter): Promise<QueryResult>;
  async update(filter: Filter, data: any): Promise<UpdateResult>;
  async delete(filter: Filter): Promise<DeleteResult>;
}
```

### Storage Layer

Abstract storage interface with file-based implementation:

```typescript
interface Storage {
  read(path: string): Promise<any>;
  write(path: string, data: any): Promise<void>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  list(path: string): Promise<string[]>;
}
```

## 🚀 Development Workflow

### 1. Understanding the Codebase

Start by exploring the core files in order:

1. **`types.ts`** - Understand the data structures
2. **`BaseCollection.ts`** - Foundation functionality
3. **`DocumentOperations.ts`** - CRUD operations
4. **`QueryOperations.ts`** - Query functionality
5. **`Collection.ts`** - Main facade
6. **`NuboDB.ts`** - Database orchestration

### 2. Making Changes

#### Adding New Features

1. **Define types** in `types.ts` first
2. **Implement core logic** in appropriate class
3. **Add tests** for new functionality
4. **Update documentation** and examples
5. **Update exports** in `index.ts`

#### Example: Adding a New Query Operator

```typescript
// 1. Add to types.ts
type QueryOperator =
  | '$eq'
  | '$ne'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$regex'  // New operator

// 2. Implement in QueryOperations.ts
private evaluateRegex(value: any, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern);
    return regex.test(String(value));
  } catch {
    return false;
  }
}

// 3. Add to query evaluation logic
case '$regex':
  return this.evaluateRegex(fieldValue, operatorValue);
```

### 3. Testing Strategy

#### Unit Tests

Test individual components in isolation:

```typescript
describe('DocumentOperations', () => {
  let docOps: DocumentOperations;
  let mockStorage: jest.Mocked<Storage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    docOps = new DocumentOperations('test', mockStorage);
  });

  it('should insert document with generated ID', async () => {
    const result = await docOps.insert({ name: 'Test' });
    expect(result.id).toBeDefined();
    expect(result.document.name).toBe('Test');
  });
});
```

#### Integration Tests

Test component interactions:

```typescript
describe('Collection Integration', () => {
  it('should handle full CRUD cycle', async () => {
    const collection = new Collection('test', storage);

    // Create
    const insertResult = await collection.insert({ name: 'Test' });

    // Read
    const found = await collection.findById(insertResult.id);
    expect(found.name).toBe('Test');

    // Update
    await collection.update({ _id: insertResult.id }, { name: 'Updated' });

    // Delete
    await collection.delete({ _id: insertResult.id });
  });
});
```

#### Performance Tests

Test critical performance paths:

```typescript
describe('Performance', () => {
  it('should handle bulk insert efficiently', async () => {
    const start = Date.now();
    const data = Array.from({ length: 1000 }, (_, i) => ({ id: i }));

    await collection.insertMany(data);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // Should complete in < 1s
  });
});
```

## 🔍 Debugging

### Debug Mode

Enable detailed logging:

```typescript
const db = await createDatabase({
  debug: true,
  logLevel: 'debug',
});
```

### Common Debug Scenarios

#### 1. Query Performance Issues

```typescript
// Add timing to query operations
const start = Date.now();
const results = await collection.find(filter);
console.log(`Query took ${Date.now() - start}ms`);
```

#### 2. Memory Leaks

```typescript
// Monitor cache size
console.log('Cache size:', collection.cache.size);
collection.clearCache();
```

#### 3. Storage Issues

```typescript
// Check file operations
const exists = await storage.exists(path);
console.log('File exists:', exists);
```

### Debug Tools

#### TypeScript Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug NuboDB",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/examples/basic-usage.js",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "sourceMaps": true
    }
  ]
}
```

## 🏗️ Architecture Patterns

### 1. Composition over Inheritance

```typescript
// Good: Composition
class Collection {
  private documentOps: DocumentOperations;
  private queryOps: QueryOperations;

  async insert(data: any) {
    return this.documentOps.insert(data);
  }
}

// Avoid: Deep inheritance
class Collection extends BaseCollection extends DocumentOperations extends QueryOperations
```

### 2. Dependency Injection

```typescript
// Good: Inject dependencies
class Collection {
  constructor(name: string, storage: Storage, options: CollectionOptions = {}) {
    this.storage = storage;
    this.options = options;
  }
}

// Avoid: Create dependencies internally
class Collection {
  constructor(name: string) {
    this.storage = new FileStorage(); // Hard to test
  }
}
```

### 3. Interface Segregation

```typescript
// Good: Focused interfaces
interface ReadableCollection {
  find(filter?: Filter): Promise<QueryResult>;
  findOne(filter: Filter): Promise<Document | null>;
}

interface WritableCollection {
  insert(data: any): Promise<InsertResult>;
  update(filter: Filter, data: any): Promise<UpdateResult>;
}

// Avoid: Large interfaces
interface Collection {
  // Too many methods in one interface
}
```

## 🔧 Performance Optimization

### 1. Caching Strategy

```typescript
class Collection {
  private cache = new Map<string, Document>();

  async findById(id: string): Promise<Document | null> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    // Load from storage
    const document = await this.storage.read(`${id}.json`);
    if (document) {
      this.cache.set(id, document);
    }

    return document;
  }
}
```

### 2. Batch Operations

```typescript
async insertMany(documents: any[]): Promise<BatchResult> {
  const results = [];
  const batchSize = 100;

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(doc => this.insert(doc))
    );
    results.push(...batchResults);
  }

  return { insertedCount: results.length, documents: results };
}
```

### 3. Indexing

```typescript
class IndexManager {
  private indexes = new Map<string, Index>();

  async createIndex(fields: Record<string, 1 | -1>): Promise<void> {
    const indexName = Object.keys(fields).join('_');
    const index = new Index(fields);

    // Build index from existing data
    const documents = await this.collection.find();
    for (const doc of documents.documents) {
      index.addDocument(doc);
    }

    this.indexes.set(indexName, index);
  }
}
```

## 🧪 Testing Infrastructure

### Test Utilities

```typescript
// test/utils/mockStorage.ts
export function createMockStorage(): jest.Mocked<Storage> {
  const storage = new Map<string, any>();

  return {
    read: jest.fn(async (path: string) => storage.get(path)),
    write: jest.fn(async (path: string, data: any) => storage.set(path, data)),
    delete: jest.fn(async (path: string) => storage.delete(path)),
    exists: jest.fn(async (path: string) => storage.has(path)),
    list: jest.fn(async (path: string) => Array.from(storage.keys())),
  };
}
```

### Test Data Generators

```typescript
// test/utils/testData.ts
export function generateUser(overrides: Partial<User> = {}): User {
  return {
    name: `User ${Math.random().toString(36).substr(2, 9)}`,
    email: `user${Math.random()}@example.com`,
    age: Math.floor(Math.random() * 50) + 18,
    isActive: true,
    ...overrides,
  };
}

export function generateUsers(count: number): User[] {
  return Array.from({ length: count }, () => generateUser());
}
```

## 📊 Monitoring and Metrics

### Performance Metrics

```typescript
class MetricsCollector {
  private metrics = {
    operations: new Map<string, number>(),
    timings: new Map<string, number[]>(),
  };

  recordOperation(operation: string, duration: number): void {
    this.metrics.operations.set(
      operation,
      (this.metrics.operations.get(operation) || 0) + 1
    );

    if (!this.metrics.timings.has(operation)) {
      this.metrics.timings.set(operation, []);
    }
    this.metrics.timings.get(operation)!.push(duration);
  }

  getStats(): MetricsStats {
    return {
      totalOperations: Array.from(this.metrics.operations.values()).reduce(
        (a, b) => a + b,
        0
      ),
      averageTimings: Object.fromEntries(
        Array.from(this.metrics.timings.entries()).map(([op, timings]) => [
          op,
          timings.reduce((a, b) => a + b, 0) / timings.length,
        ])
      ),
    };
  }
}
```

## 🔄 Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
      - run: pnpm type-check
      - run: pnpm lint
```

## 📚 Resources

### Internal Documentation

- **API Reference** - `docs/API.md`
- **Architecture Guide** - `docs/ARCHITECTURE.md`
- **Performance Guide** - `docs/PERFORMANCE.md`

### External Resources

- **TypeScript Handbook** - https://www.typescriptlang.org/docs/
- **Node.js Documentation** - https://nodejs.org/docs/
- **Jest Testing Framework** - https://jestjs.io/docs/

---

This guide should help you understand and contribute to NuboDB's development effectively! 🚀
