import { createDatabase, createField, validators } from '../dist/index.js';

async function schemaValidationExample() {
  console.log('=== NuboDB Schema Validation Example ===\n');

  try {
    const db = await createDatabase({
      path: './examples/schema-db',
      debug: true,
      schemaValidation: 'strict', // Enable strict validation
    });

    await db.open();
    console.log('✅ Database opened');

      // Define a comprehensive schema using the new field creators and validators
    const userSchema = {
      // Using createField helpers for common types
      name: createField.string({
        required: true,
        minLength: 2,
        maxLength: 50,
      }),
      email: createField.email(true), // Required email with built-in validation
      age: createField.number({
        required: true,
        min: 0,
        max: 150,
        default: 18,
      }),
      
      // Traditional field definitions with enhanced validators
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
        validate: validators.range(0, 100), // Using built-in range validator
      },
      category: {
        type: 'string',
        enum: ['admin', 'user', 'moderator'],
        default: 'user',
      },
      
      // NEW: Additional fields showcasing enhanced validation
      website: createField.url(false, 'https://example.com'), // Optional URL with default
      phone: createField.phone(false), // Optional phone number
      userId: createField.uuid(false), // Optional UUID field
      password: {
        type: 'string',
        required: false,
        validate: validators.minLength(8), // Minimum 8 characters
      },
    };

    // Create collection with schema
    const users = await db.createCollection('users', userSchema, {
      autoIndex: true,
    });

    console.log('✅ Collection created with schema\n');

    // Example 1: Valid document insertion with enhanced fields
    console.log('1. Inserting valid document:');
    try {
      const validUser = await users.insert({
        name: 'John Doe',
        email: 'john@example.com', // Uses built-in email validation
        age: 30,
        tags: ['developer', 'typescript'],
        profile: {
          bio: 'Full-stack developer',
          location: 'San Francisco',
        },
        score: 85,
        category: 'user',
        website: 'https://johndoe.dev', // Valid URL
        phone: '+1-555-123-4567', // Valid phone number
        password: 'securepassword123', // Meets minimum length requirement
      });
      console.log('   ✅ Valid user inserted with ID:', validUser.id);
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
      console.log(
        '   ✅ User with defaults inserted with ID:',
        defaultUser.id
      );
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

    // Example 11: Testing enhanced field validators
    console.log('\n11. Testing enhanced field validators:');
    
    try {
      await users.insert({
        name: 'Validator Test',
        email: 'test@validation.com',
        age: 25,
        website: 'invalid-url', // Should fail URL validation
      });
    } catch (error) {
      console.log('   ❌ URL validation error:', error.message);
    }
    
    try {
      await users.insert({
        name: 'Phone Test',
        email: 'phone@test.com',
        age: 25,
        phone: 'invalid-phone', // Should fail phone validation
      });
    } catch (error) {
      console.log('   ❌ Phone validation error:', error.message);
    }
    
    try {
      await users.insert({
        name: 'Password Test',
        email: 'pwd@test.com',
        age: 25,
        password: 'short', // Should fail minimum length validation
      });
    } catch (error) {
      console.log('   ❌ Password validation error:', error.message);
    }
    
    // Example 12: Successfully using enhanced validators
    console.log('\n12. Valid enhanced field data:');
    try {
      const enhancedUser = await users.insert({
        name: 'Enhanced User',
        email: 'enhanced@example.com',
        age: 28,
        website: 'https://enhanced-user.com',
        phone: '+1-555-987-6543',
        password: 'strongpassword123',
        score: 95, // Uses range validator
      });
      console.log('   ✅ Enhanced user inserted with ID:', enhancedUser.id);
    } catch (error) {
      console.log('   ❌ Validation error:', error.message);
    }

    await db.close();
    console.log('\n✅ Database closed');
  } catch (error) {
    console.error('❌ Error during schema validation example:', error.message);
    process.exit(1);
  }
}

// Run the example
schemaValidationExample().catch(console.error);
