import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
// Try loading from .env file
dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });

// Also try loading from process.env (in case it's already set)
// This helps when running in environments where .env might not be in the expected location

const databaseUrl = process.env.DATABASE_URL;
const usePostgres = Boolean(databaseUrl);
const nodeEnv = process.env.NODE_ENV || 'development';
const enableLogging = process.env.ENABLE_LOGGING === 'true';
const isProduction = nodeEnv === 'production';
const requireSSL = isProduction || process.env.DATABASE_SSL === 'true';

console.log('🔍 Database Connection Diagnostic\n');
console.log('Configuration:');
console.log(`  DATABASE_URL: ${databaseUrl ? '✅ Set (' + databaseUrl.substring(0, 30) + '...)' : '❌ Not set'}`);
console.log(`  DATABASE_SSL: ${process.env.DATABASE_SSL || 'not set (default: false)'}`);
console.log(`  NODE_ENV: ${nodeEnv}`);
console.log(`  Use PostgreSQL: ${usePostgres}`);
console.log(`  Require SSL: ${requireSSL}`);
console.log(`  Enable Logging: ${enableLogging}`);
console.log(`  .env file path: ${path.resolve(__dirname, '../../', '.env')}\n`);

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set in .env file');
  console.log('💡 To use Supabase, add to your .env:');
  console.log('   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres');
  console.log('   DATABASE_SSL=true');
  console.log('\n⚠️  Note: URL-encode special characters in password (! = %21, @ = %40)');
  process.exit(1);
}

// Parse URL to check format
try {
  const url = new URL(databaseUrl.replace('postgresql://', 'http://'));
  console.log('URL Analysis:');
  console.log(`  Protocol: ${url.protocol}`);
  console.log(`  Host: ${url.hostname}`);
  console.log(`  Port: ${url.port || '5432 (default)'}`);
  console.log(`  Database: ${url.pathname.replace('/', '')}`);
  console.log(`  Username: ${url.username || 'not specified'}`);
  console.log(`  Password: ${url.password ? '✅ Set' : '❌ Not set'}`);
  console.log(`  Is Supabase: ${url.hostname.includes('supabase') ? '✅ Yes' : '❌ No'}\n`);
} catch (err) {
  console.error('❌ Invalid DATABASE_URL format:', err.message);
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
        // Supabase pooler compatibility
        ...(databaseUrl.includes('pooler.supabase.com') && {
          application_name: 'streamer-scheduler',
        }),
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    })
  : null;

async function testConnection() {
  if (!sequelize) {
    console.error('❌ Sequelize not initialized');
    process.exit(1);
  }

  try {
    console.log('🔄 Attempting to connect...');
    await sequelize.authenticate();
    console.log('✅ Connection successful!\n');
    
    // Test a simple query
    console.log('🔄 Testing query...');
    const [results] = await sequelize.query('SELECT version() as version');
    console.log('✅ Query successful!');
    console.log(`  PostgreSQL version: ${results[0]?.version || 'Unknown'}\n`);
    
    // Check if tables exist
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`📊 Found ${tables.length} tables in database:`);
    tables.slice(0, 10).forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    if (tables.length > 10) {
      console.log(`  ... and ${tables.length - 10} more`);
    }
    
    await sequelize.close();
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Connection failed!');
    console.error(`Error: ${err.message}\n`);
    
    if (err.message.includes('SSL') || err.message.includes('certificate')) {
      console.error('💡 SSL Error Solutions:');
      console.error('   1. Make sure DATABASE_SSL=true is set in .env');
      console.error('   2. For Supabase, SSL is required');
      console.error('   3. Check that rejectUnauthorized: false is set (already configured)\n');
    }
    
    if (err.message.includes('password') || err.message.includes('authentication')) {
      console.error('💡 Authentication Error Solutions:');
      console.error('   1. Check your password in DATABASE_URL');
      console.error('   2. URL-encode special characters:');
      console.error('      ! = %21');
      console.error('      @ = %40');
      console.error('      # = %23');
      console.error('      $ = %24');
      console.error('      % = %25');
      console.error('   3. Example: password!@# becomes password%21%40%23\n');
    }
    
    if (err.message.includes('timeout') || err.message.includes('ECONNREFUSED')) {
      console.error('💡 Connection Error Solutions:');
      console.error('   1. Check your hostname and port');
      console.error('   2. Verify your Supabase project is active');
      console.error('   3. Check firewall/network settings');
      console.error('   4. Try using the pooler URL: pooler.supabase.com\n');
    }
    
    console.error('Full error details:');
    console.error(err);
    await sequelize.close();
    process.exit(1);
  }
}

testConnection();
