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
- **🔖 Collection Aliases** - Create shortcuts and alternate names for collections
- **✅ Database Validation** - Built-in health checks and integrity validation
- **🚀 Query Caching** - Automatic query result caching for improved performance
- **🔧 Field Validators** - Pre-built validators for common field types (email, URL, etc.)

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

console.log('Inserted with ID:', result.id);

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

### Core Features
- **[Basic Usage](./examples/basic-usage.js)** - Fundamental operations
- **[Query Builder](./examples/query-builder.js)** - Advanced querying
- **[Schema Validation](./examples/schema-validation.js)** - Data validation
- **[Modular Architecture](./examples/modular-architecture.js)** - Custom collections
- **[Encryption](./examples/encryption.js)** - Data encryption
- **[Performance](./examples/performance.js)** - Optimization features

### New Features (v1.3+)
- **[Collection Aliases](./examples/collection-aliases.js)** - Flexible collection naming and shortcuts
- **[Database Health](./examples/database-health.js)** - Health monitoring and validation
- **[Query Caching](./examples/query-caching.js)** - Automatic query result caching
- **[Field Validation](./examples/field-validation.js)** - Enhanced field validators and createField helpers
- **[Comprehensive Features](./examples/comprehensive-features.js)** - All new features working together

### Performance & Benchmarks
- **[Performance Benchmark](./examples/performance-benchmark.js)** - Detailed performance testing

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

  // Performance Optimization
  cacheDocuments: true, // Enable document caching (default: true)
  maxCacheSize: 1000, // Max documents in cache (default: 1000)
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

### Enhanced Field Validation

NuboDB now includes built-in validators and field creators for common data types:

```typescript
import { createField, validators } from 'nubodb';

// Using pre-built field creators
const userSchema = {
  email: createField.email(true), // Required email field
  website: createField.url(false, 'https://example.com'), // Optional URL with default
  phone: createField.phone(true), // Required phone number
  userId: createField.uuid(true), // Required UUID field

  // String fields with constraints
  username: createField.string({
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
  }),

  // Number fields with constraints
  age: createField.number({
    required: true,
    min: 0,
    max: 120,
    positive: true,
  }),

  // Using individual validators
  companyEmail: {
    type: 'string',
    required: true,
    validate: validators.email,
  },

  password: {
    type: 'string',
    required: true,
    validate: validators.minLength(8),
  },

  score: {
    type: 'number',
    validate: validators.range(0, 100),
  },
};

const users = await db.createCollection('users', userSchema);
```

#### Available Validators

```typescript
// Built-in validators
validators.email(value)           // Email format validation
validators.url(value)             // URL format validation
validators.phone(value)           // Phone number validation
validators.uuid(value)            // UUID format validation
validators.positive(value)        // Positive numbers only
validators.nonNegative(value)     // Non-negative numbers
validators.minLength(min)(value)  // Minimum string length
validators.maxLength(max)(value)  // Maximum string length
validators.range(min, max)(value) // Number range validation

// Field creators with validation
createField.email(required?, defaultValue?)
createField.url(required?, defaultValue?)
createField.phone(required?, defaultValue?)
createField.uuid(required?, defaultValue?)
createField.string(options)  // { required?, minLength?, maxLength?, pattern?, default? }
createField.number(options)  // { required?, min?, max?, positive?, default? }
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
  encryptionMethod: 'aes-256-cbc', // Only aes-256-cbc is currently implemented
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
- Keys are derived using SHA-256 hashing

```typescript
// Production encryption setup
const db = await createDatabase({
  path: process.env.DB_PATH,
  encrypt: true,
  encryptionKey: process.env.DB_ENCRYPTION_KEY, // From secure environment
  encryptionMethod: 'aes-256-cbc', // Currently supported method
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

## Collection Aliases

Create shortcuts and alternate names for collections to improve code readability and maintain backward compatibility:

```typescript
// Create aliases for collections
db.createAlias('users', 'user_accounts');
db.createAlias('posts', 'blog_posts');
db.createAlias('products', 'inventory_items');

// Use aliases just like regular collection names
const users = db.collection('users'); // Same as db.collection('user_accounts')
const posts = db.collection('posts'); // Same as db.collection('blog_posts')

// Insert data using alias
await users.insert({
  name: 'John Doe',
  email: 'john@example.com',
});

// Query using alias
const allUsers = await users.find();
const userCount = await posts.count();

// Check if a name is an alias
if (db.isAlias('users')) {
  console.log('users is an alias for:', db.getAliases()['users']);
}

// Get all aliases
const aliases = db.getAliases();
console.log('All aliases:', aliases);
// Output: { users: 'user_accounts', posts: 'blog_posts', products: 'inventory_items' }

// Remove an alias
const removed = db.removeAlias('users');
if (removed) {
  console.log('Alias removed successfully');
}

// Practical use cases
// 1. Backward compatibility
db.createAlias('oldCollectionName', 'newCollectionName');

// 2. Shorter names for frequently used collections
db.createAlias('u', 'users');
db.createAlias('p', 'products');

// 3. Environment-specific collections
if (process.env.NODE_ENV === 'test') {
  db.createAlias('users', 'test_users');
  db.createAlias('products', 'test_products');
}
```

## Database Health & Validation

Monitor database integrity and perform health checks:

```typescript
// Validate database integrity
const health = await db.validate();

if (health.isValid) {
  console.log('Database is healthy ✅');
} else {
  console.log('Database issues found ⚠️');
  console.log('Issues:', health.issues);

  // Check specific collection issues
  for (const [collectionName, stats] of Object.entries(health.collections)) {
    if (stats.issues.length > 0) {
      console.log(`Collection '${collectionName}' issues:`, stats.issues);
      console.log(`Documents: ${stats.documents}`);
    }
  }
}

// Check if database path is accessible
const isAccessible = await db.isAccessible();
if (!isAccessible) {
  console.error('Database path is not accessible');
}

// Example health check output
/*
{
  isValid: false,
  issues: [
    "Collection 'users': Cache-storage mismatch detected"
  ],
  collections: {
    users: {
      documents: 150,
      issues: ['Cache-storage mismatch detected']
    },
    products: {
      documents: 500,
      issues: []
    }
  }
}
*/

// Use in application monitoring
setInterval(async () => {
  const health = await db.validate();
  if (!health.isValid) {
    // Send alert, log error, etc.
    console.error('Database health check failed:', health.issues);
  }
}, 60000); // Check every minute
```

## Query Caching

NuboDB automatically caches query results for improved performance:

```typescript
// Query caching is automatic and transparent
const users = db.collection('users');

// First query - cache miss, executes full query
const result1 = await users.find({ status: 'active' });
console.log('First query took:', Date.now() - start1, 'ms');

// Second identical query - cache hit, returns instantly
const start2 = Date.now();
const result2 = await users.find({ status: 'active' });
console.log('Cached query took:', Date.now() - start2, 'ms'); // Much faster!

// Cache TTL is 5 seconds by default
// After 5 seconds, the query will be re-executed and cached again

// Manual cache management
db.clearCaches(); // Clear all caches (document + query)

// Cache works with all query options
const cachedPaginated = await users.find(
  { age: { $gte: 18 } },
  { limit: 10, sort: { name: 1 } }
);

// Different queries have separate cache entries
const adults = await users.find({ age: { $gte: 18 } }); // Cached separately
const seniors = await users.find({ age: { $gte: 65 } }); // Cached separately

// Query builder results are also cached
const builderResult = await users
  .query()
  .where('status', '$eq', 'active')
  .limit(10)
  .execute(); // This result is cached too

// Cache is automatically invalidated when documents are modified
await users.insert({ name: 'New User', status: 'active' });
// Next query for active users will be a cache miss (as expected)

// Performance monitoring
const collection = db.collection('products');

console.time('first-query');
await collection.find({ category: 'electronics' });
console.timeEnd('first-query'); // ~50ms

console.time('cached-query');
await collection.find({ category: 'electronics' });
console.timeEnd('cached-query'); // ~0.1ms (500x faster!)
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
db.collection<T>(name, options?)   // Get/create collection (supports aliases)
await db.createCollection<T>(name, schema?, options?) // Explicitly create
await db.dropCollection(name)      // Delete collection
await db.listCollections()         // List all collections
db.hasCollection(name)              // Check if exists

// Collection aliases (NEW!)
db.createAlias(alias, collectionName)  // Create collection alias
db.removeAlias(alias)                  // Remove alias
db.getAliases()                        // Get all aliases
db.isAlias(name)                       // Check if name is alias

// Database health & validation (NEW!)
await db.validate()                // Database integrity check
await db.isAccessible()            // Check if database path is accessible

// Utilities
await db.getStats()                // Database statistics
db.getOptions()                     // Current configuration
db.clearCaches()                    // Clear all caches
await db.compact()                  // Optimize storage
await db.backup(path)               // Backup (stub - not fully implemented)
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
3. **Leverage Query Caching**: Identical queries are automatically cached for 5 seconds
4. **Batch Operations**: Use `insertMany()` for bulk inserts
5. **Limit Results**: Use `limit()` and `skip()` for pagination
6. **Project Fields**: Use `select()` to return only needed fields
7. **Use Aliases**: Create short aliases for frequently accessed collections
8. **Monitor Health**: Use `validate()` to catch performance issues early
9. **Clear Caches**: Use `clearCaches()` when memory usage is high
10. **Monitor Stats**: Use `stats()` to monitor performance metrics

## Support

- **Documentation**: [Full API Reference](./docs/API.md)
- **Examples**: [Code Examples](./examples/)
- **Issues**: [GitHub Issues](https://github.com/maybeizen/nubodb/issues)
- **Discussions**: [GitHub Discussions](https://github.com/maybeizen/nubodb/discussions)

---

**Made with ❤️ by maybeizen**
