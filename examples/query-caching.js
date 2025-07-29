import { createDatabase } from '../dist/index.js';

async function queryCachingExample() {
  console.log('=== NuboDB Query Caching Example ===\n');

  try {
    const db = await createDatabase({
      path: './examples/caching-db',
      debug: true,
      cacheDocuments: true,
      maxCacheSize: 1000,
    });

    await db.open();
    console.log('✅ Database opened with caching enabled\n');

    const users = db.collection('users');

    // Insert sample data for testing
    console.log('🔄 Setting up test data...');
    await users.insertMany([
      { name: 'Alice Johnson', age: 28, department: 'Engineering', salary: 75000, active: true },
      { name: 'Bob Smith', age: 34, department: 'Marketing', salary: 65000, active: true },
      { name: 'Charlie Brown', age: 29, department: 'Engineering', salary: 80000, active: false },
      { name: 'Diana Prince', age: 31, department: 'Sales', salary: 70000, active: true },
      { name: 'Eve Wilson', age: 26, department: 'Engineering', salary: 72000, active: true },
      { name: 'Frank Miller', age: 35, department: 'Marketing', salary: 68000, active: false },
      { name: 'Grace Lee', age: 30, department: 'Sales', salary: 73000, active: true },
      { name: 'Henry Davis', age: 33, department: 'Engineering', salary: 85000, active: true },
    ]);
    console.log('✅ Test data inserted\n');

    // Example 1: Basic query caching demonstration
    console.log('1. Basic Query Caching:');
    
    const query1 = { department: 'Engineering', active: true };
    
    // First query - cache miss
    console.log('   🔍 First query (cache miss):');
    const start1 = process.hrtime.bigint();
    const result1 = await users.find(query1);
    const time1 = Number(process.hrtime.bigint() - start1) / 1000000; // Convert to ms with decimal precision
    
    console.log(`      - Found ${result1.total} engineers`);
    console.log(`      - Query time: ${time1.toFixed(3)}ms`);
    
    // Second identical query - cache hit
    console.log('   🔍 Second identical query (cache hit):');
    const start2 = process.hrtime.bigint();
    const result2 = await users.find(query1);
    const time2 = Number(process.hrtime.bigint() - start2) / 1000000; // Convert to ms with decimal precision
    
    console.log(`      - Found ${result2.total} engineers`);
    console.log(`      - Query time: ${time2.toFixed(3)}ms`);
    console.log(`      - Speedup: ${time1 > 0 ? (time1 / Math.max(time2, 0.001)).toFixed(2) : 'N/A'}x faster`);
    console.log(`      - Cache hit: ${time2 < time1 ? '✅' : '❌'}\n`);

    // Example 2: Query caching with different parameters
    console.log('2. Cache Behavior with Different Queries:');
    
    const queries = [
      { department: 'Marketing' },
      { age: { $gte: 30 } },
      { salary: { $gte: 70000 } },
      { department: 'Engineering', active: true }, // Same as query1 - should hit cache
    ];
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const start = process.hrtime.bigint();
      const result = await users.find(query);
      const time = Number(process.hrtime.bigint() - start) / 1000000;
      
      console.log(`   Query ${i + 1}: ${JSON.stringify(query)}`);
      console.log(`      - Results: ${result.total} documents`);
      console.log(`      - Time: ${time.toFixed(3)}ms`);
      console.log(`      - Cache status: ${time < 1 ? '🎯 Likely cache hit' : '📀 Likely cache miss'}`);
    }
    console.log('');

    // Example 3: Query caching with options
    console.log('3. Caching with Query Options:');
    
    const baseQuery = { active: true };
    
    // Different query options create different cache entries
    const queryVariations = [
      { query: baseQuery, options: { limit: 5 } },
      { query: baseQuery, options: { limit: 3 } },
      { query: baseQuery, options: { sort: { age: 1 } } },
      { query: baseQuery, options: { sort: { salary: -1 } } },
      { query: baseQuery, options: { limit: 5 } }, // Same as first - should hit cache
    ];
    
    for (let i = 0; i < queryVariations.length; i++) {
      const { query, options } = queryVariations[i];
      const start = process.hrtime.bigint();
      const result = await users.find(query, options);
      const time = Number(process.hrtime.bigint() - start) / 1000000;
      
      console.log(`   Variation ${i + 1}: ${JSON.stringify(options)}`);
      console.log(`      - Results: ${result.documents.length} documents`);
      console.log(`      - Time: ${time.toFixed(3)}ms`);
    }
    console.log('');

    // Example 4: QueryBuilder caching
    console.log('4. QueryBuilder Query Caching:');
    
    // QueryBuilder queries are also cached
    const qbStart1 = process.hrtime.bigint();
    const qbResult1 = await users
      .query()
      .where('department', '$eq', 'Engineering')
      .and('salary', '$gte', 75000)
      .sort('salary', -1)
      .execute();
    const qbTime1 = Number(process.hrtime.bigint() - qbStart1) / 1000000;
    
    console.log('   🔍 QueryBuilder query (cache miss):');
    console.log(`      - Results: ${qbResult1.total} high-paid engineers`);
    console.log(`      - Time: ${qbTime1.toFixed(3)}ms`);
    
    // Same QueryBuilder query - should hit cache
    const qbStart2 = process.hrtime.bigint();
    const qbResult2 = await users
      .query()
      .where('department', '$eq', 'Engineering')
      .and('salary', '$gte', 75000)
      .sort('salary', -1)
      .execute();
    const qbTime2 = Number(process.hrtime.bigint() - qbStart2) / 1000000;
    
    console.log('   🔍 Same QueryBuilder query (cache hit):');
    console.log(`      - Results: ${qbResult2.total} high-paid engineers`);
    console.log(`      - Time: ${qbTime2.toFixed(3)}ms`);
    console.log(`      - Speedup: ${qbTime1 > 0 ? (qbTime1 / Math.max(qbTime2, 0.001)).toFixed(2) : 'N/A'}x faster\n`);

    // Example 5: Cache invalidation on data changes
    console.log('5. Cache Invalidation on Data Changes:');
    
    // Run a query to populate cache
    const cacheQuery = { department: 'Sales' };
    const beforeInsert = process.hrtime.bigint();
    const initialResult = await users.find(cacheQuery);
    const beforeInsertTime = Number(process.hrtime.bigint() - beforeInsert) / 1000000;
    
    console.log('   📊 Initial query:');
    console.log(`      - Sales people: ${initialResult.total}`);
    console.log(`      - Time: ${beforeInsertTime.toFixed(3)}ms`);
    
    // Insert new data (should invalidate cache)
    await users.insert({
      name: 'Isaac Newton',
      age: 32,
      department: 'Sales',
      salary: 71000,
      active: true
    });
    
    console.log('   ➕ Inserted new sales person');
    
    // Query again - cache should be invalidated
    const afterInsert = process.hrtime.bigint();
    const updatedResult = await users.find(cacheQuery);
    const afterInsertTime = Number(process.hrtime.bigint() - afterInsert) / 1000000;
    
    console.log('   📊 Query after insert (cache invalidated):');
    console.log(`      - Sales people: ${updatedResult.total}`);
    console.log(`      - Time: ${afterInsertTime.toFixed(3)}ms`);
    console.log(`      - Cache invalidated: ${updatedResult.total > initialResult.total ? '✅' : '❌'}\n`);

    // Example 6: Cache performance analysis
    console.log('6. Cache Performance Analysis:');
    
    const performanceQueries = [
      { name: 'Simple equality', query: { department: 'Engineering' } },
      { name: 'Range query', query: { age: { $gte: 30, $lte: 35 } } },
      { name: 'Complex query', query: { $and: [{ active: true }, { salary: { $gte: 70000 } }] } },
    ];
    
    for (const { name, query } of performanceQueries) {
      console.log(`   🧪 Testing: ${name}`);
      
      // Cold cache
      users.clearCache(); // Clear to ensure cache miss
      const coldStart = process.hrtime.bigint();
      const coldResult = await users.find(query);
      const coldTime = Number(process.hrtime.bigint() - coldStart) / 1000000;
      
      // Warm cache
      const warmStart = process.hrtime.bigint();
      const warmResult = await users.find(query);
      const warmTime = Number(process.hrtime.bigint() - warmStart) / 1000000;
      
      const speedup = coldTime > 0 ? (coldTime / Math.max(warmTime, 0.001)).toFixed(2) : 'N/A';
      
      console.log(`      - Cold cache: ${coldTime.toFixed(3)}ms (${coldResult.total} results)`);
      console.log(`      - Warm cache: ${warmTime.toFixed(3)}ms (${warmResult.total} results)`);
      console.log(`      - Speedup: ${speedup}x`);
    }
    console.log('');

    // Example 7: Cache TTL (Time To Live) demonstration
    console.log('7. Cache TTL Demonstration:');
    
    const ttlQuery = { age: { $gte: 25 } };
    
    // First query
    const ttlStart1 = process.hrtime.bigint();
    await users.find(ttlQuery);
    const ttlTime1 = Number(process.hrtime.bigint() - ttlStart1) / 1000000;
    console.log(`   🕐 Initial query: ${ttlTime1.toFixed(3)}ms`);
    
    // Immediate second query (cache hit)
    const ttlStart2 = process.hrtime.bigint();
    await users.find(ttlQuery);
    const ttlTime2 = Number(process.hrtime.bigint() - ttlStart2) / 1000000;
    console.log(`   🕐 Immediate repeat: ${ttlTime2.toFixed(3)}ms (cache hit)`);
    
    console.log('   ⏳ Waiting for cache TTL (5 seconds)...');
    
    // Wait for cache to expire (TTL is 5 seconds)
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Query after TTL expiry
    const ttlStart3 = process.hrtime.bigint();
    await users.find(ttlQuery);
    const ttlTime3 = Number(process.hrtime.bigint() - ttlStart3) / 1000000;
    console.log(`   🕐 After TTL expiry: ${ttlTime3.toFixed(3)}ms (cache miss)`);
    console.log(`   ✅ Cache TTL working: ${ttlTime3 > ttlTime2 ? 'Yes' : 'No'}\n`);

    // Example 8: Manual cache management
    console.log('8. Manual Cache Management:');
    
    // Populate cache with various queries
    await users.find({ department: 'Engineering' });
    await users.find({ active: true });
    await users.find({ salary: { $gte: 70000 } });
    
    console.log('   📂 Cache populated with multiple queries');
    
    // Clear all caches
    console.log('   🧹 Clearing all caches...');
    users.clearCache();
    
    // Test that cache is cleared
    const clearTestStart = process.hrtime.bigint();
    await users.find({ department: 'Engineering' });
    const clearTestTime = Number(process.hrtime.bigint() - clearTestStart) / 1000000;
    
    console.log(`   🔍 Query after cache clear: ${clearTestTime.toFixed(3)}ms`);
    console.log('   ✅ Manual cache management working\n');

    // Example 9: Cache monitoring and statistics
    console.log('9. Cache Monitoring:');
    
    // Get collection stats which include cache information
    const stats = await users.stats();
    console.log('   📊 Collection statistics:');
    console.log(`      - Total documents: ${stats.totalDocuments}`);
    console.log(`      - Cache size: ${stats.cacheSize} documents`);
    console.log(`      - Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
    
    // Calculate cache efficiency
    const cacheRatio = (stats.cacheSize / stats.totalDocuments * 100).toFixed(2);
    console.log(`      - Cache ratio: ${cacheRatio}% of documents cached`);
    
    if (stats.cacheSize > 0) {
      console.log('      ✅ Document caching is active');
    } else {
      console.log('      ⚠️ No documents in cache');
    }
    console.log('');

    // Example 10: Best practices and recommendations
    console.log('10. Query Caching Best Practices:');
    console.log('    💡 Optimization tips:');
    console.log('       - Identical queries (same filter + options) share cache entries');
    console.log('       - Cache automatically invalidates on data modifications');
    console.log('       - TTL is 5 seconds - good for read-heavy workloads');
    console.log('       - Use clearCache() when memory usage is high');
    console.log('       - Monitor cache hit rates for performance optimization');
    console.log('       - QueryBuilder queries are cached just like find() queries');
    console.log('       - Consider query patterns when designing applications');
    console.log('');

    await db.close();
    console.log('✅ Database closed');
    
    console.log('\n🎯 Query Caching Summary:');
    console.log('   • Automatic caching for identical queries (5-second TTL)');
    console.log('   • Works with both find() and QueryBuilder');
    console.log('   • Cache invalidation on data modifications');
    console.log('   • Significant performance improvements for repeated queries');
    console.log('   • Manual cache management available');
    console.log('   • Zero configuration required - works out of the box');
    
  } catch (error) {
    console.error('❌ Error during query caching example:', error.message);
    process.exit(1);
  }
}

// Run the example
queryCachingExample().catch(console.error);