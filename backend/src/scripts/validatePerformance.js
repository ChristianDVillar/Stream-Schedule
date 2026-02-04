/**
 * Script to validate database performance with indexes
 * Tests critical queries to ensure indexes are being used
 */

import { sequelize, User, Content, Payment, Platform, Media } from '../models/index.js';
import { usePostgres } from '../config/database.js';
import logger from '../utils/logger.js';

async function checkIndexes() {
  logger.info('Checking database indexes');
  
  if (!usePostgres) {
    logger.warn('Index validation is only available for PostgreSQL');
    await sequelize.close();
    return;
  }

  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

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
    
    logger.info('Index Status');
    let allPresent = true;
    const indexStatus = [];
    
    for (const index of indexes) {
      const exists = existingIndexes.includes(index.name);
      const type = index.unique ? 'UNIQUE' : 'INDEX';
      indexStatus.push({
        table: index.table,
        name: index.name,
        type,
        columns: index.columns,
        exists
      });
      if (!exists) allPresent = false;
    }
    
    logger.info('Index check results', { indexes: indexStatus, allPresent });

    logger.info('Query Performance Tests');

    // Test 1: Content by scheduled date
    const start1 = Date.now();
    await Content.findAll({
      where: { scheduledFor: { [sequelize.Op.gte]: new Date() } },
      limit: 100
    });
    const time1 = Date.now() - start1;
    logger.info('Content queries by scheduledFor', { queryTime: `${time1}ms` });

    // Test 2: Content by status
    const start2 = Date.now();
    await Content.findAll({
      where: { status: 'scheduled' },
      limit: 100
    });
    const time2 = Date.now() - start2;
    logger.info('Content queries by status', { queryTime: `${time2}ms` });

    // Test 3: Payments by status
    const start3 = Date.now();
    await Payment.findAll({
      where: { status: 'completed' },
      limit: 100
    });
    const time3 = Date.now() - start3;
    logger.info('Payment queries by status', { queryTime: `${time3}ms` });

    // Test 4: Users with expiring licenses
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
    logger.info('Users with expiring licenses', { queryTime: `${time4}ms` });

    logger.info('Performance validation complete', { allIndexesPresent: allPresent });
    if (!allPresent) {
      logger.warn('Some indexes are missing. Run migrations to create them.');
    }

    await sequelize.close();
  } catch (error) {
    logger.error('Error validating performance', { error: error.message, stack: error.stack });
    await sequelize.close();
    process.exit(1);
  }
}

checkIndexes();
