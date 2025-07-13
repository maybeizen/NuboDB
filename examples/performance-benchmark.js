import { createDatabase } from 'nubodb';

/**
 * Comprehensive performance benchmark for NuboDB optimizations.
 */
async function performanceBenchmark() {
  console.log('🚀 NuboDB Performance Benchmark\n');

  const db = await createDatabase({
    path: './benchmark-db',
    debug: false,
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

  async function benchmarkQuery(name, fn) {
    let docsRead = 0;
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      const result = await fn(i);
      if (Array.isArray(result)) {
        docsRead += result.length;
      } else if (typeof result === 'object' && result !== null) {
        docsRead += 1;
      }
    }
    const elapsed = performance.now() - start;
    const qps = Math.round((1000 / elapsed) * 1000);
    const dps = Math.round((docsRead / elapsed) * 1000);
    console.log(`${name}:`);
    console.log(`   ${qps.toLocaleString()} queries/sec`);
    console.log(`   ${dps.toLocaleString()} docs/sec\n`);
    return { qps, dps };
  }

  const eq = await benchmarkQuery(
    '1. Simple equality query (indexed field)',
    i => users.find({ name: `User ${i % 1000}` })
  );

  const range = await benchmarkQuery('2. Range query (indexed field)', i =>
    users.find({ age: { $gte: 25, $lte: 35 } })
  );

  const complex = await benchmarkQuery(
    '3. Complex query (multiple conditions)',
    i =>
      users.find({
        $and: [
          { age: { $gte: 20 } },
          { active: true },
          { category: { $in: ['user', 'moderator'] } },
        ],
      })
  );

  const sort = await benchmarkQuery('4. Query with sorting and limiting', i =>
    users.find(
      { active: true },
      { sort: { age: -1 }, limit: 10, skip: i % 100 }
    )
  );

  const project = await benchmarkQuery('5. Query with field projection', i =>
    users.find(
      { category: 'user' },
      { projection: { name: 1, email: 1, age: 1 } }
    )
  );

  const count = await benchmarkQuery('6. Count queries', async i => {
    const count = await users.count({ active: true, age: { $gte: 25 } });
    return Array.from({ length: count });
  });

  const findOne = await benchmarkQuery('7. FindOne queries', i =>
    users.findOne({ email: `user${i % 1000}@example.com` })
  );

  const qb = await benchmarkQuery('8. QueryBuilder performance', i =>
    users
      .query()
      .where('age', '$gte', 25)
      .and('active', '$eq', true)
      .sort('name', 1)
      .limit(5)
      .execute()
  );

  const stats = await users.stats();
  console.log('📊 Collection Statistics:');
  console.log(`   Total documents: ${stats.totalDocuments.toLocaleString()}`);
  console.log(
    `   Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(`   Indexes: ${stats.indexes}`);
  console.log(`   Cache size: ${stats.cacheSize.toLocaleString()}`);

  const avgQueryRate = Math.round(
    (eq.qps +
      range.qps +
      complex.qps +
      sort.qps +
      project.qps +
      count.qps +
      findOne.qps +
      qb.qps) /
      8
  );
  const avgDocsRate = Math.round(
    (eq.dps +
      range.dps +
      complex.dps +
      sort.dps +
      project.dps +
      count.dps +
      findOne.dps +
      qb.dps) /
      8
  );
  const bestQueryRate = Math.max(
    eq.qps,
    range.qps,
    complex.qps,
    sort.qps,
    project.qps,
    count.qps,
    findOne.qps,
    qb.qps
  );
  const bestDocsRate = Math.max(
    eq.dps,
    range.dps,
    complex.dps,
    sort.dps,
    project.dps,
    count.dps,
    findOne.dps,
    qb.dps
  );

  console.log('\n📈 Performance Summary:');
  console.log(`   Insert rate: ${insertRate.toLocaleString()} docs/sec`);
  console.log(
    `   Average query rate: ${avgQueryRate.toLocaleString()} queries/sec`
  );
  console.log(
    `   Average doc read rate: ${avgDocsRate.toLocaleString()} docs/sec`
  );
  console.log(
    `   Best query rate: ${bestQueryRate.toLocaleString()} queries/sec`
  );
  console.log(
    `   Best doc read rate: ${bestDocsRate.toLocaleString()} docs/sec`
  );

  await db.close();
  console.log('\n✅ Benchmark completed!');
}

performanceBenchmark().catch(console.error);
