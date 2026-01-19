import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User, sequelize } from '../models/index.js';

dotenv.config();

const username = process.env.ADMIN_USERNAME || 'admin';
const email = process.env.ADMIN_EMAIL || 'admin@example.com';
const password = process.env.ADMIN_PASSWORD || 'admin123';

async function createAdmin() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      console.log('Admin user already exists:', email);
      process.exit(0);
    }
    const hash = await bcrypt.hash(password, 10);
    await User.create({ username, email, passwordHash: hash, isAdmin: true });
    console.log('Admin user created:', email);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin user:', err);
    process.exit(1);
  }
}

createAdmin(); 