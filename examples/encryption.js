import { createDatabase } from '../dist/index.js';

async function encryptionExample() {
  console.log('=== NuboDB Encryption Example ===\n');

  try {
    // Create database with encryption enabled
    const db = await createDatabase({
      path: './examples/encrypted-db',
      debug: true,
      encrypt: true,
      encryptionKey: 'super-secret-key',
      encryptionMethod: 'aes-256-cbc',
    });

    await db.open();
    console.log('✅ Encrypted database opened');

    const users = db.collection('users');

    // Example 1: Insert sensitive data
    console.log('1. Inserting sensitive data:');
    const sensitiveUser = await users.insert({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashed-password-123',
      creditCard: '4111-1111-1111-1111',
      ssn: '123-45-6789',
      medicalInfo: {
        bloodType: 'O+',
        allergies: ['peanuts', 'shellfish'],
        medications: ['aspirin', 'vitamin-d'],
      },
    });

    console.log(
      '   ✅ Sensitive user inserted with ID:',
      sensitiveUser.insertedId
    );

    // Example 2: Insert more sensitive data
    console.log('\n2. Inserting more sensitive data:');
    await users.insertMany([
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'hashed-password-456',
        creditCard: '5555-5555-5555-5555',
        ssn: '987-65-4321',
        medicalInfo: {
          bloodType: 'A-',
          allergies: ['latex'],
          medications: ['insulin'],
        },
      },
      {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        password: 'hashed-password-789',
        creditCard: '4444-4444-4444-4444',
        ssn: '111-22-3333',
        medicalInfo: {
          bloodType: 'B+',
          allergies: [],
          medications: ['blood-pressure-med'],
        },
      },
    ]);

    console.log('   ✅ Multiple sensitive users inserted');

    // Example 3: Query encrypted data
    console.log('\n3. Querying encrypted data:');
    const allUsers = await users.find();
    console.log('   ✅ Found', allUsers.total, 'encrypted users');

    const john = await users.findOne({ name: 'John Doe' });
    console.log('   ✅ Found John:', john?.name, 'with SSN:', john?.ssn);

    // Example 4: Update encrypted data
    console.log('\n4. Updating encrypted data:');
    const updateResult = await users.update(
      { name: 'John Doe' },
      {
        creditCard: '4111-1111-1111-2222',
        medicalInfo: {
          ...john.medicalInfo,
          medications: [...john.medicalInfo.medications, 'new-medication'],
        },
      }
    );

    console.log(
      '   ✅ Updated',
      updateResult.modifiedCount,
      'encrypted documents'
    );

    // Example 5: Find by encrypted fields
    console.log('\n5. Finding by encrypted fields:');
    const usersWithAllergies = await users.find({
      'medicalInfo.allergies': { $exists: true, $ne: [] },
    });

    console.log(
      '   ✅ Found',
      usersWithAllergies.total,
      'users with allergies:'
    );
    usersWithAllergies.documents.forEach(user => {
      console.log(
        `      - ${user.name}: ${user.medicalInfo.allergies.join(', ')}`
      );
    });

    // Example 6: Complex queries on encrypted data
    console.log('\n6. Complex queries on encrypted data:');
    const usersWithSpecificMedication = await users.find({
      'medicalInfo.medications': { $in: ['insulin'] },
    });

    console.log(
      '   ✅ Found',
      usersWithSpecificMedication.total,
      'users taking insulin:'
    );
    usersWithSpecificMedication.documents.forEach(user => {
      console.log(`      - ${user.name} (${user.medicalInfo.bloodType})`);
    });

    // Example 7: Database statistics
    console.log('\n7. Database statistics:');
    const stats = await users.stats();
    console.log('   📊 Collection stats:', {
      totalDocuments: stats.totalDocuments,
      totalSize: stats.totalSize,
      cacheSize: stats.cacheSize,
    });

    // Example 8: Verify data integrity
    console.log('\n8. Verifying data integrity:');
    const johnUpdated = await users.findOne({ name: 'John Doe' });
    console.log("   ✅ John's updated credit card:", johnUpdated.creditCard);
    console.log(
      "   ✅ John's medications:",
      johnUpdated.medicalInfo.medications
    );

    // Example 9: Delete encrypted data
    console.log('\n9. Deleting encrypted data:');
    const deleteResult = await users.delete({ name: 'Bob Johnson' });
    console.log(
      '   ✅ Deleted',
      deleteResult.deletedCount,
      'encrypted documents'
    );

    // Example 10: Count remaining documents
    console.log('\n10. Counting remaining documents:');
    const remainingCount = await users.count();
    console.log('   ✅ Remaining encrypted documents:', remainingCount);

    await db.close();
    console.log('\n✅ Encrypted database closed');

    // Example 11: Demonstrate that data is actually encrypted
    console.log('\n11. Data encryption verification:');
    console.log('   🔐 Check the database files in ./examples/encrypted-db/');
    console.log(
      '   🔐 You should see encrypted JSON files that are not human-readable'
    );
    console.log(
      '   🔐 The data is automatically decrypted when accessed through NuboDB'
    );
  } catch (error) {
    console.error('❌ Error during encryption example:', error.message);
    process.exit(1);
  }
}

// Run the example
encryptionExample().catch(console.error);
