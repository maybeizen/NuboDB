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

    // Example 1: Basic database validation
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

    // Example 2: Database accessibility check
    console.log('2. Database Accessibility Check:');
    
    const isAccessible = await db.isAccessible();
    console.log(`   📂 Database path accessible: ${isAccessible ? '✅' : '❌'}`);
    console.log(`   📍 Database path: ${db.getPath()}`);
    console.log('');

    // Example 3: Health monitoring with data
    console.log('3. Health Monitoring with Sample Data:');
    
    // Create collections with some data
    const users = db.collection('users');
    const products = db.collection('products');
    const orders = db.collection('orders');
    
    // Insert sample data
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
    
    // Validate again with data
    const healthWithData = await db.validate();
    console.log('   📊 Health check with data:');
    console.log(`      - Overall health: ${healthWithData.isValid ? '✅ Healthy' : '⚠️ Issues found'}`);
    
    // Check individual collection health
    for (const [collectionName, stats] of Object.entries(healthWithData.collections)) {
      console.log(`      - ${collectionName}: ${stats.documents} docs, ${stats.issues.length} issues`);
      if (stats.issues.length > 0) {
        stats.issues.forEach(issue => console.log(`        ⚠️ ${issue}`));
      }
    }
    console.log('');

    // Example 4: Performance health monitoring
    console.log('4. Performance Health Monitoring:');
    
    // Get database statistics for health assessment
    const dbStats = await db.getStats();
    console.log('   📊 Database performance metrics:');
    console.log(`      - Collections: ${dbStats.collections}`);
    console.log(`      - Total documents: ${dbStats.totalDocuments.toLocaleString()}`);
    console.log(`      - Total size: ${(dbStats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`      - Indexes: ${dbStats.indexes}`);
    console.log(`      - Uptime: ${dbStats.uptime}ms`);
    
    // Assess performance health
    const avgDocsPerCollection = dbStats.totalDocuments / dbStats.collections;
    const avgSizePerDoc = dbStats.totalSize / dbStats.totalDocuments;
    
    console.log('   🔍 Performance health assessment:');
    console.log(`      - Avg docs per collection: ${avgDocsPerCollection.toFixed(2)}`);
    console.log(`      - Avg size per document: ${avgSizePerDoc.toFixed(2)} bytes`);
    
    // Health recommendations
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

    // Example 5: Collection-specific health checks
    console.log('5. Collection-Specific Health Checks:');
    
    for (const collectionName of ['users', 'products', 'orders']) {
      const collection = db.collection(collectionName);
      const stats = await collection.stats();
      
      console.log(`   📋 ${collectionName} collection health:`);
      console.log(`      - Documents: ${stats.totalDocuments}`);
      console.log(`      - Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
      console.log(`      - Cache size: ${stats.cacheSize}`);
      console.log(`      - Indexes: ${stats.indexes}`);
      
      // Health assessment for each collection
      const isHealthy = stats.totalDocuments > 0 && stats.totalSize > 0;
      console.log(`      - Status: ${isHealthy ? '✅ Healthy' : '⚠️ Check needed'}`);
      
      if (stats.cacheSize > stats.totalDocuments) {
        console.log('      ⚠️ Cache size exceeds document count');
      }
    }
    console.log('');

    // Example 6: Automated health monitoring setup
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
        
        // In a real application, you might:
        // - Send alerts to monitoring systems
        // - Log to external services
        // - Trigger automatic remediation
      }
      
      // Stop after 3 checks for demo
      if (healthCheckCount >= 3) {
        clearInterval(healthCheckInterval);
        console.log('   ✅ Automated monitoring demo completed');
        finishExample();
      }
    }, 2000); // Check every 2 seconds
    
    // Function to finish the example
    async function finishExample() {
      console.log('');

      // Example 7: Health check error scenarios
      console.log('7. Health Check Error Scenarios:');
      
      // Simulate potential issues by creating imbalanced data
      const testCollection = db.collection('test_collection');
      
      // This shouldn't cause issues in a well-designed system, but let's monitor
      try {
        await testCollection.insert({ test: 'data' });
        console.log('   ✅ Test data inserted successfully');
        
        const finalHealth = await db.validate();
        console.log(`   📊 Final health check: ${finalHealth.isValid ? '✅ Healthy' : '⚠️ Issues'}`);
      } catch (error) {
        console.log(`   ❌ Error during test: ${error.message}`);
      }
      
      console.log('');

      // Example 8: Health monitoring best practices
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

      // Example 9: Integration with monitoring systems
      console.log('9. Integration with Monitoring Systems:');
      console.log('   🔧 Example monitoring integration:');
      
      // Simulate sending metrics to a monitoring system
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

// Run the example
databaseHealthExample().catch(console.error);