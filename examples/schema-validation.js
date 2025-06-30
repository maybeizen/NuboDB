import { createDatabase } from '../dist/index.js';

async function schemaValidationExample() {
  console.log('=== NuboDB Schema Validation Example ===\n');

  const db = await createDatabase({
    path: './examples/schema-db',
    debug: true,
    schemaValidation: 'strict', // Enable strict validation
  });

  await db.open();
  console.log('✅ Database opened');

  // Define a comprehensive schema
  const userSchema = {
    name: {
      type: 'string',
      required: true,
      min: 2,
      max: 50,
    },
    email: {
      type: 'string',
      required: true,
      unique: true,
      index: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    age: {
      type: 'number',
      required: true,
      min: 0,
      max: 150,
      default: 18,
    },
    isActive: {
      type: 'boolean',
      default: true,
    },
    tags: {
      type: 'array',
      default: [],
    },
    profile: {
      type: 'object',
      default: {},
    },
    score: {
      type: 'number',
      min: 0,
      max: 100,
      default: 0,
    },
    category: {
      type: 'string',
      enum: ['admin', 'user', 'moderator'],
      default: 'user',
    },
  };

  // Create collection with schema
  const users = await db.createCollection('users', userSchema, {
    autoIndex: true,
  });

  console.log('✅ Collection created with schema\n');

  // Example 1: Valid document insertion
  console.log('1. Inserting valid document:');
  try {
    const validUser = await users.insert({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      tags: ['developer', 'typescript'],
      profile: {
        bio: 'Full-stack developer',
        location: 'San Francisco',
      },
      score: 85,
      category: 'user',
    });
    console.log('   ✅ Valid user inserted:', validUser.document.name);
  } catch (error) {
    console.log('   ❌ Validation error:', error.message);
  }

  // Example 2: Invalid document (missing required field)
  console.log('\n2. Inserting invalid document (missing required field):');
  try {
    await users.insert({
      email: 'invalid@example.com',
      age: 25,
    });
  } catch (error) {
    console.log('   ❌ Validation error:', error.message);
  }

  // Example 3: Invalid email format
  console.log('\n3. Inserting invalid document (bad email format):');
  try {
    await users.insert({
      name: 'Invalid User',
      email: 'invalid-email',
      age: 25,
    });
  } catch (error) {
    console.log('   ❌ Validation error:', error.message);
  }

  // Example 4: Age out of range
  console.log('\n4. Inserting invalid document (age out of range):');
  try {
    await users.insert({
      name: 'Young User',
      email: 'young@example.com',
      age: -5, // Invalid: below minimum
    });
  } catch (error) {
    console.log('   ❌ Validation error:', error.message);
  }

  // Example 5: Invalid enum value
  console.log('\n5. Inserting invalid document (invalid enum):');
  try {
    await users.insert({
      name: 'Enum User',
      email: 'enum@example.com',
      age: 25,
      category: 'invalid-category', // Invalid enum value
    });
  } catch (error) {
    console.log('   ❌ Validation error:', error.message);
  }

  // Example 6: Using defaults
  console.log('\n6. Inserting document with defaults:');
  try {
    const defaultUser = await users.insert({
      name: 'Default User',
      email: 'default@example.com',
      // age will default to 18
      // isActive will default to true
      // tags will default to []
      // profile will default to {}
      // score will default to 0
      // category will default to 'user'
    });
    console.log('   ✅ User with defaults inserted:', defaultUser.document);
  } catch (error) {
    console.log('   ❌ Validation error:', error.message);
  }

  // Example 7: Duplicate email (unique constraint)
  console.log('\n7. Inserting duplicate email:');
  try {
    await users.insert({
      name: 'Duplicate User',
      email: 'john@example.com', // Same as first user
      age: 25,
    });
  } catch (error) {
    console.log('   ❌ Validation error:', error.message);
  }

  // Example 8: Valid update
  console.log('\n8. Updating with valid data:');
  try {
    const updateResult = await users.update(
      { name: 'John Doe' },
      { age: 31, score: 90 }
    );
    console.log(
      '   ✅ Valid update completed:',
      updateResult.modifiedCount,
      'documents'
    );
  } catch (error) {
    console.log('   ❌ Validation error:', error.message);
  }

  // Example 9: Invalid update
  console.log('\n9. Updating with invalid data:');
  try {
    await users.update(
      { name: 'John Doe' },
      { age: 200 } // Invalid: above maximum
    );
  } catch (error) {
    console.log('   ❌ Validation error:', error.message);
  }

  // Example 10: Schema validation modes
  console.log('\n10. Testing different validation modes:');

  // Create collection with warn mode
  const warnUsers = await db.createCollection('warn-users', userSchema, {
    schemaValidation: 'warn',
  });

  try {
    await warnUsers.insert({
      name: 'Warn User',
      email: 'warn@example.com',
      age: 200, // Invalid but will only warn
    });
    console.log('   ✅ Document inserted with warning (warn mode)');
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  await db.close();
  console.log('\n✅ Database closed');
}

// Run the example
schemaValidationExample().catch(console.error);
