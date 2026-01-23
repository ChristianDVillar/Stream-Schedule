import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Content } from '../models/index.js';
import checkLicense from '../middleware/checkLicense.js';

const router = express.Router();

// Middleware to check admin
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
  next();
}

function normalizeLicenseType(licenseType) {
  const allowed = ['none', 'temporary', 'monthly', 'quarterly', 'lifetime'];
  if (!licenseType) return 'temporary';
  return allowed.includes(licenseType) ? licenseType : 'temporary';
}

function resolveLicenseExpiry({ expiresAt, durationDays, licenseType }) {
  if (licenseType === 'lifetime' || licenseType === 'none') {
    return { value: null };
  }
  if (expiresAt) {
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return { error: 'Invalid expiresAt' };
    }
    return { value: parsed };
  }
  let fallbackDays = 30;
  if (licenseType === 'monthly') fallbackDays = 30;
  if (licenseType === 'quarterly') fallbackDays = 90;
  const days = Number.isFinite(durationDays) ? Number(durationDays) : fallbackDays;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return { value: date };
}

function buildLicenseSummary(user) {
  const type = user.licenseType || 'none';
  const expiresAt = user.licenseExpiresAt;
  if (type === 'lifetime' || type === 'none') {
    return { licenseType: type, daysLeft: null, alert: 'none' };
  }
  if (!expiresAt) {
    return { licenseType: type, daysLeft: null, alert: 'none' };
  }
  const now = new Date();
  const end = new Date(expiresAt);
  const diffMs = end - now;
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  let alert = 'none';
  if (daysLeft <= 0) {
    alert = 'expired';
  } else if (daysLeft <= 3) {
    alert = '3_days';
  } else if (daysLeft <= 7) {
    alert = '7_days';
  }
  return { licenseType: type, daysLeft, alert };
}

const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';

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
    const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: '1d' });
    const licenseSummary = buildLicenseSummary(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        licenseKey: user.licenseKey,
        licenseExpiresAt: user.licenseExpiresAt,
        licenseType: user.licenseType,
        licenseAlert: licenseSummary.alert,
        licenseDaysLeft: licenseSummary.daysLeft,
        isAdmin: user.isAdmin,
        merchandisingLink: user.merchandisingLink
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate license (for demo, not secure)
router.post('/generate-license', requireAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  const licenseType = normalizeLicenseType(req.body.licenseType);
  const expiry = resolveLicenseExpiry({ ...req.body, licenseType });
  if (expiry.error) return res.status(400).json({ error: expiry.error });
  const licenseKey = Math.random().toString(36).substr(2, 16).toUpperCase();
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.licenseKey = licenseKey;
    user.licenseExpiresAt = expiry.value;
    user.licenseType = licenseType;
    await user.save();
    const licenseSummary = buildLicenseSummary(user);
    res.json({
      licenseKey,
      licenseExpiresAt: user.licenseExpiresAt,
      licenseType: user.licenseType,
      licenseAlert: licenseSummary.alert,
      licenseDaysLeft: licenseSummary.daysLeft
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List all users (admin only)
router.get('/admin/users', requireAdmin, async (req, res) => {
  const users = await User.findAll({ attributes: ['id', 'username', 'email', 'licenseKey', 'licenseType', 'licenseExpiresAt', 'isAdmin'] });
  const payload = users.map(user => {
    const summary = buildLicenseSummary(user);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      licenseKey: user.licenseKey,
      licenseType: user.licenseType,
      licenseExpiresAt: user.licenseExpiresAt,
      licenseAlert: summary.alert,
      licenseDaysLeft: summary.daysLeft,
      isAdmin: user.isAdmin
    };
  });
  res.json(payload);
});

// Generate license for any user (admin only)
router.post('/admin/generate-license', requireAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  const licenseType = normalizeLicenseType(req.body.licenseType);
  const expiry = resolveLicenseExpiry({ ...req.body, licenseType });
  if (expiry.error) return res.status(400).json({ error: expiry.error });
  const licenseKey = Math.random().toString(36).substr(2, 16).toUpperCase();
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.licenseKey = licenseKey;
    user.licenseExpiresAt = expiry.value;
    user.licenseType = licenseType;
    await user.save();
    const licenseSummary = buildLicenseSummary(user);
    res.json({
      licenseKey,
      licenseExpiresAt: user.licenseExpiresAt,
      licenseType: user.licenseType,
      licenseAlert: licenseSummary.alert,
      licenseDaysLeft: licenseSummary.daysLeft
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Cambiar email de usuario (admin)
router.post('/admin/change-email', requireAdmin, async (req, res) => {
  const { userId, newEmail } = req.body;
  if (!userId || !newEmail) return res.status(400).json({ error: 'Missing userId or newEmail' });
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.email = newEmail;
    await user.save();
    res.json({ message: 'Email updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user (admin)
router.post('/admin/create', requireAdmin, async (req, res) => {
  const { username, email, password, isAdmin } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      passwordHash: hash,
      isAdmin: Boolean(isAdmin)
    });
    res.status(201).json({ id: user.id, username, email, isAdmin: user.isAdmin });
  } catch (err) {
    res.status(400).json({ error: 'User already exists or invalid data' });
  }
});

// Update license type (admin)
router.post('/admin/update-license', requireAdmin, async (req, res) => {
  const { userId, licenseType } = req.body;
  if (!userId || !licenseType) return res.status(400).json({ error: 'Missing userId or licenseType' });
  const normalized = normalizeLicenseType(licenseType);
  const expiry = resolveLicenseExpiry({ licenseType: normalized });
  if (expiry.error) return res.status(400).json({ error: expiry.error });
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.licenseKey && normalized !== 'none') {
      user.licenseKey = Math.random().toString(36).substr(2, 16).toUpperCase();
    }
    user.licenseType = normalized;
    user.licenseExpiresAt = expiry.value;
    await user.save();
    const summary = buildLicenseSummary(user);
    res.json({
      licenseKey: user.licenseKey,
      licenseType: user.licenseType,
      licenseExpiresAt: user.licenseExpiresAt,
      licenseAlert: summary.alert,
      licenseDaysLeft: summary.daysLeft
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Resetear contraseña de usuario (admin)
router.post('/admin/reset-password', requireAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const hash = await bcrypt.hash('changeme123', 10);
    user.passwordHash = hash;
    await user.save();
    res.json({ message: 'Password reset to changeme123' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User stats (basic analytics)
router.get('/stats', checkLicense, async (req, res) => {
  const totalPosts = await Content.count({ where: { userId: req.user.id } });
  const scheduledPosts = await Content.count({ where: { userId: req.user.id, status: 'scheduled' } });
  const publishedPosts = await Content.count({ where: { userId: req.user.id, status: 'published' } });
  res.json({
    totalPosts,
    scheduledPosts,
    publishedPosts,
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0
  });
});

// Recent activity (basic)
router.get('/activity', checkLicense, async (req, res) => {
  const contents = await Content.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
    limit: 10
  });
  const activity = contents.map(content => ({
    type: 'post_created',
    description: `Created "${content.title}"`,
    timestamp: content.createdAt
  }));
  res.json(activity);
});

router.get('/license', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const summary = buildLicenseSummary(req.user);
  res.json({
    licenseKey: req.user.licenseKey,
    licenseType: req.user.licenseType,
    licenseExpiresAt: req.user.licenseExpiresAt,
    licenseAlert: summary.alert,
    licenseDaysLeft: summary.daysLeft
  });
});

// Update user profile
router.put('/profile', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { username, email, bio, timezone, language, merchandisingLink } = req.body;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (merchandisingLink !== undefined) user.merchandisingLink = merchandisingLink;
    
    await user.save();
    const licenseSummary = buildLicenseSummary(user);
    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        licenseKey: user.licenseKey,
        licenseExpiresAt: user.licenseExpiresAt,
        licenseType: user.licenseType,
        licenseAlert: licenseSummary.alert,
        licenseDaysLeft: licenseSummary.daysLeft,
        isAdmin: user.isAdmin,
        merchandisingLink: user.merchandisingLink
      }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router; 