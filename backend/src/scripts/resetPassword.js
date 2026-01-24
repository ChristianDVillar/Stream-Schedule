import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User, sequelize } from '../models/index.js';

dotenv.config();

const email = process.env.RESET_EMAIL || 'christiandvillar@gmail.com';
const newPassword = process.env.RESET_PASSWORD || '!Omunculo_42!';

async function resetPassword() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    console.log(`🔍 Looking for user with email: ${email}...`);
    let user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log(`⚠️  User not found. Creating new user...`);
      const hash = await bcrypt.hash(newPassword, 10);
      user = await User.create({
        username: 'christiandvillar',
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
