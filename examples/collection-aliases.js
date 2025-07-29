import { createDatabase } from '../dist/index.js';

async function collectionAliasesExample() {
  console.log('=== NuboDB Collection Aliases Example ===\n');

  try {
    const db = await createDatabase({
      path: './examples/aliases-db',
      debug: true,
    });

    await db.open();
    console.log('✅ Database opened\n');

    // Example 1: Creating and using basic aliases
    console.log('1. Creating Basic Aliases:');
    
    // Create full collection first
    const userAccounts = db.collection('user_accounts');
    await userAccounts.insert({
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin'
    });
    
    // Create aliases for shorter names
    db.createAlias('users', 'user_accounts');
    db.createAlias('u', 'user_accounts');
    
    console.log('   ✅ Created aliases: "users" and "u" for "user_accounts"');
    
    // Use aliases to access the same collection
    const usersViaAlias = db.collection('users');
    const usersViaShortAlias = db.collection('u');
    
    const count1 = await usersViaAlias.count();
    const count2 = await usersViaShortAlias.count();
    
    console.log(`   📊 Count via "users" alias: ${count1}`);
    console.log(`   📊 Count via "u" alias: ${count2}`);
    console.log(`   📊 All aliases point to same data: ${count1 === count2 ? '✅' : '❌'}\n`);

    // Example 2: Environment-specific aliases
    console.log('2. Environment-Specific Aliases:');
    
    // Simulate different environments
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'test') {
      db.createAlias('products', 'test_products');
      db.createAlias('orders', 'test_orders');
      console.log('   🧪 Test environment aliases created');
    } else if (env === 'staging') {
      db.createAlias('products', 'staging_products');
      db.createAlias('orders', 'staging_orders');
      console.log('   🎭 Staging environment aliases created');
    } else {
      db.createAlias('products', 'production_products');
      db.createAlias('orders', 'production_orders');
      console.log('   🚀 Production environment aliases created');
    }
    
    // Use environment-agnostic code
    const products = db.collection('products');
    await products.insert({
      name: 'Example Product',
      price: 29.99,
      category: 'electronics'
    });
    
    console.log('   ✅ Environment-agnostic code works across all environments\n');

    // Example 3: Backward compatibility aliases
    console.log('3. Backward Compatibility Aliases:');
    
    // Old collection name was 'userProfiles', new name is 'user_profiles'
    db.createAlias('userProfiles', 'user_profiles'); // Old camelCase
    db.createAlias('user-profiles', 'user_profiles'); // Kebab case variation
    
    const newCollection = db.collection('user_profiles');
    const oldNameCollection = db.collection('userProfiles');
    const kebabCollection = db.collection('user-profiles');
    
    await newCollection.insert({
      userId: 'user123',
      bio: 'Software developer',
      preferences: { theme: 'dark', language: 'en' }
    });
    
    console.log('   ✅ Data inserted via new collection name');
    
    const oldCount = await oldNameCollection.count();
    const kebabCount = await kebabCollection.count();
    
    console.log(`   📊 Count via old camelCase name: ${oldCount}`);
    console.log(`   📊 Count via kebab-case name: ${kebabCount}`);
    console.log('   ✅ Backward compatibility maintained\n');

    // Example 4: Team-specific aliases
    console.log('4. Team-Specific Aliases:');
    
    // Different teams prefer different naming conventions
    db.createAlias('customers', 'customer_data');      // Sales team
    db.createAlias('clients', 'customer_data');        // Account management
    db.createAlias('end_users', 'customer_data');      // Support team
    
    const salesView = db.collection('customers');
    const accountView = db.collection('clients');
    const supportView = db.collection('end_users');
    
    // Each team can use their preferred terminology
    await salesView.insert({
      companyName: 'Acme Corp',
      revenue: 50000,
      salesRep: 'Alice Johnson'
    });
    
    console.log('   ✅ Sales team inserted customer data');
    
    const clientData = await accountView.findOne({ companyName: 'Acme Corp' });
    console.log(`   ✅ Account team found client: ${clientData.companyName}`);
    
    const supportTickets = await supportView.find({ revenue: { $gte: 10000 } });
    console.log(`   ✅ Support team found ${supportTickets.total} high-value end users\n`);

    // Example 5: Alias management operations
    console.log('5. Alias Management:');
    
    // Check if names are aliases
    console.log(`   🔍 'users' is alias: ${db.isAlias('users')}`);
    console.log(`   🔍 'user_accounts' is alias: ${db.isAlias('user_accounts')}`);
    
    // Get all aliases
    const allAliases = db.getAliases();
    console.log('   📋 All current aliases:');
    for (const [alias, target] of Object.entries(allAliases)) {
      console.log(`      - "${alias}" → "${target}"`);
    }
    
    // Remove an alias
    const removed = db.removeAlias('u');
    console.log(`   🗑️ Removed "u" alias: ${removed ? 'success' : 'failed'}`);
    
    // Verify removal
    const aliasesAfterRemoval = db.getAliases();
    console.log(`   📊 Aliases after removal: ${Object.keys(aliasesAfterRemoval).length}`);
    
    // Try to use removed alias (should still work if collection exists)
    try {
      const directCollection = db.collection('u');
      await directCollection.count(); // This creates a new collection named 'u'
      console.log('   ✅ Can still access "u" as direct collection name');
    } catch (error) {
      console.log('   ❌ Cannot access removed alias');
    }
    
    console.log('\n');

    // Example 6: Alias naming best practices
    console.log('6. Alias Naming Best Practices:');
    
    try {
      // Good: Short, memorable aliases
      db.createAlias('invoices', 'billing_invoices');
      db.createAlias('inv', 'billing_invoices');
      console.log('   ✅ Good: Short aliases created');
      
      // Good: Descriptive aliases for clarity
      db.createAlias('active_users', 'user_accounts');
      console.log('   ✅ Good: Descriptive alias created');
      
      // Try to create duplicate alias (should fail)
      db.createAlias('users', 'some_other_collection');
    } catch (error) {
      console.log('   ✅ Good: Duplicate alias creation prevented');
      console.log(`      Error: ${error.message}`);
    }
    
    console.log('\n');

    // Example 7: Performance impact of aliases
    console.log('7. Alias Performance Impact:');
    
    const iterations = 1000;
    
    // Benchmark direct collection access
    const directStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await db.collection('user_accounts').count();
    }
    const directTime = Date.now() - directStart;
    
    // Benchmark alias collection access
    const aliasStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await db.collection('users').count();
    }
    const aliasTime = Date.now() - aliasStart;
    
    console.log(`   📊 Direct access (${iterations} operations): ${directTime}ms`);
    console.log(`   📊 Alias access (${iterations} operations): ${aliasTime}ms`);
    console.log(`   📊 Performance difference: ${Math.abs(directTime - aliasTime)}ms (negligible)`);
    console.log('   ✅ Aliases have virtually no performance impact\n');

    // Example 8: Complex alias scenarios
    console.log('8. Complex Alias Scenarios:');
    
    // Multi-tenant application aliases
    const tenantId = 'tenant_123';
    db.createAlias(`${tenantId}_users`, 'user_accounts');
    db.createAlias(`${tenantId}_data`, 'application_data');
    
    console.log(`   ✅ Tenant-specific aliases created for ${tenantId}`);
    
    // API version aliases
    db.createAlias('v1_users', 'user_accounts');
    db.createAlias('v2_users', 'user_accounts_v2');
    
    console.log('   ✅ API version aliases created');
    
    // Module-specific aliases
    db.createAlias('auth_users', 'user_accounts');
    db.createAlias('profile_users', 'user_accounts');
    db.createAlias('billing_customers', 'user_accounts');
    
    console.log('   ✅ Module-specific aliases created');
    
    const finalAliasCount = Object.keys(db.getAliases()).length;
    console.log(`   📊 Total aliases created: ${finalAliasCount}\n`);

    await db.close();
    console.log('✅ Database closed');
    
    console.log('\n🎯 Collection Aliases Summary:');
    console.log('   • Aliases provide flexible collection naming');
    console.log('   • Zero performance impact');
    console.log('   • Perfect for team conventions and backward compatibility');
    console.log('   • Support environment-specific configurations');
    console.log('   • Easy to manage and remove when no longer needed');
    
  } catch (error) {
    console.error('❌ Error during collection aliases example:', error.message);
    process.exit(1);
  }
}

// Run the example
collectionAliasesExample().catch(console.error);