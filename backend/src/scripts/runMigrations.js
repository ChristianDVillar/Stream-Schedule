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
  // When using QueryTypes.SELECT, sequelize.query returns the array directly
  const results = await sequelize.query(
    `SELECT name FROM ${tableName} ORDER BY name`,
    { type: sequelize.QueryTypes.SELECT }
  );
  // Ensure results is an array and map to get names
  return Array.isArray(results) ? results.map((r) => r.name) : [];
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
  
  // Record migration - use QueryInterface for safety (works with both PostgreSQL and SQLite)
  try {
    const queryInterface = sequelize.getQueryInterface();
    // Check if migration already recorded
    const tableName = usePostgres ? '"SequelizeMeta"' : 'SequelizeMeta';
    const checkQuery = usePostgres 
      ? `SELECT name FROM ${tableName} WHERE name = $1`
      : `SELECT name FROM ${tableName} WHERE name = ?`;
    
    const [existing] = await sequelize.query(checkQuery, {
      bind: [filename],
      type: sequelize.QueryTypes.SELECT,
    });
    
    if (!existing || existing.length === 0) {
      // Use QueryInterface to insert (handles both PostgreSQL and SQLite)
      await queryInterface.bulkInsert('SequelizeMeta', [{ name: filename }], {
        ignoreDuplicates: true,
      });
    }
  } catch (error) {
    // If bulkInsert fails, try direct insert with proper escaping and conflict handling
    logger.warn('Using fallback method to record migration', { error: error.message });
    const tableName = usePostgres ? '"SequelizeMeta"' : 'SequelizeMeta';
    // Escape filename to prevent SQL injection
    const escapedFilename = filename.replace(/'/g, "''");
    
    if (usePostgres) {
      // PostgreSQL: use ON CONFLICT
      await sequelize.query(
        `INSERT INTO ${tableName} (name) VALUES ('${escapedFilename}') ON CONFLICT (name) DO NOTHING`,
        { type: sequelize.QueryTypes.INSERT }
      );
    } else {
      // SQLite: use INSERT OR IGNORE
      await sequelize.query(
        `INSERT OR IGNORE INTO ${tableName} (name) VALUES ('${escapedFilename}')`,
        { type: sequelize.QueryTypes.INSERT }
      );
    }
  }
  
  logger.info(`Executed: ${filename}`);
}

// Retry authenticate with backoff (helps when DB is waking up, e.g. Render free tier)
const AUTH_RETRIES = 5;
const AUTH_RETRY_DELAY_MS = 5000;

async function authenticateWithRetry() {
  let lastError;
  for (let attempt = 1; attempt <= AUTH_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      return;
    } catch (err) {
      lastError = err;
      const detail = err.original?.message || err.cause?.message || err.message;
      logger.warn(`Database connection attempt ${attempt}/${AUTH_RETRIES} failed`, {
        error: detail,
        code: err.original?.code || err.cause?.code,
        attempt
      });
      if (attempt < AUTH_RETRIES) {
        logger.info(`Retrying in ${AUTH_RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, AUTH_RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
}

async function runMigrations() {
  try {
    logger.info(`Running migrations in ${nodeEnv} environment`, {
      database: usePostgres ? 'PostgreSQL' : 'SQLite'
    });
    
    await authenticateWithRetry();
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
    const detail = error.original?.message || error.cause?.message || error.message;
    const code = error.original?.code || error.cause?.code;
    logger.error('Migration failed', {
      error: detail,
      code,
      message: error.message,
      stack: error.stack
    });
    logger.info('Troubleshooting: ensure DATABASE_URL is set in Render Environment, and DATABASE_SSL=true for Supabase/Render Postgres. For Render DB, add ?sslmode=require to DATABASE_URL if needed.');
    await sequelize.close();
    process.exit(1);
  }
}

runMigrations();
