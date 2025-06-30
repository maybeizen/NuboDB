# NuboDB

A modern, fast, and feature-rich NoSQL database for Node.js with TypeScript support, encryption, schema validation, and a modular architecture.

## 🚀 Features

- **🔐 Built-in Encryption** - AES-256 encryption for sensitive data
- **📋 Schema Validation** - Comprehensive validation with custom rules
- **🔍 Advanced Querying** - MongoDB-like query syntax with QueryBuilder
- **⚡ High Performance** - Caching, indexing, and newly optimized storage & query engine
- **🏗️ Modular Architecture** - Extensible and maintainable codebase
- **📊 Real-time Statistics** - Monitor database and collection performance
- **🛡️ Type Safety** - Full TypeScript support with type definitions
- **🔄 Event System** - Listen to database events
- **📦 Zero Dependencies** - Lightweight and self-contained

## 📦 Installation

```bash
npm install nubodb
```

## 🎯 Quick Start

```javascript
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

console.log('Inserted:', result.document);

// Find documents
const allUsers = await users.find();
console.log('All users:', allUsers.documents);

await db.close();
```

## 📚 Examples

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

## 🔧 Configuration

### Database Options

```javascript
const db = await createDatabase({
  // Storage
  path: './database', // Database directory
  inMemory: false, // Use in-memory storage

  // Encryption
  encrypt: true, // Enable encryption
  encryptionKey: 'your-secret-key', // Encryption key
  encryptionMethod: 'aes-256-cbc', // Encryption algorithm

  // Performance
  cacheDocuments: true, // Enable caching
  maxCacheSize: 1000, // Max cache size
  enableIndexing: true, // Enable auto-indexing

  // Validation
  schemaValidation: 'strict', // 'strict' | 'warn' | 'ignore'

  // Logging
  debug: true, // Enable debug logging
  logLevel: 'info', // 'error' | 'warn' | 'info' | 'debug'
});
```

### Schema Definition

```javascript
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
    index: true,
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

## 🔍 Querying

### Basic Queries

```javascript
// Find all documents
const allUsers = await users.find();

// Find with filter
const activeUsers = await users.find({ isActive: true });

// Find one document
const user = await users.findOne({ email: 'john@example.com' });

// Find by ID
const userById = await users.findById('document-id');

// Count documents
const count = await users.count({ age: { $gte: 18 } });
```

### Advanced Queries with QueryBuilder

```javascript
// Fluent query builder
const results = await users
  .query()
  .where('age', '$gte', 18)
  .and('isActive', '$eq', true)
  .or('category', '$eq', 'admin')
  .sort('age', -1)
  .limit(10)
  .select(['name', 'email', 'age'])
  .execute();

// Find one with query builder
const user = await users
  .query()
  .where('email', '$eq', 'john@example.com')
  .findOne();

// Count with query builder
const count = await users.query().where('isActive', '$eq', true).count();
```

### Query Operators

- **Comparison**: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`
- **Array**: `$in`, `$nin`
- **Logical**: `$and`, `$or`, `$nor`, `$not`
- **Existence**: `$exists`
- **Pattern**: `$regex`

## 🏗️ Modular Architecture

NuboDB uses a modular architecture for better maintainability and extensibility:

### Core Classes

- **`BaseCollection`** - Foundation class with core functionality
- **`DocumentOperations`** - Handles insert, update, delete operations
- **`QueryOperations`** - Handles find, filter, sort operations
- **`Collection`** - Main facade class that combines all operations

### Custom Collections

```javascript
import { QueryOperations, DocumentOperations, Collection } from 'nubodb';

// Read-only collection
class ReadOnlyCollection extends QueryOperations {
  async insert() {
    throw new Error('Read-only collection: insert not allowed');
  }
}

// Write-only collection
class WriteOnlyCollection extends DocumentOperations {
  async find() {
    throw new Error('Write-only collection: find not allowed');
  }
}

// Custom collection with validation
class ValidatedCollection extends Collection {
  addValidator(field, validator) {
    this.validators.set(field, validator);
  }

  async insert(data) {
    // Run custom validators
    for (const [field, validator] of this.validators) {
      if (!validator(data[field])) {
        throw new Error(`Validation failed for field: ${field}`);
      }
    }
    return super.insert(data);
  }
}
```

## 🔐 Encryption

```javascript
// Create encrypted database
const db = await createDatabase({
  path: './encrypted-db',
  encrypt: true,
  encryptionKey: 'your-secret-key',
  encryptionMethod: 'aes-256-cbc',
});

// All data is automatically encrypted/decrypted
await users.insert({
  name: 'John Doe',
  creditCard: '4111-1111-1111-1111',
  ssn: '123-45-6789',
});
```

## 📊 Performance & Monitoring

```javascript
// Get collection statistics
const stats = await users.stats();
console.log('Collection stats:', stats);

// Get database statistics
const dbStats = await db.getStats();
console.log('Database stats:', dbStats);

// Create indexes for better performance
await users.createIndex({
  fields: { email: 1 },
  unique: true,
});

// Clear cache
users.clearCache();

// Compact database
await db.compact();
```

## 🎧 Event System

```javascript
// Listen to database events
db.on('document:inserted', (collection, document) => {
  console.log(`Document inserted in ${collection}:`, document._id);
});

db.on('document:updated', (collection, document) => {
  console.log(`Document updated in ${collection}:`, document._id);
});

db.on('document:deleted', (collection, documentId) => {
  console.log(`Document deleted in ${collection}:`, documentId);
});

db.on('error', error => {
  console.error('Database error:', error.message);
});
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Full API Reference](./docs/API.md)
- **Examples**: [Code Examples](./examples/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/nubodb/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/nubodb/discussions)

## 🔄 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.

---

**Made with ❤️ by maybeizen**
