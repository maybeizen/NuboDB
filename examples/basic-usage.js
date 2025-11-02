import { createDatabase } from '../dist/index.js';

async function basicUsage() {
  console.log('=== NuboDB Basic Usage Example ===\n');

  try {
    const db = await createDatabase({
      path: './examples/basic-db',
      debug: true,
      logLevel: 'info',
    });

    await db.open();
    console.log('✅ Database opened successfully');

    const users = db.collection('users');
    const insertResult = await users.insert({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      isActive: true,
      tags: ['developer', 'typescript'],
      profile: {
        bio: 'Full-stack developer',
        location: 'San Francisco',
      },
    });

    console.log('✅ Inserted user with ID:', insertResult.id);
    const batchResult = await users.insertMany([
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25,
        isActive: true,
      },
      {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        age: 35,
        isActive: false,
      },
      {
        name: 'Alice Brown',
        email: 'alice@example.com',
        age: 28,
        isActive: true,
      },
    ]);

    console.log('✅ Batch inserted:', batchResult.insertedCount, 'users');
    const allUsers = await users.find();
    console.log('✅ Found', allUsers.total, 'users');
    const activeUsers = await users.find({ isActive: true });
    console.log('✅ Found', activeUsers.total, 'active users');
    const john = await users.findOne({ name: 'John Doe' });
    console.log('✅ Found John:', john?.name);
    const userById = await users.findById(insertResult.id);
    console.log('✅ Found user by ID:', userById?.name);
    const updateResult = await users.update(
      { name: 'John Doe' },
      { age: 31, lastUpdated: new Date() }
    );
    console.log('✅ Updated', updateResult.modifiedCount, 'documents');
    const upsertResult = await users.upsert(
      { email: 'newuser@example.com' },
      { name: 'New User', age: 22, isActive: true }
    );
    console.log('✅ Upsert result:', upsertResult);
    const deleteResult = await users.delete({ name: 'Bob Johnson' });
    console.log('✅ Deleted', deleteResult.deletedCount, 'documents');
    const count = await users.count();
    console.log('✅ Total users:', count);
    const isEmpty = await users.isEmpty();
    console.log('✅ Collection is empty:', isEmpty);
    const stats = await users.stats();
    console.log('✅ Collection stats:', stats);

    db.createAlias('u', 'users');
    const usersViaAlias = db.collection('u');
    const aliasCount = await usersViaAlias.count();
    console.log('✅ Count via alias:', aliasCount);

    const health = await db.validate();
    console.log('✅ Database health:', health.isValid ? 'Healthy' : 'Issues found');

    users.clearCache();
    console.log('✅ Cache cleared');

    await db.close();
    console.log('✅ Database closed');
  } catch (error) {
    console.error('❌ Error during example execution:', error.message);
    process.exit(1);
  }
}

basicUsage().catch(console.error);
