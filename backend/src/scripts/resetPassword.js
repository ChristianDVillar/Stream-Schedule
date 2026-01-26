import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User, sequelize } from '../models/index.js';

dotenv.config();

const email = process.env.RESET_EMAIL;
const newPassword = process.env.RESET_PASSWORD;

if (!email || !newPassword) {
  console.error('❌ RESET_EMAIL and RESET_PASSWORD environment variables are required');
  console.error('Usage: RESET_EMAIL=user@example.com RESET_PASSWORD=securePassword node src/scripts/resetPassword.js');
  process.exit(1);
}

async function resetPassword() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    console.log(`🔍 Looking for user with email: ${email}...`);
    let user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log(`⚠️  User not found. Creating new user...`);
      // Generate username from email
      const username = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
      const hash = await bcrypt.hash(newPassword, 10);
      user = await User.create({
        username: username,
        email: email,
        passwordHash: hash,
        isAdmin: true,
        lastPasswordChange: new Date()
      });
      console.log(`✅ User created successfully!`);
    } else {
      console.log(`👤 Found user: ${user.username} (${user.email})`);
      console.log('🔄 Resetting password...');
      
      const hash = await bcrypt.hash(newPassword, 10);
      user.passwordHash = hash;
      user.lastPasswordChange = new Date();
      await user.save();
    }
    
    console.log('✅ Password reset successfully!');
    console.log(`\n📝 Updated credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error resetting password:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

resetPassword();
