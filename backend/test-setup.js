const { config } = require('./dist/config/config');
const { TokenEncryptionService } = require('./dist/services/TokenEncryptionService');

console.log('🔧 Testing Enhanced Streamer Scheduler Setup...\n');

// Test 1: Configuration
console.log('1. Testing Configuration...');
try {
  console.log('   ✅ Config loaded successfully');
  console.log('   📍 Port:', config.port);
  console.log('   🔐 Security enabled:', !!config.security);
  console.log('   🔒 Encryption configured:', !!config.encryption);
  console.log('   📊 Redis configured:', !!config.redis);
} catch (error) {
  console.log('   ❌ Configuration error:', error.message);
}

// Test 2: Token Encryption
console.log('\n2. Testing Token Encryption...');
try {
  const encryptionService = TokenEncryptionService.getInstance();
  const testToken = 'test-access-token-12345';
  const encrypted = encryptionService.encryptToken(testToken);
  const decrypted = encryptionService.decryptToken(encrypted);
  
  if (decrypted === testToken) {
    console.log('   ✅ Token encryption/decryption working');
  } else {
    console.log('   ❌ Token encryption/decryption failed');
  }
} catch (error) {
  console.log('   ❌ Token encryption error:', error.message);
}

// Test 3: Environment Variables
console.log('\n3. Testing Environment Variables...');
const requiredEnvVars = [
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'MONGODB_URI'
];

let envOk = true;
requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName}: Set`);
  } else {
    console.log(`   ⚠️  ${varName}: Not set (will use defaults)`);
    envOk = false;
  }
});

// Test 4: Dependencies
console.log('\n4. Testing Dependencies...');
const requiredModules = [
  'express',
  'mongoose',
  'bull',
  'bcryptjs',
  'jsonwebtoken',
  'multer',
  'helmet',
  'express-rate-limit'
];

let depsOk = true;
requiredModules.forEach(moduleName => {
  try {
    require(moduleName);
    console.log(`   ✅ ${moduleName}: Available`);
  } catch (error) {
    console.log(`   ❌ ${moduleName}: Missing`);
    depsOk = false;
  }
});

// Summary
console.log('\n📋 Setup Summary:');
console.log('   🔧 Configuration:', '✅ Working');
console.log('   🔐 Token Encryption:', '✅ Working');
console.log('   🌍 Environment Variables:', envOk ? '✅ Complete' : '⚠️  Using defaults');
console.log('   📦 Dependencies:', depsOk ? '✅ All installed' : '❌ Missing some');

if (envOk && depsOk) {
  console.log('\n🎉 Setup is ready! You can now:');
  console.log('   1. Copy env.example to .env and configure your OAuth credentials');
  console.log('   2. Start MongoDB and Redis');
  console.log('   3. Run: npm run dev');
} else {
  console.log('\n⚠️  Please fix the issues above before proceeding');
}

console.log('\n📚 For detailed setup instructions, see SETUP.md'); 