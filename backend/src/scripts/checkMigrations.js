/**
 * Script to check migration status
 */

import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import { readdir } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
// For local development: loads from .env file
// For Render/production: uses Environment Variables from Render dashboard
dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });
const nodeEnv = process.env.NODE_ENV || 'development';

const databaseUrl = process.env.DATABASE_URL;
const usePostgres = Boolean(databaseUrl);
const isProduction = nodeEnv === 'production';
const requireSSL = isProduction || process.env.DATABASE_SSL === 'true';

const sequelize = usePostgres
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
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
      logging: false,
    });

async function checkMigrations() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

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
      console.log('⚠️  SequelizeMeta table does not exist yet');
    }

    console.log(`📋 Total migration files: ${migrationFiles.length}`);
    console.log(`✅ Executed migrations: ${executed.length}`);
    console.log(`⏳ Pending migrations: ${migrationFiles.length - executed.length}\n`);

    if (executed.length > 0) {
      console.log('Executed migrations:');
      executed.forEach((f) => console.log(`  ✅ ${f}`));
      console.log('');
    }

    const pending = migrationFiles.filter((f) => !executed.includes(f));
    if (pending.length > 0) {
      console.log('Pending migrations:');
      pending.forEach((f) => console.log(`  ⏳ ${f}`));
    } else {
      console.log('✅ All migrations are up to date!');
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

checkMigrations();
