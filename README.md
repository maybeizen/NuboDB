# NuboDB

A modern, fast, and feature-rich NoSQL database for Node.js with TypeScript support, encryption, schema validation, and a modular architecture.

## Features

- **🔐 Built-in Encryption** - AES-256 encryption for sensitive data
- **📋 Schema Validation** - Comprehensive validation with custom rules
- **🔍 Advanced Querying** - MongoDB-like query syntax with QueryBuilder
- **⚡ High Performance** - Caching, indexing, and newly optimized storage & query engine
- **🏗️ Modular Architecture** - Extensible and maintainable codebase
- **📊 Real-time Statistics** - Monitor database and collection performance
- **🛡️ Type Safety** - Full TypeScript support with type definitions
- **🔄 Event System** - Listen to database events
- **📦 Zero Dependencies** - Lightweight and self-contained

## Installation

```bash
npm install nubodb
```

## Quick Start

```typescript
import { createDatabase } from 'nubodb';

// Create and open database
const db = await createDatabase({
  path: './my-database',
  debug: true,
});

await db.open();

// Get a collection
const users = db.collection('users');

// Insert a document
const result = await users.insert({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
});

console.log('Inserted with ID:', result.insertedId);

// Find documents
const allUsers = await users.find();
console.log('Found', allUsers.total, 'users:', allUsers.documents);

// Query with conditions
const adults = await users.find({ age: { $gte: 18 } });
console.log('Adult users:', adults.documents.length);

await db.close();
```

## Examples

Check out the comprehensive examples in the `/examples` folder:

- **[Basic Usage](./examples/basic-usage.js)** - Fundamental operations
- **[Query Builder](./examples/query-builder.js)** - Advanced querying
- **[Schema Validation](./examples/schema-validation.js)** - Data validation
- **[Modular Architecture](./examples/modular-architecture.js)** - Custom collections
- **[Encryption](./examples/encryption.js)** - Data encryption
- **[Performance](./examples/performance.js)** - Optimization features

Run any example:

```bash
node examples/basic-usage.js
```

## Configuration

### Database Options

```typescript
import type { DatabaseOptions } from 'nubodb';

const options: DatabaseOptions = {
  // Storage Configuration
  path: './database', // Database directory (default: './nubodb')
  inMemory: false, // Use in-memory storage (default: false)
  createIfMissing: true, // Create directory if missing (default: true)

  // Encryption Settings
  encrypt: true, // Enable data encryption (default: false)
  encryptionKey: 'your-secret-key', // Required if encrypt is true
  encryptionMethod: 'aes-256-cbc', // Algorithm (default: 'aes-256-cbc')
  encryptionKDF: 'pbkdf2', // Key derivation function (default: 'pbkdf2')

  // Performance Optimization
  cacheDocuments: true, // Enable document caching (default: true)
  maxCacheSize: 1000, // Max documents in cache (default: 1000)
  enableIndexing: true, // Auto-create indexes (default: true)
  autoFlush: true, // Auto-save changes (default: true)
  flushInterval: 1000, // Auto-save interval ms (default: 1000)

  // Schema Validation
  schemaValidation: 'strict', // Validation mode (default: 'warn')
  schemaPath: './schemas', // Schema files directory

  // Development & Debugging
  debug: true, // Enable debug logging (default: false)
  logLevel: 'info', // Log verbosity (default: 'info')
};

const db = await createDatabase(options);
```

### Schema Definition

```typescript
import type { Schema } from 'nubodb';

const userSchema: Schema = {
  name: {
    type: 'string',
    required: true,
    min: 2, // Minimum length
    max: 50, // Maximum length
  },
  email: {
    type: 'string',
    required: true,
    unique: true, // Enforce uniqueness
    index: true, // Create index for fast queries
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Email validation
  },
  age: {
    type: 'number',
    min: 0, // Minimum value
    max: 150, // Maximum value
    default: 18, // Default value if not provided
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
    enum: ['admin', 'user', 'moderator'], // Allowed values only
    default: 'user',
  },
  profile: {
    type: 'object',
    default: {},
  },
  createdAt: {
    type: 'date',
    default: () => new Date(), // Dynamic default
  },
  // Custom validation function
  username: {
    type: 'string',
    required: true,
    validate: (value: string) => {
      if (value.length < 3) return 'Username must be at least 3 characters';
      if (!/^[a-zA-Z0-9_]+$/.test(value))
        return 'Username can only contain letters, numbers, and underscores';
      return true;
    },
  },
};

// Create collection with schema
const users = await db.createCollection('users', userSchema);

// TypeScript interface for type safety
interface User {
  name: string;
  email: string;
  age?: number;
  isActive?: boolean;
  tags?: string[];
  category?: 'admin' | 'user' | 'moderator';
  profile?: object;
  username: string;
}

const typedUsers = db.collection<User>('users');
```

## Querying

### Basic Queries

```typescript
// Find all documents
const allUsers = await users.find();
console.log(`Found ${allUsers.total} users:`, allUsers.documents);

// Find with filter
const activeUsers = await users.find({ isActive: true });

// Find with advanced filters
const adultsInCategory = await users.find({
  age: { $gte: 18 }, // Age 18 or older
  category: { $in: ['admin', 'moderator'] }, // Specific categories
  isActive: true, // Active users only
});

// Find one document
const user = await users.findOne({ email: 'john@example.com' });
if (user) {
  console.log('Found user:', user.name);
}

// Find by ID
const userById = await users.findById('document-id');

// Count documents
const adultCount = await users.count({ age: { $gte: 18 } });
const totalUsers = await users.count(); // Count all

// Check if collection is empty
const isEmpty = await users.isEmpty();

// Pagination with options
const page1 = await users.find(
  {},
  {
    skip: 0,
    limit: 10,
    sort: { name: 1 }, // Sort by name ascending
    projection: { name: 1, email: 1 }, // Only include these fields
  }
);
```

### Advanced Queries with QueryBuilder

```typescript
// Complex query with fluent API
const results = await users
  .query()
  .where('age', '$gte', 18) // Adults only
  .and('isActive', '$eq', true) // Active users
  .or('category', '$eq', 'admin') // OR admin users (any age)
  .sort('createdAt', -1) // Newest first
  .limit(10) // First 10 results
  .skip(20) // Skip first 20 (page 3)
  .select(['name', 'email', 'age']) // Only these fields
  .execute();

console.log(`Query returned ${results.documents.length} users`);

// Find one with query builder
const user = await users
  .query()
  .where('email', '$eq', 'john@example.com')
  .findOne();

// Count with conditions
const activeCount = await users
  .query()
  .where('isActive', '$eq', true)
  .and('age', '$gte', 18)
  .count();

// Check existence
const hasAdmins = await users
  .query()
  .where('category', '$eq', 'admin')
  .exists();

// Find and update in one operation
const updatedUser = await users
  .query()
  .where('_id', '$eq', 'user-123')
  .findOneAndUpdate({ lastLogin: new Date() });

// Find and delete
const deletedUser = await users
  .query()
  .where('isActive', '$eq', false)
  .and('lastLogin', '$lt', new Date('2023-01-01'))
  .findOneAndDelete();
```

### Query Operators

- **Comparison**: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`
- **Array**: `$in`, `$nin`
- **Logical**: `$and`, `$or`, `$nor`, `$not`
- **Existence**: `$exists`
- **Pattern**: `$regex`, `$text`

## Encryption

NuboDB provides built-in AES-256 encryption for sensitive data protection:

```typescript
// Create encrypted database
const secureDb = await createDatabase({
  path: './encrypted-db',
  encrypt: true,
  encryptionKey: 'your-strong-secret-key-here',
  encryptionMethod: 'aes-256-cbc', // or 'aes-256-gcm', 'chacha20-poly1305'
  encryptionKDF: 'pbkdf2', // or 'scrypt', 'argon2'
});

await secureDb.open();

const sensitiveData = secureDb.collection('sensitive');

// All data is automatically encrypted before storage
// and decrypted when retrieved
await sensitiveData.insert({
  name: 'John Doe',
  creditCard: '4111-1111-1111-1111',
  ssn: '123-45-6789',
  medicalRecord: 'Confidential patient data...',
  apiKeys: {
    stripe: 'sk_test_...',
    aws: 'AKIA...',
  },
});

// Data is transparently decrypted when queried
const user = await sensitiveData.findOne({ name: 'John Doe' });
console.log('Retrieved data:', user); // Decrypted automatically

// File on disk is encrypted - cannot be read without the key
```

### Encryption Best Practices

- Use a strong, unique encryption key (32+ characters)
- Store the encryption key securely (environment variables, key management service)
- Consider key rotation for production applications
- AES-256-GCM provides both confidentiality and integrity
- Argon2 KDF offers the strongest key derivation

```typescript
// Production encryption setup
const db = await createDatabase({
  path: process.env.DB_PATH,
  encrypt: true,
  encryptionKey: process.env.DB_ENCRYPTION_KEY, // From secure environment
  encryptionMethod: 'aes-256-gcm', // Best for new applications
  encryptionKDF: 'argon2', // Strongest KDF
});
```

## Event System

NuboDB provides a comprehensive event system for monitoring database operations:

```typescript
// Database-level events
db.on('collection:created', collectionName => {
  console.log(`New collection created: ${collectionName}`);
});

db.on('collection:dropped', collectionName => {
  console.log(`Collection dropped: ${collectionName}`);
});

db.on('collection:accessed', collectionName => {
  console.log(`Collection accessed: ${collectionName}`);
});

db.on('error', error => {
  console.error('Database error:', error.message);
  // Implement error handling, alerting, etc.
});

// Document operation events (if implemented)
// Note: These events may not be available in the current version
// but represent the intended event system design

/*
db.on('document:inserted', (collectionName, document) => {
  console.log(`Document inserted in ${collectionName}:`, document._id);
  // Trigger webhooks, update search indexes, etc.
});

db.on('document:updated', (collectionName, document) => {
  console.log(`Document updated in ${collectionName}:`, document._id);
  // Cache invalidation, audit logging, etc.
});

db.on('document:deleted', (collectionName, documentId) => {
  console.log(`Document deleted in ${collectionName}:`, documentId);
  // Cleanup related data, update counters, etc.
});

db.on('query:executed', (collectionName, filter, results) => {
  console.log(`Query on ${collectionName} returned ${results.length} results`);
  // Performance monitoring, query optimization analysis
});
*/

// Remove event listeners
const errorHandler = error => console.error(error);
db.on('error', errorHandler);

// Later...
db.off('error', errorHandler);

// One-time event listeners
db.once('collection:created', name => {
  console.log(`First collection created: ${name}`);
});
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## API Reference

### Core Classes

- **`NuboDB`** - Main database instance
- **`Collection<T>`** - Collection operations (CRUD, queries)
- **`QueryBuilder<T>`** - Fluent query builder
- **`FileStorage`** - File-based storage engine
- **`EncryptionManager`** - Data encryption/decryption

### Key Methods

#### Database Operations

```typescript
// Database lifecycle
await db.open()                    // Initialize database
await db.close()                   // Close and cleanup
db.isDatabaseOpen()                 // Check if open

// Collection management
db.collection<T>(name, options?)   // Get/create collection
await db.createCollection<T>(name, schema?, options?) // Explicitly create
await db.dropCollection(name)      // Delete collection
await db.listCollections()         // List all collections
db.hasCollection(name)              // Check if exists

// Utilities
await db.getStats()                // Database statistics
db.getOptions()                     // Current configuration
db.clearCaches()                    // Clear all caches
await db.compact()                  // Optimize storage
```

#### Collection Operations

```typescript
// CRUD operations
await collection.insert(data)                    // Insert document
await collection.insertMany(documents)           // Bulk insert
await collection.update(filter, updateData)      // Update matching
await collection.upsert(filter, updateData)      // Update or insert
await collection.delete(filter)                  // Delete matching
await collection.deleteOne(filter)               // Delete first match

// Query operations
await collection.find(filter?, options?)         // Find documents
await collection.findOne(filter?)                // Find first match
await collection.findById(id)                    // Find by ID
await collection.count(filter?)                  // Count documents
await collection.isEmpty()                       // Check if empty

// Advanced features
collection.query()                               // Start query builder
await collection.createIndex(definition)         // Create index
collection.clearCache()                          // Clear cache
await collection.stats()                         // Collection stats
```

## Performance Tips

1. **Use Indexes**: Create indexes on frequently queried fields
2. **Enable Caching**: Keep `cacheDocuments: true` for better read performance
3. **Batch Operations**: Use `insertMany()` for bulk inserts
4. **Limit Results**: Use `limit()` and `skip()` for pagination
5. **Project Fields**: Use `select()` to return only needed fields
6. **Monitor Stats**: Use `stats()` to monitor performance metrics

## Support

- **Documentation**: [Full API Reference](./docs/API.md)
- **Examples**: [Code Examples](./examples/)
- **Issues**: [GitHub Issues](https://github.com/maybeizen/nubodb/issues)
- **Discussions**: [GitHub Discussions](https://github.com/maybeizen/nubodb/discussions)

---

**Made with ❤️ by maybeizen**
