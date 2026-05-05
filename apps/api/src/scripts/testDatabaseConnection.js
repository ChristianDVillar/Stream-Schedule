import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { sequelize, usePostgres, nodeEnv } from '../config/database.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;

logger.info('Database Connection Diagnostic');
logger.info('Configuration:', {
  hasDatabaseUrl: !!databaseUrl,
  databaseUrlPreview: databaseUrl ? databaseUrl.substring(0, 30) + '...' : 'Not set',
  databaseSSL: process.env.DATABASE_SSL || 'not set (default: false)',
  nodeEnv,
  usePostgres,
  requireSSL: process.env.DATABASE_SSL === 'true',
  enableLogging: process.env.ENABLE_LOGGING === 'true',
  envFilePath: path.resolve(__dirname, '../../', '.env')
});

if (!databaseUrl) {
  logger.error('DATABASE_URL is not set in .env file');
  logger.info('To use Supabase, add to your .env:');
  logger.info('DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres');
  logger.info('DATABASE_SSL=true');
  logger.warn('Note: URL-encode special characters in password (! = %21, @ = %40)');
  process.exit(1);
}

// Parse URL to check format
try {
  const url = new URL(databaseUrl.replace('postgresql://', 'http://'));
  logger.info('URL Analysis:', {
    protocol: url.protocol,
    host: url.hostname,
    port: url.port || '5432 (default)',
    database: url.pathname.replace('/', ''),
    username: url.username || 'not specified',
    hasPassword: !!url.password,
    isSupabase: url.hostname.includes('supabase')
  });
} catch (err) {
  logger.error('Invalid DATABASE_URL format', { error: err.message });
  process.exit(1);
}

async function testConnection() {
  if (!sequelize) {
    logger.error('Sequelize not initialized');
    process.exit(1);
  }

  try {
    logger.info('Attempting to connect...');
    await sequelize.authenticate();
    logger.info('Connection successful!');
    
    // Test a simple query
    logger.info('Testing query...');
    const [results] = await sequelize.query('SELECT version() as version');
    logger.info('Query successful!', { 
      postgresqlVersion: results[0]?.version || 'Unknown' 
    });
    
    // Check if tables exist
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    logger.info(`Found ${tables.length} tables in database`, {
      tableCount: tables.length,
      tables: tables.slice(0, 10).map(t => t.table_name),
      hasMore: tables.length > 10,
      moreCount: tables.length > 10 ? tables.length - 10 : 0
    });
    
    await sequelize.close();
    logger.info('All tests passed!');
    process.exit(0);
  } catch (err) {
    logger.error('Connection failed!', { error: err.message });
    
    if (err.message.includes('SSL') || err.message.includes('certificate')) {
      logger.warn('SSL Error Solutions:', {
        solution1: 'Make sure DATABASE_SSL=true is set in .env',
        solution2: 'For Supabase, SSL is required',
        solution3: 'Check that rejectUnauthorized: false is set (already configured)'
      });
    }
    
    if (err.message.includes('password') || err.message.includes('authentication')) {
      logger.warn('Authentication Error Solutions:', {
        solution1: 'Check your password in DATABASE_URL',
        solution2: 'URL-encode special characters',
        encoding: {
          '!': '%21',
          '@': '%40',
          '#': '%23',
          '$': '%24',
          '%': '%25'
        },
        example: 'password!@# becomes password%21%40%23'
      });
    }
    
    if (err.message.includes('timeout') || err.message.includes('ECONNREFUSED')) {
      logger.warn('Connection Error Solutions:', {
        solution1: 'Check your hostname and port',
        solution2: 'Verify your Supabase project is active',
        solution3: 'Check firewall/network settings',
        solution4: 'Try using the pooler URL: pooler.supabase.com'
      });
    }
    
    logger.error('Full error details', { error: err.stack });
    await sequelize.close();
    process.exit(1);
  }
}

testConnection();
