import { createDatabase } from '../src/index.js';

/**
 * Comprehensive performance benchmark for NuboDB optimizations.
 */
async function performanceBenchmark() {
  console.log('🚀 NuboDB Performance Benchmark\n');

  const db = await createDatabase({
    path: './benchmark-db',
    debug: false,
    maxCacheSize: 10000,
  });

  await db.open();

  const users = await db.createCollection('users', {
    name: { type: 'string', required: true, index: true },
    email: { type: 'string', required: true, index: true },
    age: { type: 'number', index: true },
    active: { type: 'boolean', index: true },
    category: { type: 'string', index: true },
  });

  console.log('📊 Generating test data...');

  const testData = [];
  const categories = ['admin', 'user', 'moderator', 'guest'];

  for (let i = 0; i < 10000; i++) {
    testData.push({
      name: `User ${i}`,
      email: `user${i}@example.com`,
      age: 18 + (i % 62),
      active: i % 3 === 0,
      category: categories[i % categories.length],
      metadata: {
        created: new Date().toISOString(),
        tags: [`tag${i % 10}`, `tag${(i + 1) % 10}`],
      },
    });
  }

  console.log('📝 Bulk inserting 10,000 documents...');
  const startInsert = performance.now();

  const batchSize = 1000;
  for (let i = 0; i < testData.length; i += batchSize) {
    const batch = testData.slice(i, i + batchSize);
    await users.insertMany(batch);
  }

  const insertTime = performance.now() - startInsert;
  const insertRate = Math.round((testData.length / insertTime) * 1000);

  console.log(`✅ Insert completed in ${insertTime.toFixed(2)}ms`);
  console.log(
    `📈 Insert rate: ${insertRate.toLocaleString()} documents/second\n`
  );

  console.log('🔍 Query Performance Tests\n');

  console.log('1. Simple equality query (indexed field):');
  const startEq = performance.now();
  for (let i = 0; i < 1000; i++) {
    await users.find({ name: `User ${i % 1000}` });
  }
  const eqTime = performance.now() - startEq;
  const eqRate = Math.round((1000 / eqTime) * 1000);
  console.log(`   ${eqRate.toLocaleString()} queries/second\n`);

  console.log('2. Range query (indexed field):');
  const startRange = performance.now();
  for (let i = 0; i < 1000; i++) {
    await users.find({ age: { $gte: 25, $lte: 35 } });
  }
  const rangeTime = performance.now() - startRange;
  const rangeRate = Math.round((1000 / rangeTime) * 1000);
  console.log(`   ${rangeRate.toLocaleString()} queries/second\n`);

  console.log('3. Complex query (multiple conditions):');
  const startComplex = performance.now();
  for (let i = 0; i < 1000; i++) {
    await users.find({
      $and: [
        { age: { $gte: 20 } },
        { active: true },
        { category: { $in: ['user', 'moderator'] } },
      ],
    });
  }
  const complexTime = performance.now() - startComplex;
  const complexRate = Math.round((1000 / complexTime) * 1000);
  console.log(`   ${complexRate.toLocaleString()} queries/second\n`);

  console.log('4. Query with sorting and limiting:');
  const startSort = performance.now();
  for (let i = 0; i < 1000; i++) {
    await users.find(
      { active: true },
      { sort: { age: -1 }, limit: 10, skip: i % 100 }
    );
  }
  const sortTime = performance.now() - startSort;
  const sortRate = Math.round((1000 / sortTime) * 1000);
  console.log(`   ${sortRate.toLocaleString()} queries/second\n`);

  console.log('5. Query with field projection:');
  const startProject = performance.now();
  for (let i = 0; i < 1000; i++) {
    await users.find(
      { category: 'user' },
      { projection: { name: 1, email: 1, age: 1 } }
    );
  }
  const projectTime = performance.now() - startProject;
  const projectRate = Math.round((1000 / projectTime) * 1000);
  console.log(`   ${projectRate.toLocaleString()} queries/second\n`);

  console.log('6. Count queries:');
  const startCount = performance.now();
  for (let i = 0; i < 1000; i++) {
    await users.count({ active: true, age: { $gte: 25 } });
  }
  const countTime = performance.now() - startCount;
  const countRate = Math.round((1000 / countTime) * 1000);
  console.log(`   ${countRate.toLocaleString()} queries/second\n`);

  console.log('7. FindOne queries:');
  const startFindOne = performance.now();
  for (let i = 0; i < 1000; i++) {
    await users.findOne({ email: `user${i % 1000}@example.com` });
  }
  const findOneTime = performance.now() - startFindOne;
  const findOneRate = Math.round((1000 / findOneTime) * 1000);
  console.log(`   ${findOneRate.toLocaleString()} queries/second\n`);

  console.log('8. QueryBuilder performance:');
  const startQB = performance.now();
  for (let i = 0; i < 1000; i++) {
    await users
      .query()
      .where('age', '$gte', 25)
      .and('active', '$eq', true)
      .sort('name', 1)
      .limit(5)
      .execute();
  }
  const qbTime = performance.now() - startQB;
  const qbRate = Math.round((1000 / qbTime) * 1000);
  console.log(`   ${qbRate.toLocaleString()} queries/second\n`);

  const stats = await users.stats();
  console.log('📊 Collection Statistics:');
  console.log(`   Total documents: ${stats.totalDocuments.toLocaleString()}`);
  console.log(
    `   Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(`   Indexes: ${stats.indexes}`);
  console.log(`   Cache size: ${stats.cacheSize.toLocaleString()}`);

  console.log('\n📈 Performance Summary:');
  console.log(`   Insert rate: ${insertRate.toLocaleString()} docs/sec`);
  console.log(
    `   Average query rate: ${Math.round((eqRate + rangeRate + complexRate + sortRate + projectRate + countRate + findOneRate + qbRate) / 8).toLocaleString()} queries/sec`
  );
  console.log(
    `   Best query rate: ${Math.max(eqRate, rangeRate, complexRate, sortRate, projectRate, countRate, findOneRate, qbRate).toLocaleString()} queries/sec`
  );

  await db.close();
  console.log('\n✅ Benchmark completed!');
}

performanceBenchmark().catch(console.error);
