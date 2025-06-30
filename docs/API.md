# NuboDB API Reference

This document provides a comprehensive reference for all NuboDB APIs and interfaces.

## Table of Contents

- [Database](#database)
- [Collection](#collection)
- [QueryBuilder](#querybuilder)
- [Schema Validation](#schema-validation)
- [Encryption](#encryption)
- [Types](#types)
- [Errors](#errors)

## Database

### `createDatabase(options: DatabaseOptions): Promise<NuboDB>`

Creates a new database instance with the specified configuration.

#### Parameters

```typescript
interface DatabaseOptions {
  // Storage
  path?: string; // Database directory path (default: './nubodb')
  inMemory?: boolean; // Use in-memory storage (default: false)
  createIfMissing?: boolean; // Create database if it doesn't exist (default: true)

  // Encryption
  encrypt?: boolean; // Enable encryption (default: false)
  encryptionKey?: string; // Encryption key (required if encrypt: true)
  encryptionMethod?: string; // Encryption algorithm (default: 'aes-256-cbc')

  // Performance
  cacheDocuments?: boolean; // Enable document caching (default: true)
  maxCacheSize?: number; // Maximum cache size (default: 1000)
  enableIndexing?: boolean; // Enable automatic indexing (default: true)
  autoFlush?: boolean; // Auto-flush to disk (default: true)
  flushInterval?: number; // Flush interval in ms (default: 1000)

  // Validation
  schemaValidation?: 'strict' | 'warn' | 'ignore'; // Validation mode (default: 'warn')

  // Logging
  debug?: boolean; // Enable debug logging (default: false)
  logLevel?: 'error' | 'warn' | 'info' | 'debug'; // Log level (default: 'info')
}
```

#### Returns

Promise that resolves to a `NuboDB` instance.

#### Example

```typescript
const db = await createDatabase({
  path: './my-database',
  encrypt: true,
  encryptionKey: 'my-secret-key',
  debug: true,
});
```

### `NuboDB` Class

#### Methods

##### `open(): Promise<void>`

Opens the database and initializes storage.

##### `close(): Promise<void>`

Closes the database and flushes any pending writes.

##### `collection(name: string): Collection`

Gets or creates a collection with the specified name.

##### `createCollection(name: string, schema?: Schema, options?: CollectionOptions): Promise<Collection>`

Creates a new collection with optional schema and options.

##### `getStats(): Promise<DatabaseStats>`

Returns database statistics.

```typescript
interface DatabaseStats {
  collections: number;
  totalDocuments: number;
  totalSize: number;
  uptime: number;
}
```

##### `compact(): Promise<void>`

Compacts the database by removing deleted documents and optimizing storage.

##### `backup(path: string): Promise<void>`

Creates a backup of the database to the specified path.

##### `on(event: string, listener: Function): void`

Registers an event listener.

##### `off(event: string, listener: Function): void`

Removes an event listener.

#### Events

- `document:inserted` - Fired when a document is inserted
- `document:updated` - Fired when a document is updated
- `document:deleted` - Fired when a document is deleted
- `error` - Fired when an error occurs

## Collection

### `Collection` Class

Represents a collection of documents with full CRUD and query capabilities.

#### Methods

##### Document Operations

###### `insert(data: any): Promise<InsertResult>`

Inserts a single document.

```typescript
interface InsertResult {
  id: string;
  document: Document;
  success: boolean;
}
```

###### `insertMany(documents: any[]): Promise<BatchResult>`

Inserts multiple documents efficiently.

```typescript
interface BatchResult {
  insertedCount: number;
  documents: InsertResult[];
  errors: Error[];
}
```

###### `update(filter: Filter, updateData: any): Promise<UpdateResult>`

Updates documents matching the filter.

```typescript
interface UpdateResult {
  modifiedCount: number;
  success: boolean;
}
```

###### `upsert(filter: Filter, data: any): Promise<UpsertResult>`

Updates existing document or inserts new one.

```typescript
interface UpsertResult {
  id: string;
  document: Document;
  created: boolean;
}
```

###### `delete(filter: Filter): Promise<DeleteResult>`

Deletes documents matching the filter.

```typescript
interface DeleteResult {
  deletedCount: number;
  success: boolean;
}
```

##### Query Operations

###### `find(filter?: Filter, options?: QueryOptions): Promise<QueryResult>`

Finds documents matching the filter.

```typescript
interface QueryOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
  select?: string[];
}

interface QueryResult {
  documents: Document[];
  total: number;
  hasMore: boolean;
}
```

###### `findOne(filter: Filter): Promise<Document | null>`

Finds a single document matching the filter.

###### `findById(id: string): Promise<Document | null>`

Finds a document by its ID.

###### `count(filter?: Filter): Promise<number>`

Counts documents matching the filter.

###### `isEmpty(): Promise<boolean>`

Checks if the collection is empty.

##### QueryBuilder

###### `query(): QueryBuilder`

Returns a new QueryBuilder instance for fluent queries.

##### Utility Methods

###### `stats(): Promise<CollectionStats>`

Returns collection statistics.

```typescript
interface CollectionStats {
  totalDocuments: number;
  totalSize: number;
  cacheSize: number;
  indexes: number;
}
```

###### `clearCache(): void`

Clears the collection's cache.

###### `createIndex(options: IndexOptions): Promise<void>`

Creates an index for better query performance.

```typescript
interface IndexOptions {
  fields: Record<string, 1 | -1>;
  name?: string;
  unique?: boolean;
}
```

## QueryBuilder

### `QueryBuilder` Class

Provides a fluent interface for building complex queries.

#### Methods

##### Filtering

###### `where(field: string, operator: QueryOperator, value: any): QueryBuilder`

Adds a where condition.

###### `and(field: string, operator: QueryOperator, value: any): QueryBuilder`

Adds an AND condition.

###### `or(field: string, operator: QueryOperator, value: any): QueryBuilder`

Adds an OR condition.

##### Sorting

###### `sort(field: string, direction: 1 | -1): QueryBuilder`

Sorts results by field.

##### Pagination

###### `limit(count: number): QueryBuilder`

Limits the number of results.

###### `skip(count: number): QueryBuilder`

Skips the specified number of results.

##### Projection

###### `select(fields: string[]): QueryBuilder`

Selects only specified fields.

##### Execution

###### `execute(): Promise<QueryResult>`

Executes the query and returns results.

###### `findOne(): Promise<Document | null>`

Executes the query and returns a single document.

###### `count(): Promise<number>`

Executes the query and returns the count.

#### Query Operators

- `$eq` - Equal
- `$ne` - Not equal
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal
- `$in` - In array
- `$nin` - Not in array
- `$exists` - Field exists
- `$regex` - Regular expression match

#### Example

```typescript
const results = await collection
  .query()
  .where('age', '$gte', 18)
  .and('isActive', '$eq', true)
  .or('category', '$eq', 'admin')
  .sort('age', -1)
  .limit(10)
  .select(['name', 'email', 'age'])
  .execute();
```

## Schema Validation

### Schema Definition

```typescript
interface Schema {
  [fieldName: string]: SchemaField;
}

interface SchemaField {
  type:
    | 'string'
    | 'number'
    | 'boolean'
    | 'object'
    | 'array'
    | 'date'
    | 'buffer';
  required?: boolean;
  default?: any;
  unique?: boolean;
  index?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  validate?: (value: any) => boolean | string;
}
```

### Schema Options

```typescript
interface SchemaOptions {
  strict?: boolean; // Strict validation mode
  allowUnknown?: boolean; // Allow unknown fields
  stripUnknown?: boolean; // Remove unknown fields
}
```

### Example

```typescript
const userSchema = {
  name: {
    type: 'string',
    required: true,
    min: 2,
    max: 50,
  },
  email: {
    type: 'string',
    required: true,
    unique: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  age: {
    type: 'number',
    min: 0,
    max: 150,
    default: 18,
  },
  isActive: {
    type: 'boolean',
    default: true,
  },
  tags: {
    type: 'array',
    default: [],
  },
  category: {
    type: 'string',
    enum: ['admin', 'user', 'moderator'],
    default: 'user',
  },
};

const users = await db.createCollection('users', userSchema);
```

## Encryption

### Encryption Options

```typescript
interface EncryptionOptions {
  enabled: boolean;
  key: string;
  method: 'aes-256-cbc' | 'aes-256-gcm';
  saltRounds?: number;
}
```

### EncryptionManager

Handles encryption and decryption of documents.

#### Methods

###### `encrypt(data: any): Promise<string>`

Encrypts data and returns encrypted string.

###### `decrypt(encryptedData: string): Promise<any>`

Decrypts data and returns original object.

## Types

### Core Types

```typescript
type Document = {
  _id: string;
  [key: string]: any;
};

type Filter = {
  [field: string]: any | FilterOperator;
};

type FilterOperator = {
  [operator: string]: any;
};

type QueryOperator =
  | '$eq'
  | '$ne'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$in'
  | '$nin'
  | '$exists'
  | '$regex'
  | '$and'
  | '$or'
  | '$nor'
  | '$not';
```

### Result Types

```typescript
interface InsertResult {
  id: string;
  document: Document;
  success: boolean;
}

interface UpdateResult {
  modifiedCount: number;
  success: boolean;
}

interface DeleteResult {
  deletedCount: number;
  success: boolean;
}

interface QueryResult {
  documents: Document[];
  total: number;
  hasMore: boolean;
}

interface BatchResult {
  insertedCount: number;
  documents: InsertResult[];
  errors: Error[];
}
```

## Errors

### `DatabaseError` Class

Base error class for all NuboDB errors.

```typescript
class DatabaseError extends Error {
  constructor(message: string, code?: string);
  code: string;
}
```

### Error Types

- `ValidationError` - Schema validation failed
- `EncryptionError` - Encryption/decryption failed
- `StorageError` - Storage operation failed
- `QueryError` - Query execution failed
- `IndexError` - Index operation failed

### Error Handling

```typescript
try {
  await collection.insert(invalidData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.message);
  } else if (error instanceof DatabaseError) {
    console.log('Database error:', error.message);
  }
}
```

## Performance Tips

### Caching

- Enable caching for read-heavy workloads
- Monitor cache hit rates
- Clear cache when memory usage is high

### Indexing

- Create indexes for frequently queried fields
- Use compound indexes for complex queries
- Monitor index usage and performance

### Batch Operations

- Use `insertMany()` for bulk inserts
- Use batch updates for multiple documents
- Consider transaction-like operations for consistency

### Query Optimization

- Use field projection to limit returned data
- Use pagination for large result sets
- Avoid deep object queries when possible

## Best Practices

### Data Modeling

- Design schemas with validation in mind
- Use appropriate field types
- Consider indexing strategy early

### Error Handling

- Always handle database errors gracefully
- Validate data before insertion
- Use transactions for critical operations

### Security

- Use strong encryption keys
- Validate all user inputs
- Implement proper access controls

### Performance

- Monitor database statistics
- Optimize queries based on usage patterns
- Regular database maintenance (compaction)

---

For more examples and usage patterns, see the [examples](./examples/) directory.
