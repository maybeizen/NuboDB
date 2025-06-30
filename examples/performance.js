import { createDatabase } from '../dist/index.js';

async function performanceExample() {
  console.log('=== NuboDB Performance Example ===\n');

  // Create database with performance optimizations
  const db = await createDatabase({
    path: './examples/performance-db',
    debug: true,
    cacheDocuments: true,
    maxCacheSize: 1000,
    enableIndexing: true,
    autoFlush: true,
    flushInterval: 500,
  });

  await db.open();
  console.log('✅ Performance-optimized database opened');

  const users = db.collection('users');

  // Example 1: Bulk insert performance
  console.log('1. Bulk Insert Performance:');
  const startTime = Date.now();

  const bulkData = Array.from({ length: 1000 }, (_, i) => ({
    name: `User ${i}`,
    email: `user${i}@example.com`,
    age: 20 + (i % 50),
    city: ['New York', 'Los Angeles', 'Chicago', 'Boston', 'Seattle'][i % 5],
    active: i % 3 === 0,
    score: Math.floor(Math.random() * 100),
    tags: [`tag${i % 10}`, `tag${(i + 1) % 10}`],
  }));

  const insertResult = await users.insertMany(bulkData);
  const insertTime = Date.now() - startTime;

  console.log(
    `   ✅ Inserted ${insertResult.insertedCount} documents in ${insertTime}ms`
  );
  console.log(
    `   📊 Average: ${((insertResult.insertedCount / insertTime) * 1000).toFixed(2)} docs/sec`
  );

  // Example 2: Query performance with indexes
  console.log('\n2. Query Performance with Indexes:');

  // Create indexes for better performance
  await users.createIndex({
    fields: { age: 1 },
    name: 'age_index',
  });

  await users.createIndex({
    fields: { city: 1 },
    name: 'city_index',
  });

  await users.createIndex({
    fields: { active: 1, score: -1 },
    name: 'active_score_index',
  });

  console.log('   ✅ Indexes created');

  // Test query performance
  const queryStart = Date.now();
  const activeUsers = await users.find({ active: true });
  const queryTime = Date.now() - queryStart;

  console.log(
    `   ✅ Found ${activeUsers.total} active users in ${queryTime}ms`
  );

  // Example 3: Complex query performance
  console.log('\n3. Complex Query Performance:');
  const complexStart = Date.now();

  const complexResults = await users.find(
    {
      active: true,
      age: { $gte: 25, $lte: 40 },
      score: { $gte: 50 },
    },
    {
      sort: { score: -1 },
      limit: 100,
    }
  );

  const complexTime = Date.now() - complexStart;
  console.log(`   ✅ Complex query completed in ${complexTime}ms`);
  console.log(`   📊 Found ${complexResults.total} matching documents`);

  // Example 4: QueryBuilder performance
  console.log('\n4. QueryBuilder Performance:');
  const qbStart = Date.now();

  const qbResults = await users
    .query()
    .where('active', '$eq', true)
    .and('age', '$gte', 30)
    .and('score', '$gt', 75)
    .sort('score', -1)
    .limit(50)
    .select(['name', 'age', 'score', 'city'])
    .execute();

  const qbTime = Date.now() - qbStart;
  console.log(`   ✅ QueryBuilder completed in ${qbTime}ms`);
  console.log(`   📊 Found ${qbResults.total} matching documents`);

  // Example 5: Cache performance
  console.log('\n5. Cache Performance:');

  // First query (cache miss)
  const cacheMissStart = Date.now();
  const cacheMissResult = await users.findById(
    users.documents[0]?._id || 'test'
  );
  const cacheMissTime = Date.now() - cacheMissStart;

  // Second query (cache hit)
  const cacheHitStart = Date.now();
  const cacheHitResult = await users.findById(
    users.documents[0]?._id || 'test'
  );
  const cacheHitTime = Date.now() - cacheHitStart;

  console.log(`   📊 Cache miss: ${cacheMissTime}ms`);
  console.log(`   📊 Cache hit: ${cacheHitTime}ms`);
  console.log(
    `   📊 Cache speedup: ${(cacheMissTime / cacheHitTime).toFixed(2)}x`
  );

  // Example 6: Batch operations performance
  console.log('\n6. Batch Operations Performance:');

  // Batch update
  const batchUpdateStart = Date.now();
  const batchUpdateResult = await users.update(
    { active: true },
    { lastUpdated: new Date(), batchProcessed: true }
  );
  const batchUpdateTime = Date.now() - batchUpdateStart;

  console.log(`   ✅ Batch update completed in ${batchUpdateTime}ms`);
  console.log(`   📊 Updated ${batchUpdateResult.modifiedCount} documents`);

  // Example 7: Memory usage monitoring
  console.log('\n7. Memory Usage Monitoring:');
  const stats = await users.stats();
  console.log('   📊 Collection statistics:');
  console.log(`      - Total documents: ${stats.totalDocuments}`);
  console.log(`      - Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
  console.log(`      - Cache size: ${stats.cacheSize}`);
  console.log(`      - Indexes: ${stats.indexes}`);

  // Example 8: Database statistics
  console.log('\n8. Database Statistics:');
  const dbStats = await db.getStats();
  console.log('   📊 Database statistics:');
  console.log(`      - Collections: ${dbStats.collections}`);
  console.log(`      - Total documents: ${dbStats.totalDocuments}`);
  console.log(
    `      - Total size: ${(dbStats.totalSize / 1024).toFixed(2)} KB`
  );
  console.log(`      - Uptime: ${dbStats.uptime}ms`);

  // Example 9: Performance comparison
  console.log('\n9. Performance Comparison:');

  // Without indexes
  users.clearCache();
  const noIndexStart = Date.now();
  await users.find({ city: 'New York' });
  const noIndexTime = Date.now() - noIndexStart;

  // With indexes
  const withIndexStart = Date.now();
  await users.find({ city: 'New York' });
  const withIndexTime = Date.now() - withIndexStart;

  console.log(`   📊 Query without index: ${noIndexTime}ms`);
  console.log(`   📊 Query with index: ${withIndexTime}ms`);
  console.log(
    `   📊 Index speedup: ${(noIndexTime / withIndexTime).toFixed(2)}x`
  );

  // Example 10: Cache management
  console.log('\n10. Cache Management:');
  console.log('   📊 Cache size before clear:', users.cache.size);
  users.clearCache();
  console.log('   📊 Cache size after clear:', users.cache.size);

  // Example 11: Database optimization
  console.log('\n11. Database Optimization:');
  console.log('   🔧 Compacting database...');
  await db.compact();
  console.log('   ✅ Database compacted');

  // Example 12: Performance tips
  console.log('\n12. Performance Tips:');
  console.log('   💡 Use indexes for frequently queried fields');
  console.log('   💡 Enable caching for read-heavy workloads');
  console.log('   💡 Use batch operations for bulk data');
  console.log('   💡 Use QueryBuilder for complex queries');
  console.log('   💡 Monitor cache hit rates');
  console.log('   💡 Compact database periodically');

  await db.close();
  console.log('\n✅ Performance database closed');
}

// Run the example
performanceExample().catch(console.error);
