import { createDatabase } from '../dist/index.js';

async function queryBuilderExample() {
  console.log('=== NuboDB QueryBuilder Example ===\n');

  const db = await createDatabase({
    path: './examples/query-builder-db',
    debug: true,
  });

  await db.open();
  console.log('✅ Database opened');

  const users = db.collection('users');

  // Insert sample data
  await users.insertMany([
    { name: 'Alice', age: 25, city: 'New York', active: true, salary: 75000 },
    { name: 'Bob', age: 30, city: 'Los Angeles', active: true, salary: 85000 },
    { name: 'Charlie', age: 35, city: 'Chicago', active: false, salary: 65000 },
    { name: 'Diana', age: 28, city: 'New York', active: true, salary: 80000 },
    { name: 'Eve', age: 32, city: 'Boston', active: false, salary: 70000 },
    {
      name: 'Frank',
      age: 27,
      city: 'San Francisco',
      active: true,
      salary: 95000,
    },
    { name: 'Grace', age: 29, city: 'Seattle', active: true, salary: 78000 },
  ]);

  console.log('✅ Sample data inserted\n');

  // Example 1: Basic where clause
  console.log('1. Basic where clause:');
  const youngUsers = await users.query().where('age', '$lt', 30).execute();
  console.log(
    `   Found ${youngUsers.total} users under 30:`,
    youngUsers.documents.map(u => u.name)
  );

  // Example 2: Multiple conditions with AND
  console.log('\n2. Multiple AND conditions:');
  const activeHighEarners = await users
    .query()
    .where('active', '$eq', true)
    .and('salary', '$gte', 80000)
    .execute();
  console.log(
    `   Found ${activeHighEarners.total} active high earners:`,
    activeHighEarners.documents.map(u => u.name)
  );

  // Example 3: OR conditions
  console.log('\n3. OR conditions:');
  const nyOrLaUsers = await users
    .query()
    .where('city', '$eq', 'New York')
    .or('city', '$eq', 'Los Angeles')
    .execute();
  console.log(
    `   Found ${nyOrLaUsers.total} users in NY or LA:`,
    nyOrLaUsers.documents.map(u => `${u.name} (${u.city})`)
  );

  // Example 4: Sorting
  console.log('\n4. Sorting by age (descending):');
  const sortedByAge = await users.query().sort('age', -1).limit(3).execute();
  console.log(
    '   Top 3 oldest users:',
    sortedByAge.documents.map(u => `${u.name} (${u.age})`)
  );

  // Example 5: Field projection
  console.log('\n5. Field projection (only name and salary):');
  const projected = await users.query().select(['name', 'salary']).execute();
  console.log('   Users with projected fields:', projected.documents);

  // Example 6: Complex query with pagination
  console.log('\n6. Complex query with pagination:');
  const complexQuery = await users
    .query()
    .where('active', '$eq', true)
    .and('age', '$gte', 25)
    .and('age', '$lte', 35)
    .sort('salary', -1)
    .skip(1)
    .limit(2)
    .select(['name', 'age', 'salary', 'city'])
    .execute();
  console.log(
    `   Found ${complexQuery.total} users (paginated):`,
    complexQuery.documents
  );

  // Example 7: Find one document
  console.log('\n7. Find one document:');
  const alice = await users.query().where('name', '$eq', 'Alice').findOne();
  console.log('   Found Alice:', alice);

  // Example 8: Count documents
  console.log('\n8. Count documents:');
  const activeCount = await users.query().where('active', '$eq', true).count();
  console.log(`   Active users count: ${activeCount}`);

  // Example 9: Check existence
  console.log('\n9. Check if document exists:');
  const exists = await users.query().where('name', '$eq', 'Alice').findOne();
  console.log(`   Alice exists: ${exists !== null}`);

  // Example 10: Chained operations
  console.log('\n10. Chained operations:');
  const result = await users
    .query()
    .where('active', '$eq', true)
    .and('salary', '$gt', 70000)
    .sort('age', 1)
    .limit(5)
    .select(['name', 'age', 'salary'])
    .execute();
  console.log(
    `   Chained query result (${result.total} users):`,
    result.documents
  );

  await db.close();
  console.log('\n✅ Database closed');
}

// Run the example
queryBuilderExample().catch(console.error);
