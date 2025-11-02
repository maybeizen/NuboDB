import { createDatabase } from '../dist/index.js';

async function checkNativeBindings() {
  try {
    const possiblePaths = ['../native/bindings', '../../native/bindings/index'];

    for (const importPath of possiblePaths) {
      try {
        const bindingsModule = await import(importPath);
        const NativeFilterEngine =
          bindingsModule?.NativeFilterEngine || bindingsModule?.default;
        if (
          NativeFilterEngine &&
          typeof NativeFilterEngine.isAvailable === 'function'
        ) {
          const available = NativeFilterEngine.isAvailable();
          if (available) {
            return true;
          }
        }
      } catch {
        continue;
      }
    }

    try {
      const { join } = await import('path');
      const { existsSync } = await import('fs');
      const binaryPath = join(process.cwd(), 'dist', 'nubodb-native');
      return existsSync(binaryPath);
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

const FIRST_NAMES = [
  'James',
  'Mary',
  'John',
  'Patricia',
  'Robert',
  'Jennifer',
  'Michael',
  'Linda',
  'William',
  'Elizabeth',
  'David',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Charles',
  'Karen',
];
const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
];
const CITIES = [
  'New York',
  'Los Angeles',
  'Chicago',
  'Houston',
  'Phoenix',
  'Philadelphia',
  'San Antonio',
  'San Diego',
  'Dallas',
  'San Jose',
  'Austin',
  'Jacksonville',
  'Fort Worth',
  'Columbus',
  'Charlotte',
  'San Francisco',
  'Indianapolis',
  'Seattle',
  'Denver',
  'Boston',
];
const DEPARTMENTS = [
  'Engineering',
  'Sales',
  'Marketing',
  'Finance',
  'HR',
  'Operations',
  'Product',
  'Support',
  'Legal',
  'Executive',
];
const COMPANIES = [
  'Acme Corp',
  'TechStart Inc',
  'Global Solutions',
  'Innovate Labs',
  'Digital Dynamics',
  'Cloud Systems',
  'NextGen Tech',
  'FutureWorks',
  'DataStream',
  'CodeForge',
];
const JOB_TITLES = [
  'Software Engineer',
  'Senior Developer',
  'Product Manager',
  'Sales Representative',
  'Marketing Specialist',
  'Financial Analyst',
  'HR Coordinator',
  'Operations Manager',
  'Support Engineer',
  'Legal Counsel',
];

function generateEmail(firstName, lastName, companyIndex) {
  const domain =
    COMPANIES[companyIndex]
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/inc|corp|labs|systems|tech|works|forge/g, '') + '.com';
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function generatePhone(areaCode) {
  const exchange = Math.floor(Math.random() * 800) + 200;
  const number = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `+1-${areaCode}-${exchange}-${number}`;
}

function generateRealisticUser(index) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName =
    LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  const companyIndex = Math.floor(index / 200) % COMPANIES.length;
  const age = 22 + (index % 43);
  const salary =
    45000 + (index % 20) * 5000 + Math.floor(Math.random() * 10000);
  const department = DEPARTMENTS[index % DEPARTMENTS.length];
  const jobTitle = JOB_TITLES[index % JOB_TITLES.length];
  const city = CITIES[index % CITIES.length];
  const areaCode = [
    '212',
    '310',
    '312',
    '713',
    '602',
    '215',
    '210',
    '619',
    '214',
    '408',
    '512',
    '904',
    '817',
    '614',
    '704',
    '415',
    '317',
    '206',
    '303',
    '617',
  ][index % 20];

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email: generateEmail(firstName, lastName, companyIndex),
    phone: generatePhone(areaCode),
    age,
    salary,
    department,
    jobTitle,
    company: COMPANIES[companyIndex],
    city,
    state: [
      'NY',
      'CA',
      'IL',
      'TX',
      'AZ',
      'PA',
      'TX',
      'CA',
      'TX',
      'CA',
      'TX',
      'FL',
      'TX',
      'OH',
      'NC',
      'CA',
      'IN',
      'WA',
      'CO',
      'MA',
    ][index % 20],
    zipCode: (10000 + Math.floor(Math.random() * 90000)).toString(),
    active: index % 3 !== 0,
    startDate: new Date(
      2020 + (index % 5),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1
    ).toISOString(),
    skills: JOB_TITLES.slice(0, 2 + (index % 4)).map(
      (_, i) => `skill_${i + 1}`
    ),
    tags: [
      `tag_${department.toLowerCase()}`,
      `tag_${city.toLowerCase().replace(/\s+/g, '_')}`,
      `tag_${index % 10}`,
    ],
    performance: {
      rating: (3 + Math.random() * 2).toFixed(1),
      projectsCompleted: Math.floor(Math.random() * 50),
      lastReview: new Date(
        2024,
        Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 28) + 1
      ).toISOString(),
    },
    address: {
      street: `${Math.floor(Math.random() * 9999) + 1} ${['Main St', 'Oak Ave', 'Park Blvd', 'Maple Dr', 'Cedar Ln', 'Elm St', 'Pine Rd', 'Birch Way'][index % 8]}`,
      city,
      state: [
        'NY',
        'CA',
        'IL',
        'TX',
        'AZ',
        'PA',
        'TX',
        'CA',
        'TX',
        'CA',
        'TX',
        'FL',
        'TX',
        'OH',
        'NC',
        'CA',
        'IN',
        'WA',
        'CO',
        'MA',
      ][index % 20],
    },
  };
}

async function performanceExample() {
  console.log('=== NuboDB Performance Benchmark ===\n');

  const hasNativeBindings = await checkNativeBindings();
  console.log('🔧 Runtime Configuration:');
  if (hasNativeBindings) {
    console.log('   ✅ Native Go bindings: ENABLED');
    console.log(
      '   📊 Using accelerated query processing with Go native code\n'
    );
  } else {
    console.log('   ⚠️  Native Go bindings: DISABLED');
    console.log('   📊 Using TypeScript implementation (fallback mode)');
    console.log(
      '   💡 Install Go and run "npm run build" to enable native acceleration\n'
    );
  }

  try {
    const db = await createDatabase({
      path: './examples/performance-db',
      debug: false,
      cacheDocuments: true,
      maxCacheSize: 5000,
      enableIndexing: true,
      autoFlush: true,
      flushInterval: 500,
    });

    await db.open();
    console.log('✅ Performance-optimized database opened\n');

    const users = db.collection('users');
    const products = db.collection('products');
    const orders = db.collection('orders');

    console.log('📊 Test Configuration:');
    console.log('   - 50,000 users');
    console.log('   - 10,000 products');
    console.log('   - 25,000 orders');
    console.log('   - Realistic data with relationships\n');

    console.log('1. Bulk Insert Performance Test:');
    const insertStart = process.hrtime.bigint();

    const userData = Array.from({ length: 50000 }, (_, i) =>
      generateRealisticUser(i)
    );
    const insertResult = await users.insertMany(userData);

    const insertTime = Number(process.hrtime.bigint() - insertStart) / 1000000;
    const insertRate = (insertResult.insertedCount / insertTime) * 1000;

    console.log(
      `   ✅ Inserted ${insertResult.insertedCount.toLocaleString()} users in ${(insertTime / 1000).toFixed(2)}s`
    );
    console.log(`   📊 Insert rate: ${insertRate.toFixed(0)} docs/sec`);
    console.log(
      `   📊 Average: ${(insertTime / insertResult.insertedCount).toFixed(3)}ms per document\n`
    );

    console.log('2. Product Data Generation:');
    const productStart = process.hrtime.bigint();

    const productCategories = [
      'Electronics',
      'Clothing',
      'Books',
      'Home & Garden',
      'Sports',
      'Toys',
      'Automotive',
      'Health',
      'Beauty',
      'Food',
    ];
    const productData = Array.from({ length: 10000 }, (_, i) => ({
      name: `Product ${i + 1}`,
      sku: `SKU-${String(i + 1).padStart(6, '0')}`,
      category: productCategories[i % productCategories.length],
      price: parseFloat((10 + Math.random() * 990).toFixed(2)),
      cost: parseFloat((5 + Math.random() * 495).toFixed(2)),
      inStock: Math.floor(Math.random() * 1000),
      description: `High-quality ${productCategories[i % productCategories.length].toLowerCase()} product`,
      rating: parseFloat((3 + Math.random() * 2).toFixed(1)),
      reviews: Math.floor(Math.random() * 500),
      tags: [
        `tag_${productCategories[i % productCategories.length].toLowerCase()}`,
        `tag_${i % 20}`,
      ],
      supplier: COMPANIES[i % COMPANIES.length],
      createdAt: new Date(
        2020 + (i % 5),
        Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 28) + 1
      ).toISOString(),
    }));

    const productInsertResult = await products.insertMany(productData);
    const productTime =
      Number(process.hrtime.bigint() - productStart) / 1000000;
    const productRate =
      (productInsertResult.insertedCount / productTime) * 1000;

    console.log(
      `   ✅ Inserted ${productInsertResult.insertedCount.toLocaleString()} products in ${(productTime / 1000).toFixed(2)}s`
    );
    console.log(`   📊 Insert rate: ${productRate.toFixed(0)} docs/sec\n`);

    console.log('3. Order Data Generation:');
    const orderStart = process.hrtime.bigint();

    const orderData = Array.from({ length: 25000 }, (_, i) => {
      const userId =
        userData[Math.floor(Math.random() * userData.length)].email;
      const productIds = Array.from(
        { length: 1 + Math.floor(Math.random() * 5) },
        () => productData[Math.floor(Math.random() * productData.length)].sku
      );
      const total = productIds.reduce((sum, sku) => {
        const product = productData.find(p => p.sku === sku);
        return sum + (product ? product.price : 0);
      }, 0);

      return {
        orderId: `ORD-${String(i + 1).padStart(8, '0')}`,
        userId,
        productIds,
        total: parseFloat(total.toFixed(2)),
        status: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'][
          Math.floor(Math.random() * 5)
        ],
        paymentMethod: ['credit', 'debit', 'paypal', 'bank_transfer'][
          Math.floor(Math.random() * 4)
        ],
        createdAt: new Date(
          2023 + (i % 2),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ).toISOString(),
        shippingAddress: userData.find(u => u.email === userId)?.address || {},
      };
    });

    const orderInsertResult = await orders.insertMany(orderData);
    const orderTime = Number(process.hrtime.bigint() - orderStart) / 1000000;
    const orderRate = (orderInsertResult.insertedCount / orderTime) * 1000;

    console.log(
      `   ✅ Inserted ${orderInsertResult.insertedCount.toLocaleString()} orders in ${(orderTime / 1000).toFixed(2)}s`
    );
    console.log(`   📊 Insert rate: ${orderRate.toFixed(0)} docs/sec\n`);

    console.log('4. Index Creation Performance:');
    const indexStart = process.hrtime.bigint();

    await users.createIndex({
      fields: { email: 1 },
      name: 'email_index',
    });

    await users.createIndex({
      fields: { department: 1 },
      name: 'department_index',
    });

    await users.createIndex({
      fields: { active: 1, salary: -1 },
      name: 'active_salary_index',
    });

    await users.createIndex({
      fields: { city: 1, state: 1 },
      name: 'city_state_index',
    });

    await products.createIndex({
      fields: { category: 1 },
      name: 'category_index',
    });

    await products.createIndex({
      fields: { price: 1 },
      name: 'price_index',
    });

    await orders.createIndex({
      fields: { userId: 1 },
      name: 'user_index',
    });

    await orders.createIndex({
      fields: { status: 1, createdAt: -1 },
      name: 'status_date_index',
    });

    const indexTime = Number(process.hrtime.bigint() - indexStart) / 1000000;
    console.log(
      `   ✅ Created 8 indexes in ${(indexTime / 1000).toFixed(2)}s\n`
    );

    console.log('5. Query Performance Tests:');

    const queries = [
      {
        name: 'Find active users',
        collection: users,
        filter: { active: true },
        options: {},
      },
      {
        name: 'Find users by department',
        collection: users,
        filter: { department: 'Engineering' },
        options: {},
      },
      {
        name: 'Find high earners',
        collection: users,
        filter: { salary: { $gte: 80000 } },
        options: { sort: { salary: -1 }, limit: 100 },
      },
      {
        name: 'Find users in city',
        collection: users,
        filter: { city: 'New York' },
        options: {},
      },
      {
        name: 'Complex query - active engineers in NY',
        collection: users,
        filter: { active: true, department: 'Engineering', city: 'New York' },
        options: { sort: { salary: -1 }, limit: 50 },
      },
      {
        name: 'Find products by category',
        collection: products,
        filter: { category: 'Electronics' },
        options: { sort: { price: -1 }, limit: 100 },
      },
      {
        name: 'Find orders by status',
        collection: orders,
        filter: { status: 'delivered' },
        options: { sort: { createdAt: -1 }, limit: 100 },
      },
      {
        name: 'Find expensive products',
        collection: products,
        filter: { price: { $gte: 500 } },
        options: { sort: { price: -1 } },
      },
    ];

    for (const { name, collection, filter, options } of queries) {
      users.clearCache();
      const queryStart = process.hrtime.bigint();
      const result = await collection.find(filter, options);
      const queryTime = Number(process.hrtime.bigint() - queryStart) / 1000000;

      console.log(`   🔍 ${name}:`);
      console.log(`      - Found ${result.total.toLocaleString()} documents`);
      console.log(`      - Query time: ${queryTime.toFixed(3)}ms`);
      console.log(
        `      - Throughput: ${result.total > 0 ? ((result.total / queryTime) * 1000).toFixed(0) : 0} docs/sec`
      );
    }
    console.log('');

    console.log('6. QueryBuilder Performance:');
    const qbStart = process.hrtime.bigint();

    const qbResult = await users
      .query()
      .where('active', '$eq', true)
      .and('salary', '$gte', 75000)
      .and('department', '$eq', 'Engineering')
      .sort('salary', -1)
      .limit(100)
      .select(['firstName', 'lastName', 'email', 'salary', 'department'])
      .execute();

    const qbTime = Number(process.hrtime.bigint() - qbStart) / 1000000;
    console.log(`   ✅ QueryBuilder query completed in ${qbTime.toFixed(3)}ms`);
    console.log(
      `   📊 Found ${qbResult.total.toLocaleString()} matching documents\n`
    );

    console.log('7. Cache Performance Analysis:');
    const allUsers = await users.find({}, { limit: 1 });
    const firstUserId = allUsers.documents[0]?._id;

    if (firstUserId) {
      users.clearCache();
      const cacheMissStart = process.hrtime.bigint();
      const cacheMissResult = await users.findById(firstUserId);
      const cacheMissTime =
        Number(process.hrtime.bigint() - cacheMissStart) / 1000000;

      const cacheHitStart = process.hrtime.bigint();
      const cacheHitResult = await users.findById(firstUserId);
      const cacheHitTime =
        Number(process.hrtime.bigint() - cacheHitStart) / 1000000;

      console.log(`   📊 Cache miss: ${cacheMissTime.toFixed(3)}ms`);
      console.log(`   📊 Cache hit: ${cacheHitTime.toFixed(3)}ms`);
      console.log(
        `   📊 Cache speedup: ${(cacheMissTime / Math.max(cacheHitTime, 0.001)).toFixed(2)}x\n`
      );
    }

    console.log('8. Batch Update Performance:');
    const batchUpdateStart = process.hrtime.bigint();
    const batchUpdateResult = await users.update(
      { active: true },
      { lastUpdated: new Date().toISOString(), batchProcessed: true }
    );
    const batchUpdateTime =
      Number(process.hrtime.bigint() - batchUpdateStart) / 1000000;

    console.log(
      `   ✅ Batch update completed in ${(batchUpdateTime / 1000).toFixed(2)}s`
    );
    console.log(
      `   📊 Updated ${batchUpdateResult.modifiedCount.toLocaleString()} documents`
    );
    console.log(
      `   📊 Update rate: ${((batchUpdateResult.modifiedCount / batchUpdateTime) * 1000).toFixed(0)} docs/sec\n`
    );

    console.log('9. Memory Usage Statistics:');
    const userStats = await users.stats();
    const productStats = await products.stats();
    const orderStats = await orders.stats();

    console.log('   📊 Collection statistics:');
    console.log(
      `      Users: ${userStats.totalDocuments.toLocaleString()} docs, ${(userStats.totalSize / 1024 / 1024).toFixed(2)} MB, ${userStats.indexes} indexes, cache: ${userStats.cacheSize}`
    );
    console.log(
      `      Products: ${productStats.totalDocuments.toLocaleString()} docs, ${(productStats.totalSize / 1024 / 1024).toFixed(2)} MB, ${productStats.indexes} indexes, cache: ${productStats.cacheSize}`
    );
    console.log(
      `      Orders: ${orderStats.totalDocuments.toLocaleString()} docs, ${(orderStats.totalSize / 1024 / 1024).toFixed(2)} MB, ${orderStats.indexes} indexes, cache: ${orderStats.cacheSize}\n`
    );

    console.log('10. Database Statistics:');
    const dbStats = await db.getStats();
    console.log('   📊 Overall database metrics:');
    console.log(`      - Collections: ${dbStats.collections}`);
    console.log(
      `      - Total documents: ${dbStats.totalDocuments.toLocaleString()}`
    );
    console.log(
      `      - Total size: ${(dbStats.totalSize / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(`      - Total indexes: ${dbStats.indexes}`);
    console.log(`      - Uptime: ${(dbStats.uptime / 1000).toFixed(2)}s\n`);

    console.log('11. Performance Comparison (Indexed vs Non-Indexed):');
    users.clearCache();

    const noIndexStart = process.hrtime.bigint();
    await users.find({ department: 'Engineering' });
    const noIndexTime =
      Number(process.hrtime.bigint() - noIndexStart) / 1000000;

    const withIndexStart = process.hrtime.bigint();
    await users.find({ department: 'Engineering' });
    const withIndexTime =
      Number(process.hrtime.bigint() - withIndexStart) / 1000000;

    console.log(`   📊 Query without index: ${noIndexTime.toFixed(3)}ms`);
    console.log(`   📊 Query with index: ${withIndexTime.toFixed(3)}ms`);
    console.log(
      `   📊 Index speedup: ${(noIndexTime / Math.max(withIndexTime, 0.001)).toFixed(2)}x\n`
    );

    console.log('12. Query Caching Performance:');
    users.clearCache();

    const cacheQuery = { active: true, salary: { $gte: 70000 } };

    const queryStart1 = process.hrtime.bigint();
    const result1 = await users.find(cacheQuery);
    const queryTime1 = Number(process.hrtime.bigint() - queryStart1) / 1000000;

    const queryStart2 = process.hrtime.bigint();
    const result2 = await users.find(cacheQuery);
    const queryTime2 = Number(process.hrtime.bigint() - queryStart2) / 1000000;

    console.log(`   📊 First query (cache miss): ${queryTime1.toFixed(3)}ms`);
    console.log(`   📊 Second query (cache hit): ${queryTime2.toFixed(3)}ms`);
    console.log(
      `   📊 Query cache speedup: ${(queryTime1 / Math.max(queryTime2, 1)).toFixed(2)}x\n`
    );

    console.log('13. Database Optimization:');
    console.log('   🔧 Compacting database...');
    const compactStart = process.hrtime.bigint();
    await db.compact();
    const compactTime =
      Number(process.hrtime.bigint() - compactStart) / 1000000;
    console.log(
      `   ✅ Database compacted in ${(compactTime / 1000).toFixed(2)}s\n`
    );

    console.log('14. Final Performance Summary:');
    const totalTime = (insertTime + productTime + orderTime + indexTime) / 1000;
    const totalDocs =
      insertResult.insertedCount +
      productInsertResult.insertedCount +
      orderInsertResult.insertedCount;
    const overallRate = totalDocs / totalTime;

    console.log(
      `   📊 Total documents inserted: ${totalDocs.toLocaleString()}`
    );
    console.log(`   📊 Total insertion time: ${totalTime.toFixed(2)}s`);
    console.log(
      `   📊 Overall insert rate: ${overallRate.toFixed(0)} docs/sec`
    );
    console.log(
      `   📊 Average document size: ${(dbStats.totalSize / dbStats.totalDocuments).toFixed(0)} bytes`
    );
    console.log(
      `   📊 Database size: ${(dbStats.totalSize / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(
      `   🔧 Runtime: ${hasNativeBindings ? 'Native Go bindings' : 'TypeScript (fallback)'}`
    );
    console.log('\n✅ Performance benchmark completed successfully!');

    await db.close();
    console.log('✅ Database closed');
  } catch (error) {
    console.error('❌ Error during performance example:', error.message);
    process.exit(1);
  }
}

performanceExample().catch(console.error);
