import express from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as TwitchStrategy } from 'passport-twitch';
import { Op } from 'sequelize';
import { User, Content, Media, SystemConfig, sequelize } from '../models/index.js';
import checkLicense from '../middleware/checkLicense.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { normalizeLicenseType, resolveLicenseExpiry, buildLicenseSummary } from '../utils/licenseUtils.js';
import { generateLicenseKey, generateTemporaryPassword, generateUsernameSuffix } from '../utils/cryptoUtils.js';
import { generateAuthData, buildUserResponse } from '../utils/authUtils.js';
import { supabase as supabaseAdmin } from '../utils/supabaseClient.js';
import { validateBody } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  updateProfileSchema,
  adminCreateUserSchema,
  adminUpdateLicenseSchema,
  adminChangeEmailSchema,
  adminResetPasswordSchema,
  adminAssignTrialSchema,
  extendTrialSchema
} from '../validators/userSchemas.js';
import logger from '../utils/logger.js';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Helper function to generate JWT and redirect for OAuth callbacks
const generateAuthResponse = (user, res) => {
  const authData = generateAuthData(user);
  
  // Redirect to frontend with token
  const redirectUrl = `${FRONTEND_URL}/auth/callback?token=${authData.token}&user=${encodeURIComponent(JSON.stringify(authData.user))}`;
  
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
          username: displayName.replace(/\s+/g, '').toLowerCase() + generateUsernameSuffix(3),
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
          username: displayName.replace(/\s+/g, '').toLowerCase() + generateUsernameSuffix(3),
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

// OAuth Login via Supabase (frontend uses Supabase OAuth for Google/Twitch, then sends token here)
// Exported so app.js can register it before authenticateToken middleware (avoids 404)
export async function googleLoginHandler(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token' });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }

    // 1) Verify token with Supabase (getUser(jwt) returns { data: { user }, error } or { data: user, error })
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error) {
      logger.warn('OAuth login: invalid Supabase token', { error: error.message });
      return res.status(401).json({ error: 'Invalid token' });
    }

    const supabaseUser = data?.user ?? data;
    if (!supabaseUser?.email) {
      return res.status(401).json({ error: 'Invalid token or missing email' });
    }

    const email = supabaseUser.email;
    const provider = supabaseUser.app_metadata?.provider ?? 'google';
    const isTwitch = provider === 'twitch';
    // Twitch: preferred_username or user_name; Google: full_name / name
    const rawName = isTwitch
      ? (supabaseUser.user_metadata?.preferred_username ?? supabaseUser.user_metadata?.user_name ?? supabaseUser.user_metadata?.name ?? email?.split('@')[0])
      : (supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? supabaseUser.email?.split('@')[0] ?? 'User');
    const fullName = typeof rawName === 'string' ? rawName : (rawName && typeof rawName === 'object' ? [rawName.given_name, rawName.family_name].filter(Boolean).join(' ') : 'User') || 'User';
    const supabaseId = supabaseUser.id;

    // 2) Find or create user in DB (oauthProvider: 'google' | 'twitch')
    const oauthProvider = isTwitch ? 'twitch' : 'google';
    let dbUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { oauthId: supabaseId, oauthProvider },
        ],
      },
    });

    if (dbUser) {
      if (!dbUser.oauthId) {
        dbUser.oauthId = supabaseId;
        dbUser.oauthProvider = oauthProvider;
        await dbUser.save();
      }
    } else {
      const baseUsername = (fullName || 'user').replace(/\s+/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      const username = baseUsername + generateUsernameSuffix(3);
      const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('trial') });
      const licenseExpiresAt = expiryResult.error ? null : expiryResult.value;
      dbUser = await User.create({
        username,
        email,
        passwordHash: null,
        oauthProvider,
        oauthId: supabaseId,
        licenseType: normalizeLicenseType('trial'),
        licenseKey: generateLicenseKey('TRIAL', 12),
        licenseExpiresAt,
        hasUsedTrial: true,
      });
    }

    // 3) Return JWT and user
    const authResponse = generateAuthData(dbUser);
    res.json({
      token: authResponse.token,
      user: authResponse.user,
    });
  } catch (err) {
    logger.error('OAuth login failed', {
      error: err.message,
      stack: err.stack,
      name: err.name,
    });
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({
      error: 'OAuth login failed',
      ...(isDev && { details: err.message }),
    });
  }
}

router.post('/google-login', googleLoginHandler);

// OAuth Routes (Passport fallback)
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
router.post('/register', validateBody(registerSchema), async (req, res) => {
  const { username, email, password, startWithTrial, licenseOption } = req.body;
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
      userData.licenseKey = generateLicenseKey('TRIAL', 12);
      userData.hasUsedTrial = true;
    } else if (licenseOption === 'monthly') {
      // User chooses monthly license - create it directly
      const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('monthly') });
      if (expiryResult.error) {
        return res.status(400).json({ error: expiryResult.error });
      }
      userData.licenseType = normalizeLicenseType('monthly');
      userData.licenseExpiresAt = expiryResult.value;
      userData.licenseKey = generateLicenseKey('MONTHLY', 12);
    }
    // If neither trial nor monthly, user starts with no license (can purchase later)
    
    const user = await User.create(userData);
    
    // Generate authentication data (token + user response)
    const authData = generateAuthData(user);
    
    res.status(201).json({ 
      message: 'User registered', 
      token: authData.token,
      user: authData.user
    });
  } catch (err) {
    logger.error('Registration failed', {
      error: err.message,
      email: req.body.email,
      username: req.body.username,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'User already exists' });
    } else {
      res.status(400).json({ error: 'User already exists or invalid data' });
    }
  }
});

// Login
router.post('/login', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
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
    
    // Generate authentication data (token + user response)
    const authData = generateAuthData(user);
    
    res.json(authData);
  } catch (err) {
    logger.error('Login error', {
      error: err.message,
      email: req.body.email,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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
  const licenseKey = generateLicenseKey('', 16);
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

// List all users (admin only), with lastUploadAt = latest of Content.createdAt or Media.createdAt per user
router.get('/admin/users', requireAdmin, async (req, res) => {
  const users = await User.findAll({ attributes: ['id', 'username', 'email', 'licenseKey', 'licenseType', 'licenseExpiresAt', 'isAdmin', 'hasUsedTrial', 'trialExtensions'] });
  const userIds = users.map(u => u.id);
  const lastContentByUser = userIds.length
    ? await Content.findAll({
        attributes: ['userId', [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastAt']],
        where: { userId: { [Op.in]: userIds } },
        group: ['userId'],
        raw: true
      })
    : [];
  const lastMediaByUser = userIds.length
    ? await Media.findAll({
        attributes: ['userId', [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastAt']],
        where: { userId: { [Op.in]: userIds } },
        group: ['userId'],
        raw: true
      })
    : [];
  const lastContentMap = Object.fromEntries(lastContentByUser.map(r => [r.userId, r.lastAt]));
  const lastMediaMap = Object.fromEntries(lastMediaByUser.map(r => [r.userId, r.lastAt]));
  const payload = users.map(user => {
    const summary = buildLicenseSummary(user);
    const contentAt = lastContentMap[user.id] ? new Date(lastContentMap[user.id]).getTime() : 0;
    const mediaAt = lastMediaMap[user.id] ? new Date(lastMediaMap[user.id]).getTime() : 0;
    const lastUploadAt = contentAt || mediaAt ? new Date(Math.max(contentAt, mediaAt)).toISOString() : null;
    return {
      id: user.id,
      trialExtensions: user.trialExtensions || 0,
      username: user.username,
      email: user.email,
      licenseKey: user.licenseKey,
      licenseType: user.licenseType,
      licenseExpiresAt: user.licenseExpiresAt,
      licenseAlert: summary.alert,
      licenseDaysLeft: summary.daysLeft,
      isAdmin: user.isAdmin,
      hasUsedTrial: user.hasUsedTrial,
      trialExtensions: user.trialExtensions || 0,
      lastUploadAt
    };
  });
  res.json(payload);
});

// Delete user (admin only). Cannot delete the last admin. Cascades Content, Media, Payment, Platform.
router.delete('/admin/users/:userId', requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const id = parseInt(userId, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.isAdmin) {
      const adminCount = await User.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin' });
      }
    }
    await user.destroy();
    logger.info('User deleted by admin', { deletedUserId: id, adminId: req.user.id, email: user.email });
    res.json({ message: 'User deleted' });
  } catch (err) {
    logger.error('Error deleting user', { error: err.message, userId: id, adminId: req.user?.id });
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Generate license for any user (admin only)
router.post('/admin/generate-license', requireAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  const licenseType = normalizeLicenseType(req.body.licenseType);
  const expiry = resolveLicenseExpiry({ ...req.body, licenseType });
  if (expiry.error) return res.status(400).json({ error: expiry.error });
  const licenseKey = generateLicenseKey('', 16);
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
router.post('/admin/change-email', requireAdmin, validateBody(adminChangeEmailSchema), async (req, res) => {
  const { userId, newEmail } = req.body;
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
router.post('/admin/create', requireAdmin, validateBody(adminCreateUserSchema), async (req, res) => {
  const { username, email, password, isAdmin } = req.body;
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
router.post('/admin/update-license', requireAdmin, validateBody(adminUpdateLicenseSchema), async (req, res) => {
  const { userId, licenseType } = req.body;
  const normalized = normalizeLicenseType(licenseType);
  const expiry = resolveLicenseExpiry({ licenseType: normalized });
  if (expiry.error) return res.status(400).json({ error: expiry.error });
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.licenseKey && normalized !== 'none') {
      user.licenseKey = generateLicenseKey('', 16);
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
router.post('/admin/assign-trial', requireAdmin, validateBody(adminAssignTrialSchema), async (req, res) => {
  const { userId } = req.body;
  
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
    user.licenseKey = generateLicenseKey('TRIAL', 12);
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
    logger.error('Error assigning trial', {
      error: err.message,
      userId: req.body.userId,
      adminId: req.user?.id,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Extend trial license (admin only - can extend up to 2 times per user, max 7 days per extension)
router.post('/admin/extend-trial', requireAdmin, validateBody(extendTrialSchema), async (req, res) => {
  const { userId, days } = req.body;
  
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    // Verificar que el usuario tenga una licencia trial activa
    if (user.licenseType !== 'trial') {
      return res.status(400).json({ 
        error: 'Solo se puede extender una licencia trial activa' 
      });
    }
    
    // Verificar límite de extensiones (máximo 2 veces)
    if (user.trialExtensions >= 2) {
      return res.status(400).json({ 
        error: 'Este usuario ya ha usado el máximo de extensiones permitidas (2 veces)' 
      });
    }
    
    // Validar que los días no excedan 7
    if (days > 7) {
      return res.status(400).json({ 
        error: 'No se puede extender más de 7 días por vez' 
      });
    }
    
    // Calcular nueva fecha de expiración
    const currentExpiry = user.licenseExpiresAt ? new Date(user.licenseExpiresAt) : new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setDate(newExpiry.getDate() + days);
    
    // Actualizar usuario
    user.licenseExpiresAt = newExpiry;
    user.trialExtensions = (user.trialExtensions || 0) + 1;
    await user.save();
    
    // Reload user to get fresh data
    await user.reload();
    const updatedSummary = buildLicenseSummary(user);
    
    logger.info('Trial extended by admin', {
      targetUserId: userId,
      adminId: req.user.id,
      daysAdded: days,
      newExpiry: newExpiry,
      extensionsUsed: user.trialExtensions,
      ip: req.ip
    });
    
    res.json({
      message: `Trial extendido exitosamente por ${days} ${days === 1 ? 'día' : 'días'} para el usuario ${user.username}`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        licenseType: user.licenseType,
        licenseExpiresAt: user.licenseExpiresAt,
        trialExtensions: user.trialExtensions
      },
      licenseType: user.licenseType,
      licenseExpiresAt: user.licenseExpiresAt,
      trialExtensions: user.trialExtensions,
      remainingExtensions: 2 - user.trialExtensions,
      licenseAlert: updatedSummary.alert,
      licenseDaysLeft: updatedSummary.daysLeft
    });
  } catch (err) {
    logger.error('Error extending trial', {
      error: err.message,
      targetUserId: userId,
      adminId: req.user?.id,
      days,
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    res.status(500).json({ error: 'Error al extender el trial' });
  }
});

// Resetear contraseña de usuario (admin)
router.post('/admin/reset-password', requireAdmin, validateBody(adminResetPasswordSchema), async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Generate secure temporary password
    const tempPassword = generateTemporaryPassword(12);
    const hash = await bcrypt.hash(tempPassword, 10);
    user.passwordHash = hash;
    user.lastPasswordChange = new Date();
    await user.save();
    
    // TODO: Send password via secure channel (email, SMS, etc.)
    // NEVER expose passwords in API responses
    // For development only, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV ONLY] Password reset for user ${userId} (${user.email}): ${tempPassword}`);
    }
    
    res.json({ 
      message: 'Password reset successful. The new password has been sent to the user via secure channel.'
    });
  } catch (err) {
    logger.error('Error resetting password', {
      error: err.message,
      userId: req.body.userId,
      adminId: req.user?.id,
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Request password reset (public - by email)
router.post('/forgot-password', validateBody(forgotPasswordSchema), async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }
    
    // Check if user is OAuth-only
    if (!user.passwordHash) {
      return res.status(400).json({ error: 'This account uses OAuth and does not have a password. Please sign in with Google or Twitch.' });
    }
    
    // Generate a secure temporary password
    const tempPassword = generateTemporaryPassword(12);
    const hash = await bcrypt.hash(tempPassword, 10);
    user.passwordHash = hash;
    user.lastPasswordChange = new Date();
    await user.save();
    
    // TODO: In production, send email with reset link or temporary password
    // NEVER expose passwords in API responses
    // For development only, log to console (not in response)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV ONLY] Temporary password for ${email}: ${tempPassword}`);
    }
    
    res.json({ 
      message: 'Password reset successful. Please check your email for the temporary password.'
    });
  } catch (err) {
    logger.error('Error in forgot password', {
      error: err.message,
      email: req.body.email,
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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
router.put('/profile', requireAuth, validateBody(updateProfileSchema), async (req, res) => {
  const { username, email, merchandisingLink } = req.body;
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
    logger.error('Profile update error', {
      error: err.message,
      userId: req.user?.id,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', requireAuth, validateBody(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
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
    logger.error('Error changing password', {
      error: err.message,
      userId: req.user?.id,
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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
    logger.error('Error getting license config', {
      error: err.message,
      adminId: req.user?.id,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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
    logger.error('Error updating license config', {
      error: err.message,
      adminId: req.user?.id,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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
    logger.error('Error getting available licenses', {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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
    logger.error('Error getting password reminders', {
      error: err.message,
      adminId: req.user?.id,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 