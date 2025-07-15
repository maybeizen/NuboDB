import {
  createDatabase,
  BaseCollection,
  DocumentOperations,
  QueryOperations,
  Collection,
} from '../dist/index.js';

async function modularArchitectureExample() {
  console.log('=== NuboDB Modular Architecture Example ===\n');

  const db = await createDatabase({
    path: './examples/modular-db',
    debug: true,
  });

  await db.open();
  console.log('✅ Database opened');

  // Get storage instance for custom collections
  const { FileStorage } = await import('../src/storage/FileStorage.js');
  const storage = new FileStorage('./examples/modular-db');

  // Example 1: Read-only collection (only query operations)
  console.log('1. Creating Read-Only Collection:');
  class ReadOnlyCollection extends QueryOperations {
    constructor(name, storage, options = {}) {
      super(name, storage, options);
    }

    // Override to prevent modifications
    async insert() {
      throw new Error('Read-only collection: insert not allowed');
    }

    async update() {
      throw new Error('Read-only collection: update not allowed');
    }

    async delete() {
      throw new Error('Read-only collection: delete not allowed');
    }
  }

  const readOnlyUsers = new ReadOnlyCollection('readonly-users', storage, {});

  // This will work
  const queryResult = await readOnlyUsers.find();
  console.log('   ✅ Query operation works:', queryResult.total, 'documents');

  // This will throw an error
  try {
    await readOnlyUsers.insert({ name: 'Test' });
  } catch (error) {
    console.log('   ✅ Insert blocked:', error.message);
  }

  // Example 2: Write-only collection (only document operations)
  console.log('\n2. Creating Write-Only Collection:');
  class WriteOnlyCollection extends DocumentOperations {
    constructor(name, storage, options = {}) {
      super(name, storage, options);
    }

    // Override to prevent queries
    async find() {
      throw new Error('Write-only collection: find not allowed');
    }

    async findOne() {
      throw new Error('Write-only collection: findOne not allowed');
    }
  }

  const writeOnlyUsers = new WriteOnlyCollection(
    'writeonly-users',
    storage,
    {}
  );

  // This will work
  const insertResult = await writeOnlyUsers.insert({
    name: 'Write User',
    age: 25,
  });
  console.log('   ✅ Insert operation works:', insertResult.id);

  // This will throw an error
  try {
    await writeOnlyUsers.find();
  } catch (error) {
    console.log('   ✅ Query blocked:', error.message);
  }

  // Example 3: Custom collection with specific behavior
  console.log('\n3. Creating Custom Cached Collection:');
  class CachedCollection extends QueryOperations {
    constructor(name, storage, options = {}) {
      super(name, storage, options);
      this.customCache = new Map();
    }

    async findWithCustomCache(filter) {
      const cacheKey = JSON.stringify(filter);

      if (this.customCache.has(cacheKey)) {
        console.log('   🔄 Returning from custom cache');
        return this.customCache.get(cacheKey);
      }

      console.log('   📥 Fetching from database');
      const result = await this.find(filter);
      this.customCache.set(cacheKey, result);

      return result;
    }

    clearCustomCache() {
      this.customCache.clear();
      console.log('   🗑️ Custom cache cleared');
    }
  }

  const cachedUsers = new CachedCollection('cached-users', storage, {});

  // Insert some data first
  const docOps = new DocumentOperations('cached-users', storage, {});
  await docOps.insertMany([
    { name: 'Cache User 1', age: 25 },
    { name: 'Cache User 2', age: 30 },
    { name: 'Cache User 3', age: 35 },
  ]);

  // Test custom caching
  const result1 = await cachedUsers.findWithCustomCache({ age: { $gte: 30 } });
  const result2 = await cachedUsers.findWithCustomCache({ age: { $gte: 30 } }); // Should use cache
  console.log(
    '   ✅ Custom cache working, results:',
    result1.total,
    'documents'
  );

  // Example 4: Performance monitoring collection
  console.log('\n4. Creating Performance Monitoring Collection:');
  class MonitoredCollection extends Collection {
    constructor(name, storage, options = {}) {
      super(name, storage, options);
      this.operationCounts = {
        insert: 0,
        find: 0,
        update: 0,
        delete: 0,
      };
    }

    async insert(data) {
      this.operationCounts.insert++;
      console.log(`   📊 Insert operation #${this.operationCounts.insert}`);
      return super.insert(data);
    }

    async find(filter, options) {
      this.operationCounts.find++;
      console.log(`   📊 Find operation #${this.operationCounts.find}`);
      return super.find(filter, options);
    }

    async update(filter, updateData) {
      this.operationCounts.update++;
      console.log(`   📊 Update operation #${this.operationCounts.update}`);
      return super.update(filter, updateData);
    }

    async delete(filter) {
      this.operationCounts.delete++;
      console.log(`   📊 Delete operation #${this.operationCounts.delete}`);
      return super.delete(filter);
    }

    getOperationStats() {
      return { ...this.operationCounts };
    }
  }

  const monitoredUsers = new MonitoredCollection(
    'monitored-users',
    storage,
    {}
  );

  // Test monitored operations
  await monitoredUsers.insert({ name: 'Monitored User', age: 25 });
  await monitoredUsers.find({ age: { $gte: 20 } });
  await monitoredUsers.update({ name: 'Monitored User' }, { age: 26 });

  const stats = monitoredUsers.getOperationStats();
  console.log('   ✅ Operation stats:', stats);

  // Example 5: Custom collection with validation
  console.log('\n5. Creating Custom Validation Collection:');
  class ValidatedCollection extends Collection {
    constructor(name, storage, options = {}) {
      super(name, storage, options);
      this.validators = new Map();
    }

    addValidator(field, validator) {
      this.validators.set(field, validator);
    }

    async insert(data) {
      // Run custom validators
      for (const [field, validator] of this.validators) {
        if (data[field] !== undefined && !validator(data[field])) {
          throw new Error(`Validation failed for field: ${field}`);
        }
      }

      return super.insert(data);
    }
  }

  const validatedUsers = new ValidatedCollection(
    'validated-users',
    storage,
    {}
  );
  validatedUsers.addValidator('age', age => age >= 0 && age <= 150);
  validatedUsers.addValidator('email', email => email.includes('@'));

  // Test custom validation
  try {
    await validatedUsers.insert({
      name: 'Valid User',
      age: 25,
      email: 'valid@example.com',
    });
    console.log('   ✅ Valid user inserted');
  } catch (error) {
    console.log('   ❌ Validation error:', error.message);
  }

  try {
    await validatedUsers.insert({
      name: 'Invalid User',
      age: -5,
      email: 'invalid',
    });
  } catch (error) {
    console.log('   ✅ Validation blocked invalid data:', error.message);
  }

  // Example 6: Using modular classes directly
  console.log('\n6. Using Modular Classes Directly:');

  const documentOps = new DocumentOperations('direct-users', storage, {});
  const queryOps = new QueryOperations('direct-users', storage, {});

  // Insert using document operations
  await documentOps.insert({ name: 'Direct User', age: 30 });
  console.log('   ✅ Document inserted via DocumentOperations');

  // Query using query operations
  const directResults = await queryOps.find({ age: { $gte: 25 } });
  console.log(
    '   ✅ Query executed via QueryOperations:',
    directResults.total,
    'documents'
  );

  // Example 7: Extending BaseCollection for custom behavior
  console.log('\n7. Extending BaseCollection:');
  class CustomBaseCollection extends BaseCollection {
    constructor(name, storage, options = {}) {
      super(name, storage, options);
      this.customFeatures = [];
    }

    addCustomFeature(feature) {
      this.customFeatures.push(feature);
    }

    getCustomFeatures() {
      return [...this.customFeatures];
    }

    async customOperation() {
      console.log('   🔧 Custom operation executed');
      return { success: true, features: this.customFeatures };
    }
  }

  const customCollection = new CustomBaseCollection(
    'custom-collection',
    storage,
    {}
  );
  customCollection.addCustomFeature('feature1');
  customCollection.addCustomFeature('feature2');

  const customResult = await customCollection.customOperation();
  console.log('   ✅ Custom collection working:', customResult);

  await db.close();
  console.log('\n✅ Database closed');
}

// Run the example
modularArchitectureExample().catch(console.error);
