import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const router = express.Router();

// Middleware to check admin
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
  User.findByPk(req.user.id).then(user => {
    if (!user || !user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, passwordHash: hash });
    res.status(201).json({ message: 'User registered', user: { id: user.id, username, email } });
  } catch (err) {
    res.status(400).json({ error: 'User already exists or invalid data' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, licenseKey: user.licenseKey } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate license (for demo, not secure)
router.post('/generate-license', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  const licenseKey = Math.random().toString(36).substr(2, 16).toUpperCase();
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.licenseKey = licenseKey;
    await user.save();
    res.json({ licenseKey });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List all users (admin only)
router.get('/admin/users', requireAdmin, async (req, res) => {
  const users = await User.findAll({ attributes: ['id', 'username', 'email', 'licenseKey', 'isAdmin'] });
  res.json(users);
});

// Generate license for any user (admin only)
router.post('/admin/generate-license', requireAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  const licenseKey = Math.random().toString(36).substr(2, 16).toUpperCase();
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.licenseKey = licenseKey;
    await user.save();
    res.json({ licenseKey });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 