/**
 * Script to run Sequelize migrations
 * This script loads environment variables and runs all pending migrations
 */

import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';
import { sequelize, usePostgres, nodeEnv } from '../config/database.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create SequelizeMeta table if it doesn't exist
async function ensureMetaTable() {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = usePostgres ? 'SequelizeMeta' : 'SequelizeMeta';
  try {
    await queryInterface.describeTable(tableName);
  } catch (error) {
    // Table doesn't exist, create it
    await queryInterface.createTable(tableName, {
      name: {
        type: sequelize.constructor.DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
    });
    logger.info('Created SequelizeMeta table');
  }
}

// Get executed migrations
async function getExecutedMigrations() {
  await ensureMetaTable();
  // Use quoted identifier for PostgreSQL to handle case sensitivity
  const tableName = usePostgres ? '"SequelizeMeta"' : 'SequelizeMeta';
  const [results] = await sequelize.query(
    `SELECT name FROM ${tableName} ORDER BY name`
  );
  return results.map((r) => r.name);
}

// Load and execute migration
async function executeMigration(filename) {
  const migrationPath = path.join(__dirname, '../../migrations', filename);
  let migration;
  
  try {
    if (filename.endsWith('.cjs')) {
      // CommonJS migration
      const createRequire = (await import('module')).createRequire;
      const require = createRequire(import.meta.url);
      migration = require(migrationPath);
      migration = migration.default || migration;
    } else {
      // ES module migration
      const fileUrl = `file://${migrationPath.replace(/\\/g, '/')}`;
      const module = await import(fileUrl);
      migration = module.default || module;
    }
  } catch (e) {
    logger.error(`Error loading migration ${filename}`, { error: e.message });
    throw e;
  }

  if (!migration || !migration.up) {
    throw new Error(`Invalid migration file: ${filename} - missing 'up' function`);
  }

  const queryInterface = sequelize.getQueryInterface();
  const sequelizeConstructor = sequelize.constructor;

  // Wrap migration in try-catch to handle already-existing columns/tables
  try {
    await migration.up(queryInterface, sequelizeConstructor);
  } catch (error) {
    // If column/table already exists, it's okay - probably created by sync
    if (error.message && (
      error.message.includes('already exists') ||
      error.message.includes('duplicate') ||
      error.message.includes('unique constraint') ||
      error.message.includes('unique violation') ||
      error.code === '42701' || // PostgreSQL duplicate column
      error.code === '23505'     // PostgreSQL unique constraint violation
    )) {
      logger.warn(`Skipped (already exists): ${filename}`);
      // Still record as executed since the change is already in place
    } else {
      throw error;
    }
  }
  
  // Record migration using parameterized query to prevent SQL injection
  const tableName = usePostgres ? '"SequelizeMeta"' : 'SequelizeMeta';
  await sequelize.query(
    `INSERT INTO ${tableName} (name) VALUES ($1)`,
    { replacements: [filename], type: sequelize.QueryTypes.INSERT }
  );
  
  logger.info(`Executed: ${filename}`);
}

async function runMigrations() {
  try {
    logger.info(`Running migrations in ${nodeEnv} environment`, {
      database: usePostgres ? 'PostgreSQL' : 'SQLite'
    });
    
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = await readdir(migrationsDir);
    const migrationFiles = files
      .filter((f) => f.endsWith('.js') || f.endsWith('.cjs'))
      .sort();

    // Get executed migrations
    const executed = await getExecutedMigrations();
    logger.info(`Found ${executed.length} executed migrations`, {
      executedCount: executed.length
    });

    // Find pending migrations
    const pending = migrationFiles.filter((f) => !executed.includes(f));

    if (pending.length === 0) {
      logger.info('All migrations are up to date');
      await sequelize.close();
      return;
    }

    logger.info(`Found ${pending.length} pending migration(s)`, {
      pendingCount: pending.length,
      pendingMigrations: pending
    });

    // Execute pending migrations
    for (const file of pending) {
      await executeMigration(file);
    }

    logger.info(`Successfully executed ${pending.length} migration(s)`, {
      executedCount: pending.length
    });
    await sequelize.close();
  } catch (error) {
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    await sequelize.close();
    process.exit(1);
  }
}

runMigrations();
