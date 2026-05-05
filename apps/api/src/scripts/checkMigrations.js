/**
 * Script to check migration status
 */

import { readdir } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';
import { sequelize, usePostgres } from '../config/database.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkMigrations() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = await readdir(migrationsDir);
    const migrationFiles = files
      .filter((f) => f.endsWith('.js') || f.endsWith('.cjs'))
      .sort();

    // Get executed migrations
    const tableName = usePostgres ? '"SequelizeMeta"' : 'SequelizeMeta';
    let executed = [];
    try {
      const [results] = await sequelize.query(
        `SELECT name FROM ${tableName} ORDER BY name`
      );
      executed = results.map((r) => r.name);
    } catch (error) {
      logger.warn('SequelizeMeta table does not exist yet');
    }

    const pending = migrationFiles.filter((f) => !executed.includes(f));
    
    logger.info('Migration status', {
      totalFiles: migrationFiles.length,
      executedCount: executed.length,
      pendingCount: pending.length,
      executedMigrations: executed.length > 0 ? executed : undefined,
      pendingMigrations: pending.length > 0 ? pending : undefined,
      allUpToDate: pending.length === 0
    });

    await sequelize.close();
  } catch (error) {
    logger.error('Error checking migrations', { error: error.message, stack: error.stack });
    await sequelize.close();
    process.exit(1);
  }
}

checkMigrations();
