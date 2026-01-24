import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User, sequelize } from '../models/index.js';

dotenv.config();

// Default admin: Christian David Villar Colodro
const username = process.env.ADMIN_USERNAME || 'christiandvillar';
const email = process.env.ADMIN_EMAIL || 'christiandvillar@gmail.com';
const password = process.env.ADMIN_PASSWORD || '!Omunculo_42!';

async function createAdmin() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    console.log('🔄 Syncing database models...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synced');
    
    console.log('🔍 Checking for existing admin user...');
    const existing = await User.findOne({ where: { email } });
    
    if (existing) {
      if (existing.isAdmin) {
        console.log('✅ Admin user already exists:', email);
        console.log('   Username:', existing.username);
        console.log('   Is Admin:', existing.isAdmin);
        console.log('🔄 Updating password...');
        const hash = await bcrypt.hash(password, 10);
        existing.passwordHash = hash;
        existing.lastPasswordChange = new Date();
        await existing.save();
        console.log('✅ Password updated successfully!');
        console.log('\n📝 Updated credentials:');
        console.log('   Email:', email);
        console.log('   Password:', password);
      } else {
        console.log('⚠️  User exists but is not admin. Upgrading to admin...');
        const hash = await bcrypt.hash(password, 10);
        await existing.update({ 
          isAdmin: true,
          passwordHash: hash,
          lastPasswordChange: new Date()
        });
        console.log('✅ User upgraded to admin:', email);
        console.log('\n📝 Login credentials:');
        console.log('   Email:', email);
        console.log('   Password:', password);
      }
      process.exit(0);
    }
    
    console.log('👤 Creating new admin user...');
    const hash = await bcrypt.hash(password, 10);
    const now = new Date();
    const admin = await User.create({ 
      username, 
      email, 
      passwordHash: hash, 
      isAdmin: true,
      lastPasswordChange: now // Track password creation date
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('   Username:', admin.username);
    console.log('   Email:', admin.email);
    console.log('   Is Admin:', admin.isAdmin);
    console.log('\n📝 Login credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin user:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

createAdmin(); 