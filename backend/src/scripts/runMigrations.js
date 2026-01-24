/**
 * Script to run Sequelize migrations
 * This script loads environment variables and runs all pending migrations
 */

import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
// For local development: loads from .env file
// For Render/production: uses Environment Variables from Render dashboard
dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });
const nodeEnv = process.env.NODE_ENV || 'development';

// Database configuration
const databaseUrl = process.env.DATABASE_URL;
const usePostgres = Boolean(databaseUrl);
const enableLogging = process.env.ENABLE_LOGGING === 'true';
const isProduction = nodeEnv === 'production';
const requireSSL = isProduction || process.env.DATABASE_SSL === 'true';

if (isProduction && !databaseUrl) {
  console.error('❌ DATABASE_URL is required in production environment');
  process.exit(1);
}

const sequelize = usePostgres
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: enableLogging ? console.log : false,
      protocol: 'postgres',
      dialectOptions: {
        ssl: requireSSL
          ? {
              require: true,
              rejectUnauthorized: false, // Supabase uses self-signed certificates
            }
          : false,
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.SQLITE_STORAGE || path.resolve(process.cwd(), 'database.sqlite'),
      logging: enableLogging ? console.log : false,
    });

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
    console.log('✅ Created SequelizeMeta table');
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
    console.error(`Error loading migration ${filename}:`, e.message);
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
      error.code === '42701' // PostgreSQL duplicate column
    )) {
      console.log(`⚠️  Skipped (already exists): ${filename}`);
      // Still record as executed since the change is already in place
    } else {
      throw error;
    }
  }
  
  // Record migration (escape filename for SQL)
  const escapedFilename = filename.replace(/'/g, "''");
  const tableName = usePostgres ? '"SequelizeMeta"' : 'SequelizeMeta';
  await sequelize.query(
    `INSERT INTO ${tableName} (name) VALUES ('${escapedFilename}')`
  );
  
  console.log(`✅ Executed: ${filename}`);
}

async function runMigrations() {
  try {
    console.log(`🔧 Running migrations in ${nodeEnv} environment...`);
    console.log(`📊 Database: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);
    
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = await readdir(migrationsDir);
    const migrationFiles = files
      .filter((f) => f.endsWith('.js') || f.endsWith('.cjs'))
      .sort();

    // Get executed migrations
    const executed = await getExecutedMigrations();
    console.log(`📋 Found ${executed.length} executed migrations`);

    // Find pending migrations
    const pending = migrationFiles.filter((f) => !executed.includes(f));

    if (pending.length === 0) {
      console.log('✅ All migrations are up to date');
      await sequelize.close();
      return;
    }

    console.log(`🔄 Found ${pending.length} pending migration(s):`);
    pending.forEach((f) => console.log(`   - ${f}`));

    // Execute pending migrations
    for (const file of pending) {
      await executeMigration(file);
    }

    console.log(`\n✅ Successfully executed ${pending.length} migration(s)`);
    await sequelize.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await sequelize.close();
    process.exit(1);
  }
}

runMigrations();
