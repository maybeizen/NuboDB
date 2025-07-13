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

### 1. Development Environment Setup

```bash
# Clone and setup
git clone https://github.com/maybeizen/nubodb.git
cd nubodb
pnpm install

# Development commands
pnpm dev           # Watch mode compilation
pnpm build         # Build for production
pnpm type-check    # TypeScript type checking
pnpm lint          # Code linting
pnpm lint:fix      # Auto-fix linting issues
pnpm format        # Format code with Prettier
pnpm clean         # Clean build artifacts

# Test examples
pnpm example:basic      # Basic usage
pnpm example:query      # Query builder
pnpm example:schema     # Schema validation
pnpm example:encryption # Encryption features
```

### 2. Understanding the Codebase

Start by exploring the core files in order:

1. **`types.ts`** - Core type definitions and interfaces
2. **`BaseCollection.ts`** - Foundation collection functionality
3. **`DocumentOperations.ts`** - CRUD operations implementation
4. **`QueryOperations.ts`** - Query and search functionality
5. **`Collection.ts`** - Public collection facade
6. **`NuboDB.ts`** - Main database orchestration
7. **`QueryBuilder.ts`** - Fluent query interface

### 3. Current Build Configuration

**TypeScript Configuration** (`tsconfig.json`):

- Target: ES2022
- Module: CommonJS (for Node.js compatibility)
- Strict mode enabled with comprehensive type checking
- Declaration files generated for npm distribution

**Build Tool** (`tsup.config.ts`):

- Uses `tsup` for fast TypeScript bundling
- Generates both CommonJS and ESM outputs
- Source maps included for debugging
- Declaration files for TypeScript users

### 4. Making Changes

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

### 5. Testing Strategy

**⚠️ Current Status**: NuboDB lacks a formal testing framework. This is a high-priority item for contributors!

**Immediate Testing Needs**:

1. **Choose testing framework**: Jest, Vitest, or Node.js built-in test runner
2. **Setup test configuration**: Add test scripts to package.json
3. **Create test utilities**: Database setup/teardown helpers
4. **Implement core tests**: CRUD operations, query builder, schema validation

**Manual Testing Current Approach**:

```bash
# Test core functionality by running examples
pnpm example:basic      # Test basic CRUD operations
pnpm example:query      # Test query builder
pnpm example:schema     # Test schema validation
pnpm example:encryption # Test encryption features
pnpm example:performance # Test performance scenarios
```

#### Proposed Unit Testing Structure

**When testing framework is implemented**:

```typescript
// Example test structure for DocumentOperations
import { DocumentOperations } from '../src/core/DocumentOperations';
import { createMockStorage } from './utils/mockStorage';

describe('DocumentOperations', () => {
  let docOps: DocumentOperations;
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    docOps = new DocumentOperations('test-collection', mockStorage, {});
  });

  describe('insert', () => {
    it('should insert document with generated ID', async () => {
      const testData = { name: 'Test User', email: 'test@example.com' };

      const result = await docOps.insert(testData);

      expect(result.insertedId).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockStorage.write).toHaveBeenCalled();
    });

    it('should apply schema validation when schema is provided', async () => {
      // Test schema validation logic
    });

    it('should handle insertion errors gracefully', async () => {
      mockStorage.write.mockRejectedValue(new Error('Storage error'));

      await expect(docOps.insert({ name: 'Test' })).rejects.toThrow(
        'Storage error'
      );
    });
  });
});
```

#### Proposed Integration Testing

**Full CRUD cycle testing**:

```typescript
// Integration test for complete workflows
import { createDatabase } from '../src';
import { tmpdir } from 'os';
import { join } from 'path';

describe('NuboDB Integration', () => {
  let db: NuboDB;
  let testDbPath: string;

  beforeEach(async () => {
    testDbPath = join(tmpdir(), `nubodb-test-${Date.now()}`);
    db = await createDatabase({ path: testDbPath });
    await db.open();
  });

  afterEach(async () => {
    await db.close();
    // Clean up test database files
  });

  describe('Full CRUD Lifecycle', () => {
    it('should handle complete document lifecycle', async () => {
      const users = db.collection('users');

      // Create
      const insertResult = await users.insert({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      });

      expect(insertResult.success).toBe(true);
      expect(insertResult.insertedId).toBeDefined();

      // Read
      const foundUser = await users.findById(insertResult.insertedId);
      expect(foundUser).toBeTruthy();
      expect(foundUser?.name).toBe('John Doe');

      // Update
      const updateResult = await users.update(
        { _id: insertResult.insertedId },
        { age: 31, lastLogin: new Date() }
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.modifiedCount).toBe(1);

      // Verify update
      const updatedUser = await users.findById(insertResult.insertedId);
      expect(updatedUser?.age).toBe(31);

      // Delete
      const deleteResult = await users.delete({ _id: insertResult.insertedId });
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.deletedCount).toBe(1);

      // Verify deletion
      const deletedUser = await users.findById(insertResult.insertedId);
      expect(deletedUser).toBeNull();
    });
  });

  describe('Query Builder Integration', () => {
    it('should handle complex queries', async () => {
      const users = db.collection('users');

      // Insert test data
      await users.insertMany([
        { name: 'Alice', age: 25, status: 'active' },
        { name: 'Bob', age: 30, status: 'inactive' },
        { name: 'Charlie', age: 35, status: 'active' },
      ]);

      // Complex query
      const results = await users
        .query()
        .where('age', '$gte', 25)
        .and('status', '$eq', 'active')
        .sort('age', 1)
        .limit(10)
        .execute();

      expect(results.documents).toHaveLength(2);
      expect(results.documents[0].name).toBe('Alice');
      expect(results.documents[1].name).toBe('Charlie');
    });
  });
});
```

#### Proposed Performance Testing

**Benchmark critical operations**:

```typescript
// Performance and load testing
describe('Performance Benchmarks', () => {
  let db: NuboDB;
  let collection: Collection;

  beforeEach(async () => {
    db = await createDatabase({
      path: './perf-test-db',
      cacheDocuments: true,
      maxCacheSize: 1000,
    });
    await db.open();
    collection = db.collection('benchmark');
  });

  describe('Bulk Operations', () => {
    it('should handle bulk insert efficiently', async () => {
      const testData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        data: 'x'.repeat(100), // ~100 bytes per doc
      }));

      const start = performance.now();
      const result = await collection.insertMany(testData);
      const duration = performance.now() - start;

      expect(result.insertedIds).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // Should complete in < 5s

      console.log(`Bulk insert: ${duration.toFixed(2)}ms for 1000 documents`);
    });

    it('should handle large queries efficiently', async () => {
      // Insert test data first
      const testData = Array.from({ length: 5000 }, (_, i) => ({
        index: i,
        category: i % 10,
        active: i % 2 === 0,
      }));

      await collection.insertMany(testData);

      const start = performance.now();
      const results = await collection.find({
        category: { $in: [1, 3, 5] },
        active: true,
      });
      const duration = performance.now() - start;

      expect(results.total).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete in < 1s

      console.log(
        `Query: ${duration.toFixed(2)}ms for ${results.total} results`
      );
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await collection.insert({ iteration: i, data: 'x'.repeat(1000) });
        if (i % 10 === 0) {
          collection.clearCache();
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
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

**Current Status**: No testing framework is currently configured. This is a critical gap that needs immediate attention.

### Recommended Testing Setup

**1. Choose and Configure Testing Framework**:

```bash
# Option A: Jest (most popular)
pnpm add -D jest @types/jest ts-jest

# Option B: Vitest (faster, Vite-based)
pnpm add -D vitest @vitest/ui

# Option C: Node.js built-in test runner (Node 18+)
# No additional dependencies needed
```

**2. Add Test Scripts to package.json**:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

**3. Create Jest Configuration** (`jest.config.js`):

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};
```

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

**Current Status**: No CI/CD pipeline is currently configured.

### Recommended GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

      - name: Build
        run: pnpm build

      # TODO: Add when tests are implemented
      # - name: Run tests
      #   run: pnpm test:ci

      - name: Test examples
        run: |
          pnpm example:basic
          pnpm example:query
          pnpm example:schema
          pnpm example:encryption

      # TODO: Add when tests are implemented
      # - name: Upload coverage
      #   uses: codecov/codecov-action@v3
      #   with:
      #     file: ./coverage/lcov.info

  publish:
    name: Publish
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      # TODO: Add automatic publishing logic
      # - name: Publish to npm
      #   run: pnpm publish --no-git-checks
      #   env:
      #     NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Additional CI/CD Enhancements

**Security Scanning** (`.github/workflows/security.yml`):

```yaml
name: Security

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
      - run: npm audit --audit-level=moderate

  codeql:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v2
        with:
          languages: typescript
      - uses: github/codeql-action/analyze@v2
```

## 📚 Resources

### Internal Documentation

**Current Status**: Documentation is primarily in README.md and this DEVELOPING.md file.

**Recommended Documentation Structure**:

```
docs/
├── API.md              # Complete API reference
├── ARCHITECTURE.md     # Detailed architecture guide
├── PERFORMANCE.md      # Performance optimization guide
├── SECURITY.md         # Security best practices
├── MIGRATION.md        # Migration guides between versions
├── EXAMPLES.md         # Extended examples and tutorials
└── TROUBLESHOOTING.md  # Common issues and solutions
```

**Current Documentation**:

- **README.md** - Main project documentation with examples
- **CONTRIBUTING.md** - Contribution guidelines and standards
- **DEVELOPING.md** - This file - internal development guide
- **docs/API.md** - Basic API reference (needs expansion)
- **examples/** - Working code examples for all features

### External Resources

- **TypeScript Handbook** - https://www.typescriptlang.org/docs/
- **Node.js Documentation** - https://nodejs.org/docs/
- **Jest Testing Framework** - https://jestjs.io/docs/

---

This guide should help you understand and contribute to NuboDB's development effectively! 🚀
