import { createDatabase, createField, validators } from '../dist/index.js';

async function comprehensiveFeaturesExample() {
  console.log('=== NuboDB Comprehensive New Features Example ===\n');

  try {
    const db = await createDatabase({
      path: './examples/comprehensive-db',
      debug: true,
      cacheDocuments: true,
      maxCacheSize: 500,
      schemaValidation: 'strict',
    });

    await db.open();
    console.log('✅ Database opened with comprehensive configuration\n');

    console.log('1. Complete User Management System:');
    
    const userSchema = {
      email: createField.email(true),
      website: createField.url(false, 'https://example.com'),
      phone: createField.phone(true),
      userId: createField.uuid(true),
      
      username: createField.string({
        required: true,
        minLength: 3,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9_]+$/,
      }),
      
      firstName: {
        type: 'string',
        required: true,
        validate: validators.minLength(2),
      },
      
      lastName: {
        type: 'string',
        required: true,
        validate: validators.minLength(2),
      },
      
      age: createField.number({
        required: true,
        min: 13,
        max: 120,
        positive: true,
      }),
      
      salary: {
        type: 'number',
        required: false,
        validate: validators.range(20000, 500000),
      },
      
      preferences: {
        type: 'object',
        default: {},
      },
      
      tags: {
        type: 'array',
        default: [],
      },
      
      isActive: {
        type: 'boolean',
        default: true,
      },
      
      department: {
        type: 'string',
        enum: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'],
        default: 'Engineering',
      },
    };
    
    const users = await db.createCollection('users', userSchema);
    console.log('   ✅ Users collection created with comprehensive schema');
    
    db.createAlias('employees', 'users');
    db.createAlias('staff', 'users');
    db.createAlias('team_members', 'users');
    
    console.log('   ✅ Collection aliases created for different team perspectives\n');

    console.log('2. Data Insertion with Validation:');
    
    const sampleUsers = [
      {
        email: 'alice@company.com',
        website: 'https://alice.dev',
        phone: '+1-555-001-0001',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        username: 'alice_dev',
        firstName: 'Alice',
        lastName: 'Johnson',
        age: 28,
        salary: 85000,
        department: 'Engineering',
        preferences: {
          theme: 'dark',
          notifications: true,
          language: 'en',
        },
        tags: ['typescript', 'react', 'nodejs'],
      },
      {
        email: 'bob@company.com',
        phone: '+1-555-002-0002',
        userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        username: 'bob_marketing',
        firstName: 'Bob',
        lastName: 'Smith',
        age: 32,
        salary: 72000,
        department: 'Marketing',
        preferences: {
          theme: 'light',
          notifications: false,
        },
        tags: ['campaigns', 'analytics'],
      },
      {
        email: 'charlie@company.com',
        website: 'https://charlie-sales.com',
        phone: '+1-555-003-0003',
        userId: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        username: 'charlie_sales',
        firstName: 'Charlie',
        lastName: 'Brown',
        age: 35,
        salary: 78000,
        department: 'Sales',
        tags: ['crm', 'clients'],
      },
    ];
    
    const insertResults = await users.insertMany(sampleUsers);
    console.log(`   ✅ Inserted ${insertResults.insertedCount} users with full validation`);
    console.log('');

    console.log('3. Query Caching Performance:');
    
    const cacheTestQueries = [
      { name: 'Direct collection', collection: users, query: { department: 'Engineering' } },
      { name: 'Via employees alias', collection: db.collection('employees'), query: { department: 'Engineering' } },
      { name: 'Via staff alias', collection: db.collection('staff'), query: { department: 'Engineering' } },
    ];
    
    for (const { name, collection, query } of cacheTestQueries) {
      const start1 = process.hrtime.bigint();
      const result1 = await collection.find(query);
      const time1 = Number(process.hrtime.bigint() - start1) / 1000000;
      
      const start2 = process.hrtime.bigint();
      const result2 = await collection.find(query);
      const time2 = Number(process.hrtime.bigint() - start2) / 1000000;
      
      console.log(`   ${name}:`);
      console.log(`      - First query: ${time1.toFixed(3)}ms (${result1.total} results)`);
      console.log(`      - Second query: ${time2.toFixed(3)}ms (${result2.total} results)`);
      console.log(`      - Cache performance: ${time1 > time2 ? '✅ Working' : '⚠️ No improvement'}`);
    }
    console.log('');

    console.log('4. Advanced Queries with Caching:');
    
    const advancedQueries = [
      {
        name: 'High earners',
        query: { salary: { $gte: 80000 } },
        options: { sort: { salary: -1 } },
      },
      {
        name: 'Engineering team',
        query: { department: 'Engineering', isActive: true },
        options: { sort: { age: 1 } },
      },
      {
        name: 'Senior staff',
        query: { age: { $gte: 30 } },
        options: { projection: { firstName: 1, lastName: 1, department: 1 } },
      },
    ];
    
    for (const { name, query, options } of advancedQueries) {
      console.log(`   🔍 Testing: ${name}`);
      
      const directResult = await users.find(query, options);
      const aliasResult = await db.collection('employees').find(query, options);
      
      console.log(`      - Direct access: ${directResult.total} results`);
      console.log(`      - Alias access: ${aliasResult.total} results`);
      console.log(`      - Consistency: ${directResult.total === aliasResult.total ? '✅' : '❌'}`);
    }
    console.log('');

    console.log('5. Database Health Monitoring:');
    
    const health = await db.validate();
    console.log('   📊 Database health status:');
    console.log(`      - Overall health: ${health.isValid ? '✅ Healthy' : '⚠️ Issues found'}`);
    console.log(`      - Collections: ${Object.keys(health.collections).length}`);
    console.log(`      - Total issues: ${health.issues.length}`);
    
    const isAccessible = await db.isAccessible();
    console.log(`      - Database accessible: ${isAccessible ? '✅' : '❌'}`);
    
    const dbStats = await db.getStats();
    console.log('   📈 Performance metrics:');
    console.log(`      - Total documents: ${dbStats.totalDocuments}`);
    console.log(`      - Database size: ${(dbStats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`      - Indexes: ${dbStats.indexes}`);
    console.log(`      - Uptime: ${dbStats.uptime}ms`);
    
    for (const [collectionName, collectionHealth] of Object.entries(health.collections)) {
      console.log(`   📋 ${collectionName}:`);
      console.log(`      - Documents: ${collectionHealth.documents}`);
      console.log(`      - Issues: ${collectionHealth.issues.length}`);
      if (collectionHealth.issues.length > 0) {
        collectionHealth.issues.forEach(issue => {
          console.log(`        ⚠️ ${issue}`);
        });
      }
    }
    console.log('');

    console.log('6. Comprehensive Validation Testing:');
    
    const validationTests = [
      {
        name: 'Invalid email',
        data: {
          email: 'invalid-email',
          phone: '+1-555-999-9999',
          userId: '550e8400-e29b-41d4-a716-446655440001',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          age: 25,
        },
        shouldFail: true,
      },
      {
        name: 'Invalid phone',
        data: {
          email: 'test@example.com',
          phone: 'not-a-phone',
          userId: '550e8400-e29b-41d4-a716-446655440002',
          username: 'testuser2',
          firstName: 'Test',
          lastName: 'User',
          age: 25,
        },
        shouldFail: true,
      },
      {
        name: 'Invalid UUID',
        data: {
          email: 'test2@example.com',
          phone: '+1-555-888-8888',
          userId: 'not-a-uuid',
          username: 'testuser3',
          firstName: 'Test',
          lastName: 'User',
          age: 25,
        },
        shouldFail: true,
      },
      {
        name: 'Invalid age (too young)',
        data: {
          email: 'test3@example.com',
          phone: '+1-555-777-7777',
          userId: '550e8400-e29b-41d4-a716-446655440003',
          username: 'testuser4',
          firstName: 'Test',
          lastName: 'User',
          age: 12, // Below minimum
        },
        shouldFail: true,
      },
      {
        name: 'Valid complete user',
        data: {
          email: 'valid@example.com',
          website: 'https://valid.example.com',
          phone: '+1-555-666-6666',
          userId: '550e8400-e29b-41d4-a716-446655440004',
          username: 'validuser',
          firstName: 'Valid',
          lastName: 'User',
          age: 30,
          salary: 90000,
          department: 'HR',
        },
        shouldFail: false,
      },
    ];
    
    for (const { name, data, shouldFail } of validationTests) {
      try {
        const result = await users.insert(data);
        if (shouldFail) {
          console.log(`   ❌ ${name}: Expected failure but succeeded`);
        } else {
          console.log(`   ✅ ${name}: Valid data accepted (ID: ${result.id})`);
        }
      } catch (error) {
        if (shouldFail) {
          console.log(`   ✅ ${name}: Invalid data correctly rejected`);
        } else {
          console.log(`   ❌ ${name}: Valid data incorrectly rejected - ${error.message}`);
        }
      }
    }
    console.log('');

    console.log('7. Performance Optimization Features:');
    
    users.clearCache();
    console.log('   🧹 Caches cleared for performance testing');
    
    const batchData = Array.from({ length: 50 }, (_, i) => ({
      email: `batch${i}@company.com`,
      phone: `+1-555-${String(i).padStart(3, '0')}-0000`,
      userId: `batch-${i.toString().padStart(3, '0')}-uuid-4716-446655440000`,
      username: `batch_user_${i}`,
      firstName: `BatchUser`,
      lastName: `${i}`,
      age: 20 + (i % 40),
      department: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'][i % 5],
    }));
    
    const batchStart = process.hrtime.bigint();
    const batchResult = await users.insertMany(batchData);
    const batchTime = Number(process.hrtime.bigint() - batchStart) / 1000000;
    
    console.log(`   📊 Batch insert performance:`);
    console.log(`      - Inserted: ${batchResult.insertedCount} documents`);
    console.log(`      - Time: ${batchTime.toFixed(3)}ms`);
    console.log(`      - Rate: ${(batchResult.insertedCount / batchTime * 1000).toFixed(2)} docs/sec`);
    
    const queryStart = process.hrtime.bigint();
    const queryResult = await users.find({ department: 'Engineering' });
    const queryTime = Number(process.hrtime.bigint() - queryStart) / 1000000;
    
    const cachedQueryStart = process.hrtime.bigint();
    const cachedQueryResult = await users.find({ department: 'Engineering' });
    const cachedQueryTime = Number(process.hrtime.bigint() - cachedQueryStart) / 1000000;
    
    console.log(`   🔍 Query performance:`);
    console.log(`      - First query: ${queryTime.toFixed(3)}ms (${queryResult.total} results)`);
    console.log(`      - Cached query: ${cachedQueryTime.toFixed(3)}ms (${cachedQueryResult.total} results)`);
    console.log(`      - Cache speedup: ${queryTime > 0 ? (queryTime / Math.max(cachedQueryTime, 0.001)).toFixed(2) : 'N/A'}x`);
    console.log('');

    console.log('8. Comprehensive Alias Management:');
    
    const environment = process.env.NODE_ENV || 'development';
    
    db.createAlias(`${environment}_users`, 'users');
    db.createAlias(`${environment}_employees`, 'users');
    
    db.createAlias('engineering_team', 'users');
    db.createAlias('marketing_team', 'users');
    db.createAlias('sales_team', 'users');
    
    db.createAlias('active_users', 'users');
    db.createAlias('all_staff', 'users');
    
    const allAliases = db.getAliases();
    console.log(`   📋 Created ${Object.keys(allAliases).length} aliases:`);
    for (const [alias, target] of Object.entries(allAliases)) {
      console.log(`      - "${alias}" → "${target}"`);
    }
    
    const engineeringViaAlias = await db.collection('engineering_team').find({ department: 'Engineering' });
    const marketingViaAlias = await db.collection('marketing_team').find({ department: 'Marketing' });
    
    console.log(`   🔍 Department queries via aliases:`);
    console.log(`      - Engineering team: ${engineeringViaAlias.total} members`);
    console.log(`      - Marketing team: ${marketingViaAlias.total} members`);
    console.log('');

    console.log('9. Real-World Scenario Simulation:');
    
    console.log('   👤 User profile update workflow:');
    
    const userToUpdate = await users.findOne({ email: 'alice@company.com' });
    if (userToUpdate) {
      console.log(`   📝 Found user: ${userToUpdate.firstName} ${userToUpdate.lastName}`);
      
      try {
        const updateResult = await users.update(
          { email: 'alice@company.com' },
          {
            salary: 95000,
            website: 'https://alice-updated.dev',
            preferences: {
              ...userToUpdate.preferences,
              updatedAt: new Date().toISOString(),
            },
          }
        );
        console.log(`   ✅ Updated ${updateResult.modifiedCount} user record`);
      } catch (error) {
        console.log(`   ❌ Update failed: ${error.message}`);
      }
    }
    
    console.log('   🔄 Department transfer simulation:');
    const transferResult = await users.update(
      { email: 'bob@company.com' },
      { department: 'Sales', salary: 80000 }
    );
    console.log(`   ✅ Transferred ${transferResult.modifiedCount} employee`);
    
    const postOpHealth = await db.validate();
    console.log(`   🏥 Post-operation health: ${postOpHealth.isValid ? '✅ Healthy' : '⚠️ Issues'}`);
    console.log('');

    console.log('10. Feature Integration Summary:');
    
    const finalStats = await db.getStats();
    const finalHealth = await db.validate();
    const aliasCount = Object.keys(db.getAliases()).length;
    
    console.log('   📊 Final system status:');
    console.log(`      - Total collections: ${finalStats.collections}`);
    console.log(`      - Total documents: ${finalStats.totalDocuments}`);
    console.log(`      - Active aliases: ${aliasCount}`);
    console.log(`      - Database health: ${finalHealth.isValid ? '✅ Healthy' : '⚠️ Issues'}`);
    console.log(`      - Cache efficiency: Query caching active`);
    console.log(`      - Validation: Enhanced field validation active`);
    console.log(`      - Performance: Optimized operations enabled`);
    
    console.log('\n   🎯 New features successfully integrated:');
    console.log('      ✅ Collection aliases for flexible naming');
    console.log('      ✅ Database health monitoring and validation');
    console.log('      ✅ Query result caching with TTL');
    console.log('      ✅ Enhanced field validation with createField helpers');
    console.log('      ✅ Built-in validators for common data types');
    console.log('      ✅ Performance optimizations');
    console.log('');

    await db.close();
    console.log('✅ Database closed');
    
    console.log('\n🏆 Comprehensive Features Demonstration Complete!');
    console.log('   All new NuboDB features working together seamlessly.');
    
  } catch (error) {
    console.error('❌ Error during comprehensive features example:', error.message);
    process.exit(1);
  }
}

comprehensiveFeaturesExample().catch(console.error);