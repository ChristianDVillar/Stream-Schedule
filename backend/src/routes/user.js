import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as TwitchStrategy } from 'passport-twitch';
import { Op } from 'sequelize';
import { User, Content, SystemConfig } from '../models/index.js';
import checkLicense from '../middleware/checkLicense.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { normalizeLicenseType, resolveLicenseExpiry, buildLicenseSummary } from '../utils/licenseUtils.js';

const router = express.Router();

const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d'; // Default 7 days
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Helper function to generate JWT and return user data
const generateAuthResponse = (user, res) => {
  const token = jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin
    }, 
    jwtSecret, 
    { expiresIn: JWT_EXPIRY }
  );
  const licenseSummary = buildLicenseSummary(user);
  
  // Redirect to frontend with token
  const redirectUrl = `${FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
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
  }))}`;
  
  res.redirect(redirectUrl);
};

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/user/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const displayName = profile.displayName || profile.name?.givenName || 'User';
      
      if (!email) {
        return done(new Error('No email provided by Google'), null);
      }

      // Find or create user
      let user = await User.findOne({ 
        where: { 
          [Op.or]: [
            { email },
            { oauthId: profile.id, oauthProvider: 'google' }
          ]
        }
      });

      if (user) {
        // Update OAuth info if not set
        if (!user.oauthId) {
          user.oauthId = profile.id;
          user.oauthProvider = 'google';
          await user.save();
        }
      } else {
        // Create new user
        user = await User.create({
          username: displayName.replace(/\s+/g, '').toLowerCase() + Math.random().toString(36).substr(2, 5),
          email,
          passwordHash: null, // OAuth users don't need password
          oauthProvider: 'google',
          oauthId: profile.id,
          licenseType: normalizeLicenseType('none')
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Configure Twitch OAuth Strategy
if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) {
  passport.use(new TwitchStrategy({
    clientID: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/user/auth/twitch/callback`,
    scope: 'user:read:email'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.email;
      const displayName = profile.display_name || profile.login || 'User';
      
      if (!email) {
        return done(new Error('No email provided by Twitch'), null);
      }

      // Find or create user
      let user = await User.findOne({ 
        where: { 
          [Op.or]: [
            { email },
            { oauthId: profile.id.toString(), oauthProvider: 'twitch' }
          ]
        }
      });

      if (user) {
        // Update OAuth info if not set
        if (!user.oauthId) {
          user.oauthId = profile.id.toString();
          user.oauthProvider = 'twitch';
          await user.save();
        }
      } else {
        // Create new user
        user = await User.create({
          username: displayName.replace(/\s+/g, '').toLowerCase() + Math.random().toString(36).substr(2, 5),
          email,
          passwordHash: null, // OAuth users don't need password
          oauthProvider: 'twitch',
          oauthId: profile.id.toString(),
          licenseType: normalizeLicenseType('none')
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// OAuth Routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }),
  (req, res) => {
    generateAuthResponse(req.user, res);
  }
);

router.get('/auth/twitch', passport.authenticate('twitch', { scope: ['user:read:email'] }));

router.get('/auth/twitch/callback',
  passport.authenticate('twitch', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }),
  (req, res) => {
    generateAuthResponse(req.user, res);
  }
);

// Register
router.post('/register', async (req, res) => {
  const { username, email, password, startWithTrial, licenseOption } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    
    // Prepare user data
    const userData = { username, email, passwordHash: hash, lastPasswordChange: new Date() };
    
    // Determine license type based on registration option
    if (startWithTrial === true || startWithTrial === 'true' || licenseOption === 'trial') {
      // User chooses trial
      const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('trial') });
      if (expiryResult.error) {
        return res.status(400).json({ error: expiryResult.error });
      }
      userData.licenseType = normalizeLicenseType('trial');
      userData.licenseExpiresAt = expiryResult.value;
      userData.licenseKey = `TRIAL-${Math.random().toString(36).substr(2, 12).toUpperCase()}`;
      userData.hasUsedTrial = true;
    } else if (licenseOption === 'monthly') {
      // User chooses monthly license - create it directly
      const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('monthly') });
      if (expiryResult.error) {
        return res.status(400).json({ error: expiryResult.error });
      }
      userData.licenseType = normalizeLicenseType('monthly');
      userData.licenseExpiresAt = expiryResult.value;
      userData.licenseKey = `MONTHLY-${Math.random().toString(36).substr(2, 12).toUpperCase()}`;
    }
    // If neither trial nor monthly, user starts with no license (can purchase later)
    
    const user = await User.create(userData);
    const licenseSummary = buildLicenseSummary(user);
    
    res.status(201).json({ 
      message: 'User registered', 
      user: { 
        id: user.id, 
        username, 
        email,
        licenseType: user.licenseType,
        licenseExpiresAt: user.licenseExpiresAt,
        licenseKey: user.licenseKey,
        licenseAlert: licenseSummary.alert,
        licenseDaysLeft: licenseSummary.daysLeft
      } 
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'User already exists' });
    } else {
      res.status(400).json({ error: 'User already exists or invalid data' });
    }
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is OAuth-only (no password)
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'This account uses OAuth. Please sign in with Google or Twitch.' });
    }
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update lastPasswordChange if it's the first time or password was changed
    // This will be updated when password is actually changed via the change password endpoint
    
    // Generate JWT token with user info
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin
      }, 
      jwtSecret, 
      { expiresIn: JWT_EXPIRY }
    );
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
  const users = await User.findAll({ attributes: ['id', 'username', 'email', 'licenseKey', 'licenseType', 'licenseExpiresAt', 'isAdmin', 'hasUsedTrial'] });
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

// Assign trial license to user (admin only, one time per user)
router.post('/admin/assign-trial', requireAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if user has already used trial
    if (user.hasUsedTrial) {
      return res.status(400).json({ 
        error: 'Este usuario ya ha usado su trial. Solo se puede asignar una vez por usuario.' 
      });
    }
    
    // Set up trial license
    const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('trial') });
    if (expiryResult.error) {
      return res.status(400).json({ error: expiryResult.error });
    }
    
    user.licenseType = normalizeLicenseType('trial');
    user.licenseExpiresAt = expiryResult.value;
    user.licenseKey = `TRIAL-${Math.random().toString(36).substr(2, 12).toUpperCase()}`;
    user.hasUsedTrial = true; // Mark as used
    await user.save();
    
    const summary = buildLicenseSummary(user);
    res.json({
      message: 'Trial asignado exitosamente',
      licenseKey: user.licenseKey,
      licenseType: user.licenseType,
      licenseExpiresAt: user.licenseExpiresAt,
      licenseAlert: summary.alert,
      licenseDaysLeft: summary.daysLeft,
      hasUsedTrial: user.hasUsedTrial
    });
  } catch (err) {
    console.error('Error assigning trial:', err);
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
router.get('/activity', requireAuth, checkLicense, async (req, res) => {
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

router.get('/license', requireAuth, async (req, res) => {
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
router.put('/profile', requireAuth, async (req, res) => {
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

// Change password
router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (!user.passwordHash) {
      return res.status(400).json({ error: 'This account uses OAuth and does not have a password' });
    }
    
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    
    const hash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hash;
    user.lastPasswordChange = new Date();
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available license types configuration (admin)
router.get('/admin/license-config', requireAdmin, async (req, res) => {
  try {
    let config = await SystemConfig.findOne({ where: { key: 'availableLicenseTypes' } });
    if (!config) {
      // Initialize default config
      config = await SystemConfig.create({
        key: 'availableLicenseTypes',
        value: {
          monthly: true,
          quarterly: false,
          lifetime: false,
          temporary: false
        },
        description: 'Available license types for users to purchase'
      });
    }
    res.json({ availableLicenseTypes: config.value });
  } catch (err) {
    console.error('Error getting license config:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update available license types configuration (admin)
router.post('/admin/license-config', requireAdmin, async (req, res) => {
  const { availableLicenseTypes } = req.body;
  if (!availableLicenseTypes || typeof availableLicenseTypes !== 'object') {
    return res.status(400).json({ error: 'Invalid configuration' });
  }
  try {
    let config = await SystemConfig.findOne({ where: { key: 'availableLicenseTypes' } });
    if (config) {
      config.value = availableLicenseTypes;
      await config.save();
    } else {
      config = await SystemConfig.create({
        key: 'availableLicenseTypes',
        value: availableLicenseTypes,
        description: 'Available license types for users to purchase'
      });
    }
    res.json({ availableLicenseTypes: config.value, message: 'Configuration updated' });
  } catch (err) {
    console.error('Error updating license config:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available license types (public, for users)
router.get('/available-licenses', async (req, res) => {
  try {
    let config = await SystemConfig.findOne({ where: { key: 'availableLicenseTypes' } });
    if (!config) {
      // Default: only monthly available
      return res.json({ availableLicenseTypes: { monthly: true, quarterly: false, lifetime: false, temporary: false } });
    }
    res.json({ availableLicenseTypes: config.value });
  } catch (err) {
    console.error('Error getting available licenses:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check password change reminder (for admins)
router.get('/admin/password-reminder', requireAdmin, async (req, res) => {
  try {
    const adminUsers = await User.findAll({ 
      where: { isAdmin: true },
      attributes: ['id', 'username', 'email', 'lastPasswordChange']
    });
    
    const reminders = adminUsers.map(admin => {
      if (!admin.lastPasswordChange) {
        return {
          userId: admin.id,
          username: admin.username,
          email: admin.email,
          daysSinceChange: null,
          needsChange: true,
          message: 'Password has never been changed'
        };
      }
      
      const daysSinceChange = Math.floor((new Date() - new Date(admin.lastPasswordChange)) / (1000 * 60 * 60 * 24));
      const needsChange = daysSinceChange >= 90;
      
      return {
        userId: admin.id,
        username: admin.username,
        email: admin.email,
        daysSinceChange,
        needsChange,
        message: needsChange 
          ? `Password was changed ${daysSinceChange} days ago. Please change it.`
          : `Password was changed ${daysSinceChange} days ago. ${90 - daysSinceChange} days remaining.`
      };
    });
    
    res.json({ reminders });
  } catch (err) {
    console.error('Error getting password reminders:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 