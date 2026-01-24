/**
 * Script to validate database performance with indexes
 * Tests critical queries to ensure indexes are being used
 */

import dotenv from 'dotenv';
import { sequelize, User, Content, Payment, Platform, Media } from '../models/index.js';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
// For local development: loads from .env file
// For Render/production: uses Environment Variables from Render dashboard
dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });
const nodeEnv = process.env.NODE_ENV || 'development';

const databaseUrl = process.env.DATABASE_URL;
const usePostgres = Boolean(databaseUrl);

async function checkIndexes() {
  console.log('🔍 Checking database indexes...\n');
  
  if (!usePostgres) {
    console.log('⚠️  Index validation is only available for PostgreSQL');
    await sequelize.close();
    return;
  }

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Check critical indexes
    const indexes = [
      { table: 'Users', name: 'users_license_expires_at_idx', columns: ['licenseExpiresAt'] },
      { table: 'Contents', name: 'contents_scheduled_for_idx', columns: ['scheduledFor'] },
      { table: 'Contents', name: 'contents_status_idx', columns: ['status'] },
      { table: 'Contents', name: 'contents_user_scheduled_idx', columns: ['userId', 'scheduledFor'] },
      { table: 'Contents', name: 'contents_user_status_idx', columns: ['userId', 'status'] },
      { table: 'Payments', name: 'payments_paid_at_idx', columns: ['paidAt'] },
      { table: 'Payments', name: 'payments_status_idx', columns: ['status'] },
      { table: 'Payments', name: 'payments_user_status_idx', columns: ['userId', 'status'] },
      { table: 'Platforms', name: 'platforms_expires_at_idx', columns: ['expiresAt'] },
      { table: 'Platforms', name: 'platforms_user_platform_unique_idx', columns: ['userId', 'platform'], unique: true },
      { table: 'Media', name: 'media_user_id_idx', columns: ['userId'] },
    ];

    const [results] = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    const existingIndexes = results.map(r => r.indexname);
    
    console.log('📊 Index Status:\n');
    let allPresent = true;
    
    for (const index of indexes) {
      const exists = existingIndexes.includes(index.name);
      const status = exists ? '✅' : '❌';
      const type = index.unique ? 'UNIQUE' : 'INDEX';
      console.log(`${status} ${index.table}.${index.name} (${type} on ${index.columns.join(', ')})`);
      if (!exists) allPresent = false;
    }

    console.log('\n📈 Query Performance Tests:\n');

    // Test 1: Content by scheduled date
    console.log('1. Testing: Content queries by scheduledFor...');
    const start1 = Date.now();
    await Content.findAll({
      where: { scheduledFor: { [sequelize.Op.gte]: new Date() } },
      limit: 100
    });
    const time1 = Date.now() - start1;
    console.log(`   ⏱️  Query time: ${time1}ms`);

    // Test 2: Content by status
    console.log('2. Testing: Content queries by status...');
    const start2 = Date.now();
    await Content.findAll({
      where: { status: 'scheduled' },
      limit: 100
    });
    const time2 = Date.now() - start2;
    console.log(`   ⏱️  Query time: ${time2}ms`);

    // Test 3: Payments by status
    console.log('3. Testing: Payment queries by status...');
    const start3 = Date.now();
    await Payment.findAll({
      where: { status: 'completed' },
      limit: 100
    });
    const time3 = Date.now() - start3;
    console.log(`   ⏱️  Query time: ${time3}ms`);

    // Test 4: Users with expiring licenses
    console.log('4. Testing: Users with expiring licenses...');
    const start4 = Date.now();
    await User.findAll({
      where: {
        licenseExpiresAt: {
          [sequelize.Op.between]: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
        }
      },
      limit: 100
    });
    const time4 = Date.now() - start4;
    console.log(`   ⏱️  Query time: ${time4}ms`);

    console.log('\n✅ Performance validation complete!');
    if (!allPresent) {
      console.log('\n⚠️  Some indexes are missing. Run migrations to create them.');
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

checkIndexes();
