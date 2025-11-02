import { createDatabase } from '../dist/index.js';

async function databaseHealthExample() {
  console.log('=== NuboDB Database Health & Validation Example ===\n');

  try {
    const db = await createDatabase({
      path: './examples/health-db',
      debug: true,
    });

    await db.open();
    console.log('✅ Database opened\n');

    console.log('1. Basic Database Validation:');
    
    const health = await db.validate();
    console.log('   📊 Database validation results:');
    console.log(`      - Overall health: ${health.isValid ? '✅ Healthy' : '⚠️ Issues found'}`);
    console.log(`      - Issues detected: ${health.issues.length}`);
    console.log(`      - Collections checked: ${Object.keys(health.collections).length}`);
    
    if (health.issues.length > 0) {
      console.log('   🚨 Issues found:');
      health.issues.forEach(issue => console.log(`      - ${issue}`));
    }
    console.log('');

    console.log('2. Database Accessibility Check:');
    
    const isAccessible = await db.isAccessible();
    console.log(`   📂 Database path accessible: ${isAccessible ? '✅' : '❌'}`);
    console.log(`   📍 Database path: ${db.getPath()}`);
    console.log('');

    console.log('3. Health Monitoring with Sample Data:');
    
    const users = db.collection('users');
    const products = db.collection('products');
    const orders = db.collection('orders');
    
    await users.insertMany([
      { name: 'Alice', email: 'alice@example.com', role: 'admin' },
      { name: 'Bob', email: 'bob@example.com', role: 'user' },
      { name: 'Charlie', email: 'charlie@example.com', role: 'user' },
    ]);
    
    await products.insertMany([
      { name: 'Laptop', price: 999.99, category: 'electronics' },
      { name: 'Book', price: 19.99, category: 'books' },
    ]);
    
    await orders.insertMany([
      { userId: 'user1', productId: 'prod1', quantity: 2, total: 1999.98 },
      { userId: 'user2', productId: 'prod2', quantity: 1, total: 19.99 },
    ]);
    
    console.log('   ✅ Sample data inserted');
    
    const healthWithData = await db.validate();
    console.log('   📊 Health check with data:');
    console.log(`      - Overall health: ${healthWithData.isValid ? '✅ Healthy' : '⚠️ Issues found'}`);
    
    for (const [collectionName, stats] of Object.entries(healthWithData.collections)) {
      console.log(`      - ${collectionName}: ${stats.documents} docs, ${stats.issues.length} issues`);
      if (stats.issues.length > 0) {
        stats.issues.forEach(issue => console.log(`        ⚠️ ${issue}`));
      }
    }
    console.log('');

    console.log('4. Performance Health Monitoring:');
    
    const dbStats = await db.getStats();
    console.log('   📊 Database performance metrics:');
    console.log(`      - Collections: ${dbStats.collections}`);
    console.log(`      - Total documents: ${dbStats.totalDocuments.toLocaleString()}`);
    console.log(`      - Total size: ${(dbStats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`      - Indexes: ${dbStats.indexes}`);
    console.log(`      - Uptime: ${dbStats.uptime}ms`);
    
    const avgDocsPerCollection = dbStats.totalDocuments / dbStats.collections;
    const avgSizePerDoc = dbStats.totalSize / dbStats.totalDocuments;
    
    console.log('   🔍 Performance health assessment:');
    console.log(`      - Avg docs per collection: ${avgDocsPerCollection.toFixed(2)}`);
    console.log(`      - Avg size per document: ${avgSizePerDoc.toFixed(2)} bytes`);
    
    if (avgDocsPerCollection > 100000) {
      console.log('      ⚠️ Consider partitioning large collections');
    } else {
      console.log('      ✅ Collection sizes are healthy');
    }
    
    if (avgSizePerDoc > 10000) {
      console.log('      ⚠️ Documents are quite large, consider optimization');
    } else {
      console.log('      ✅ Document sizes are healthy');
    }
    console.log('');

    console.log('5. Collection-Specific Health Checks:');
    
    for (const collectionName of ['users', 'products', 'orders']) {
      const collection = db.collection(collectionName);
      const stats = await collection.stats();
      
      console.log(`   📋 ${collectionName} collection health:`);
      console.log(`      - Documents: ${stats.totalDocuments}`);
      console.log(`      - Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
      console.log(`      - Cache size: ${stats.cacheSize}`);
      console.log(`      - Indexes: ${stats.indexes}`);
      
      const isHealthy = stats.totalDocuments > 0 && stats.totalSize > 0;
      console.log(`      - Status: ${isHealthy ? '✅ Healthy' : '⚠️ Check needed'}`);
      
      if (stats.cacheSize > stats.totalDocuments) {
        console.log('      ⚠️ Cache size exceeds document count');
      }
    }
    console.log('');

    console.log('6. Automated Health Monitoring Setup:');
    
    let healthCheckCount = 0;
    const healthCheckInterval = setInterval(async () => {
      healthCheckCount++;
      console.log(`   🔄 Health check #${healthCheckCount}:`);
      
      const quickHealth = await db.validate();
      const timestamp = new Date().toISOString();
      
      console.log(`      [${timestamp}] Health: ${quickHealth.isValid ? '✅' : '⚠️'}`);
      
      if (!quickHealth.isValid) {
        console.log('      🚨 Issues detected in automated check:');
        quickHealth.issues.forEach(issue => console.log(`         - ${issue}`));
        
      }
      
      if (healthCheckCount >= 3) {
        clearInterval(healthCheckInterval);
        console.log('   ✅ Automated monitoring demo completed');
        finishExample();
      }
    }, 2000); // Check every 2 seconds
    
    async function finishExample() {
      console.log('');

      console.log('7. Health Check Error Scenarios:');
      
      const testCollection = db.collection('test_collection');
      
      try {
        await testCollection.insert({ test: 'data' });
        console.log('   ✅ Test data inserted successfully');
        
        const finalHealth = await db.validate();
        console.log(`   📊 Final health check: ${finalHealth.isValid ? '✅ Healthy' : '⚠️ Issues'}`);
      } catch (error) {
        console.log(`   ❌ Error during test: ${error.message}`);
      }
      
      console.log('');

      console.log('8. Health Monitoring Best Practices:');
      console.log('   💡 Best practices for database health monitoring:');
      console.log('      - Run health checks regularly (e.g., every 5 minutes)');
      console.log('      - Monitor both database and collection-level metrics');
      console.log('      - Set up alerts for critical issues');
      console.log('      - Track performance trends over time');
      console.log('      - Validate data integrity after major operations');
      console.log('      - Monitor cache hit rates and memory usage');
      console.log('      - Check for orphaned or corrupted data');
      console.log('      - Verify backup and recovery procedures');
      console.log('');

      console.log('9. Integration with Monitoring Systems:');
      console.log('   🔧 Example monitoring integration:');
      
      const healthMetrics = {
        timestamp: new Date().toISOString(),
        database: {
          isHealthy: healthWithData.isValid,
          issuesCount: healthWithData.issues.length,
          collections: dbStats.collections,
          totalDocuments: dbStats.totalDocuments,
          totalSize: dbStats.totalSize,
          uptime: dbStats.uptime
        },
        collections: Object.entries(healthWithData.collections).map(([name, stats]) => ({
          name,
          documents: stats.documents,
          issues: stats.issues.length,
          hasIssues: stats.issues.length > 0
        }))
      };
      
      console.log('   📊 Health metrics payload:');
      console.log(JSON.stringify(healthMetrics, null, 6));
      console.log('   ✅ Ready for external monitoring integration');
      console.log('');

      await db.close();
      console.log('✅ Database closed');
      
      console.log('\n🎯 Database Health Monitoring Summary:');
      console.log('   • Regular health checks detect issues early');
      console.log('   • Monitor both database and collection-level metrics');
      console.log('   • Accessibility checks ensure database availability');
      console.log('   • Performance metrics guide optimization efforts');
      console.log('   • Automated monitoring enables proactive maintenance');
      console.log('   • Integration-ready for external monitoring systems');
    }
    
  } catch (error) {
    console.error('❌ Error during database health example:', error.message);
    process.exit(1);
  }
}

databaseHealthExample().catch(console.error);