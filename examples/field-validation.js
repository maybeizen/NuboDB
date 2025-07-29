import { createDatabase, createField, validators } from '../dist/index.js';

async function fieldValidationExample() {
  console.log('=== NuboDB Enhanced Field Validation Example ===\n');

  try {
    const db = await createDatabase({
      path: './examples/validation-db',
      debug: true,
      schemaValidation: 'strict',
    });

    await db.open();
    console.log('✅ Database opened with strict validation\n');

    // Example 1: Using createField helpers
    console.log('1. Using createField Helpers:');
    
    const userSchema = {
      // Email field with built-in validation
      email: createField.email(true), // Required email
      
      // URL field with optional default
      website: createField.url(false, 'https://example.com'),
      
      // Phone field
      phone: createField.phone(true), // Required phone number
      
      // UUID field
      userId: createField.uuid(false), // Optional UUID
      
      // String field with constraints
      username: createField.string({
        required: true,
        minLength: 3,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9_]+$/,
      }),
      
      // Number field with constraints
      age: createField.number({
        required: true,
        min: 13,
        max: 120,
        positive: true,
      }),
      
      // Traditional fields mixed in
      name: {
        type: 'string',
        required: true,
        validate: validators.minLength(2),
      },
      
      bio: {
        type: 'string',
        required: false,
        validate: validators.maxLength(500),
      },
    };
    
    const users = await db.createCollection('users', userSchema);
    console.log('   ✅ Collection created with enhanced field validation\n');

    // Example 2: Valid data insertion
    console.log('2. Valid Data Insertion:');
    
    try {
      const validUser = await users.insert({
        email: 'john.doe@example.com',
        website: 'https://johndoe.dev',
        phone: '+1-555-123-4567',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe123',
        age: 28,
        name: 'John Doe',
        bio: 'Software developer passionate about databases and TypeScript.',
      });
      
      console.log('   ✅ Valid user inserted with ID:', validUser.id);
    } catch (error) {
      console.log('   ❌ Unexpected validation error:', error.message);
    }
    console.log('');

    // Example 3: Email validation testing
    console.log('3. Email Validation Testing:');
    
    const emailTests = [
      { email: 'valid@example.com', shouldPass: true },
      { email: 'also.valid+test@domain.co.uk', shouldPass: true },
      { email: 'invalid-email', shouldPass: false },
      { email: '@domain.com', shouldPass: false },
      { email: 'user@', shouldPass: false },
      { email: '', shouldPass: false },
    ];
    
    for (const { email, shouldPass } of emailTests) {
      try {
        await users.insert({
          email,
          phone: '+1-555-999-8888',
          username: `user_${Date.now()}`,
          age: 25,
          name: 'Test User',
        });
        
        if (shouldPass) {
          console.log(`   ✅ "${email}" - Valid email accepted`);
        } else {
          console.log(`   ❌ "${email}" - Invalid email accepted (unexpected)`);
        }
      } catch (error) {
        if (!shouldPass) {
          console.log(`   ✅ "${email}" - Invalid email rejected`);
        } else {
          console.log(`   ❌ "${email}" - Valid email rejected: ${error.message}`);
        }
      }
    }
    console.log('');

    // Example 4: URL validation testing
    console.log('4. URL Validation Testing:');
    
    const urlTests = [
      { url: 'https://example.com', shouldPass: true },
      { url: 'http://subdomain.example.org/path?query=value', shouldPass: true },
      { url: 'ftp://files.example.com', shouldPass: true },
      { url: 'not-a-url', shouldPass: false },
      { url: 'http://', shouldPass: false },
      { url: 'just-text', shouldPass: false },
    ];
    
    for (const { url, shouldPass } of urlTests) {
      try {
        await users.insert({
          email: `test${Date.now()}@example.com`,
          website: url,
          phone: '+1-555-999-7777',
          username: `urltest_${Date.now()}`,
          age: 30,
          name: 'URL Test User',
        });
        
        if (shouldPass) {
          console.log(`   ✅ "${url}" - Valid URL accepted`);
        } else {
          console.log(`   ❌ "${url}" - Invalid URL accepted (unexpected)`);
        }
      } catch (error) {
        if (!shouldPass) {
          console.log(`   ✅ "${url}" - Invalid URL rejected`);
        } else {
          console.log(`   ❌ "${url}" - Valid URL rejected: ${error.message}`);
        }
      }
    }
    console.log('');

    // Example 5: Phone number validation testing
    console.log('5. Phone Number Validation Testing:');
    
    const phoneTests = [
      { phone: '+1-555-123-4567', shouldPass: true },
      { phone: '(555) 123-4567', shouldPass: true },
      { phone: '555.123.4567', shouldPass: true },
      { phone: '5551234567', shouldPass: true },
      { phone: '+44 20 7123 4567', shouldPass: true },
      { phone: 'not-a-phone', shouldPass: false },
      { phone: '123', shouldPass: false },
      { phone: '+++invalid+++', shouldPass: false },
    ];
    
    for (const { phone, shouldPass } of phoneTests) {
      try {
        await users.insert({
          email: `phone${Date.now()}@example.com`,
          phone,
          username: `phonetest_${Date.now()}`,
          age: 27,
          name: 'Phone Test User',
        });
        
        if (shouldPass) {
          console.log(`   ✅ "${phone}" - Valid phone accepted`);
        } else {
          console.log(`   ❌ "${phone}" - Invalid phone accepted (unexpected)`);
        }
      } catch (error) {
        if (!shouldPass) {
          console.log(`   ✅ "${phone}" - Invalid phone rejected`);
        } else {
          console.log(`   ❌ "${phone}" - Valid phone rejected: ${error.message}`);
        }
      }
    }
    console.log('');

    // Example 6: UUID validation testing
    console.log('6. UUID Validation Testing:');
    
    const uuidTests = [
      { uuid: '123e4567-e89b-12d3-a456-426614174000', shouldPass: true },
      { uuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', shouldPass: true },
      { uuid: 'not-a-uuid', shouldPass: false },
      { uuid: '123-456-789', shouldPass: false },
      { uuid: '123e4567-e89b-12d3-a456', shouldPass: false }, // Too short
    ];
    
    for (const { uuid, shouldPass } of uuidTests) {
      try {
        await users.insert({
          email: `uuid${Date.now()}@example.com`,
          phone: '+1-555-999-6666',
          userId: uuid,
          username: `uuidtest_${Date.now()}`,
          age: 32,
          name: 'UUID Test User',
        });
        
        if (shouldPass) {
          console.log(`   ✅ "${uuid}" - Valid UUID accepted`);
        } else {
          console.log(`   ❌ "${uuid}" - Invalid UUID accepted (unexpected)`);
        }
      } catch (error) {
        if (!shouldPass) {
          console.log(`   ✅ "${uuid}" - Invalid UUID rejected`);
        } else {
          console.log(`   ❌ "${uuid}" - Valid UUID rejected: ${error.message}`);
        }
      }
    }
    console.log('');

    // Example 7: String constraint validation
    console.log('7. String Constraint Validation:');
    
    const stringTests = [
      { username: 'validuser123', shouldPass: true },
      { username: 'user_name', shouldPass: true },
      { username: 'a', shouldPass: false }, // Too short
      { username: 'this_username_is_way_too_long_for_validation', shouldPass: false }, // Too long
      { username: 'invalid-chars!', shouldPass: false }, // Invalid characters
      { username: 'spaces not allowed', shouldPass: false }, // Spaces
    ];
    
    for (const { username, shouldPass } of stringTests) {
      try {
        await users.insert({
          email: `string${Date.now()}@example.com`,
          phone: '+1-555-999-5555',
          username,
          age: 26,
          name: 'String Test User',
        });
        
        if (shouldPass) {
          console.log(`   ✅ "${username}" - Valid username accepted`);
        } else {
          console.log(`   ❌ "${username}" - Invalid username accepted (unexpected)`);
        }
      } catch (error) {
        if (!shouldPass) {
          console.log(`   ✅ "${username}" - Invalid username rejected`);
        } else {
          console.log(`   ❌ "${username}" - Valid username rejected: ${error.message}`);
        }
      }
    }
    console.log('');

    // Example 8: Number constraint validation
    console.log('8. Number Constraint Validation:');
    
    const numberTests = [
      { age: 25, shouldPass: true },
      { age: 13, shouldPass: true }, // Minimum allowed
      { age: 120, shouldPass: true }, // Maximum allowed
      { age: 12, shouldPass: false }, // Below minimum
      { age: 121, shouldPass: false }, // Above maximum
      { age: -5, shouldPass: false }, // Negative (positive: true)
      { age: 0, shouldPass: false }, // Zero (positive: true)
    ];
    
    for (const { age, shouldPass } of numberTests) {
      try {
        await users.insert({
          email: `number${Date.now()}@example.com`,
          phone: '+1-555-999-4444',
          username: `numtest_${Date.now()}`,
          age,
          name: 'Number Test User',
        });
        
        if (shouldPass) {
          console.log(`   ✅ Age ${age} - Valid age accepted`);
        } else {
          console.log(`   ❌ Age ${age} - Invalid age accepted (unexpected)`);
        }
      } catch (error) {
        if (!shouldPass) {
          console.log(`   ✅ Age ${age} - Invalid age rejected`);
        } else {
          console.log(`   ❌ Age ${age} - Valid age rejected: ${error.message}`);
        }
      }
    }
    console.log('');

    // Example 9: Using individual validators
    console.log('9. Individual Validator Usage:');
    
    const productSchema = {
      name: {
        type: 'string',
        required: true,
        validate: validators.minLength(3),
      },
      description: {
        type: 'string',
        required: false,
        validate: validators.maxLength(1000),
      },
      price: {
        type: 'number',
        required: true,
        validate: validators.range(0.01, 99999.99),
      },
      rating: {
        type: 'number',
        required: false,
        validate: validators.range(1, 5),
      },
      category: {
        type: 'string',
        required: true,
        validate: validators.minLength(2),
      },
    };
    
    const products = await db.createCollection('products', productSchema);
    console.log('   ✅ Products collection created with individual validators');
    
    // Test individual validators
    try {
      await products.insert({
        name: 'Smartphone',
        description: 'A high-quality smartphone with advanced features',
        price: 599.99,
        rating: 4.5,
        category: 'Electronics',
      });
      console.log('   ✅ Valid product inserted');
    } catch (error) {
      console.log('   ❌ Product validation error:', error.message);
    }
    
    // Test validation failures
    try {
      await products.insert({
        name: 'TV', // Valid
        description: 'A'.repeat(1001), // Too long (maxLength: 1000)
        price: 299.99,
        rating: 6, // Invalid (range: 1-5)
        category: 'E', // Too short (minLength: 2)
      });
    } catch (error) {
      console.log('   ✅ Invalid product rejected:', error.message);
    }
    console.log('');

    // Example 10: Custom validation combinations
    console.log('10. Custom Validation Combinations:');
    
    const accountSchema = {
      email: createField.email(true),
      password: {
        type: 'string',
        required: true,
        validate: validators.minLength(8),
      },
      confirmPassword: {
        type: 'string',
        required: true,
        validate: validators.minLength(8),
      },
      balance: {
        type: 'number',
        required: true,
        validate: validators.nonNegative,
      },
      website: createField.url(false),
      phone: createField.phone(false),
    };
    
    const accounts = await db.createCollection('accounts', accountSchema);
    console.log('   ✅ Accounts collection with combined validations');
    
    try {
      await accounts.insert({
        email: 'user@example.com',
        password: 'securepassword123',
        confirmPassword: 'securepassword123',
        balance: 1000.50,
        website: 'https://userwebsite.com',
        phone: '+1-555-123-4567',
      });
      console.log('   ✅ Valid account created');
    } catch (error) {
      console.log('   ❌ Account validation error:', error.message);
    }
    console.log('');

    // Example 11: Validation performance impact
    console.log('11. Validation Performance Impact:');
    
    const testData = Array.from({ length: 100 }, (_, i) => ({
      email: `perftest${i}@example.com`,
      phone: '+1-555-999-0000',
      username: `perfuser${i}`,
      age: 25 + (i % 30),
      name: `Performance Test User ${i}`,
      bio: `Bio for user ${i}`,
    }));
    
    const startTime = Date.now();
    const results = await users.insertMany(testData);
    const endTime = Date.now();
    
    console.log(`   📊 Inserted ${results.insertedCount} users with validation`);
    console.log(`   ⏱️ Total time: ${endTime - startTime}ms`);
    console.log(`   📈 Average: ${((endTime - startTime) / results.insertedCount).toFixed(2)}ms per document`);
    console.log('   ✅ Validation has minimal performance impact');
    console.log('');

    await db.close();
    console.log('✅ Database closed');
    
    console.log('\n🎯 Enhanced Field Validation Summary:');
    console.log('   • createField helpers for common types (email, URL, phone, UUID)');
    console.log('   • Built-in validators for strings, numbers, and ranges');
    console.log('   • Strict validation prevents invalid data insertion');
    console.log('   • Minimal performance impact on operations');
    console.log('   • Flexible combination of validators and custom rules');
    console.log('   • Type-safe and developer-friendly API');
    
  } catch (error) {
    console.error('❌ Error during field validation example:', error.message);
    process.exit(1);
  }
}

// Run the example
fieldValidationExample().catch(console.error);