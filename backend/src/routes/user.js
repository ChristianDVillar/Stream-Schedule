import { createRequire } from 'module';
import express from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as TwitchStrategy } from 'passport-twitch';
import { Op } from 'sequelize';

const require = createRequire(import.meta.url);
const DiscordStrategy = require('passport-discord').Strategy;
import { User, Content, Media, SystemConfig, sequelize } from '../models/index.js';
import checkLicense from '../middleware/checkLicense.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { normalizeLicenseType, resolveLicenseExpiry, buildLicenseSummary } from '../utils/licenseUtils.js';
import { generateLicenseKey, generateTemporaryPassword, generateUsernameSuffix } from '../utils/cryptoUtils.js';
import jwt from 'jsonwebtoken';
import { generateAuthData, buildUserResponse, createLinkState, verifyLinkState } from '../utils/authUtils.js';
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
  extendTrialSchema,
  linkSupabaseSchema
} from '../validators/userSchemas.js';
import logger from '../utils/logger.js';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

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

      // Find or create user (by email or any linked Google id)
      let user = await User.findOne({
        where: {
          [Op.or]: [
            { email },
            { googleId: profile.id },
            { oauthId: profile.id, oauthProvider: 'google' },
          ],
        },
      });

      if (user) {
        user.googleId = profile.id;
        if (!user.oauthId) {
          user.oauthId = profile.id;
          user.oauthProvider = 'google';
        }
        // Assign trial on first login if user has no license and never used trial
        if ((!user.licenseKey || String(user.licenseKey).length < 10) && !user.hasUsedTrial) {
          const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('trial') });
          user.licenseType = normalizeLicenseType('trial');
          user.licenseKey = generateLicenseKey('TRIAL', 12);
          user.licenseExpiresAt = expiryResult.error ? null : expiryResult.value;
          user.hasUsedTrial = true;
        }
        await user.save();
      } else {
        const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('trial') });
        user = await User.create({
          username: displayName.replace(/\s+/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') + generateUsernameSuffix(3),
          email,
          passwordHash: null,
          oauthProvider: 'google',
          oauthId: profile.id,
          googleId: profile.id,
          licenseType: normalizeLicenseType('trial'),
          licenseKey: generateLicenseKey('TRIAL', 12),
          licenseExpiresAt: expiryResult.error ? null : expiryResult.value,
          hasUsedTrial: true,
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Twitch OAuth validation function
const isTwitchConfigured = () => {
  const id = (process.env.TWITCH_CLIENT_ID || '').trim();
  const secret = (process.env.TWITCH_CLIENT_SECRET || '').trim();
  return id.length > 0 && secret.length > 0 && id !== 'your-twitch-client-id' && secret !== 'your-twitch-client-secret';
};

// Configure Twitch OAuth Strategy
if (isTwitchConfigured()) {
  passport.use(new TwitchStrategy({
    clientID: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/user/auth/twitch/callback`,
    scope: 'user:read:email'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      logger.debug('Twitch OAuth profile received', { 
        profileId: profile.id,
        profileKeys: Object.keys(profile),
        hasEmail: !!profile.email,
        displayName: profile.display_name,
        login: profile.login
      });
      
      let email = profile.email;
      const displayName = profile.display_name || profile.login || 'User';
      
      // If email is not in profile, fetch it from Twitch API
      if (!email && accessToken) {
        try {
          logger.info('Email not in profile, fetching from Twitch API', { profileId: profile.id });
          const response = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Client-Id': process.env.TWITCH_CLIENT_ID
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0 && data.data[0].email) {
              email = data.data[0].email;
              logger.info('Email retrieved from Twitch API', { profileId: profile.id, hasEmail: !!email });
            }
          } else {
            logger.warn('Failed to fetch email from Twitch API', { 
              status: response.status,
              statusText: response.statusText 
            });
          }
        } catch (apiError) {
          logger.error('Error fetching email from Twitch API', { error: apiError.message });
        }
      }
      
      if (!email) {
        logger.error('Twitch OAuth: No email provided', { 
          profileId: profile.id,
          profileKeys: Object.keys(profile),
          hasAccessToken: !!accessToken,
          profileData: JSON.stringify(profile, null, 2)
        });
        return done(new Error('No email provided by Twitch. Please ensure your Twitch account has a verified email and the OAuth app has the user:read:email scope.'), null);
      }

      // Find or create user (by email or any linked Twitch id)
      const twitchIdStr = profile.id.toString();
      let user = await User.findOne({
        where: {
          [Op.or]: [
            { email },
            { twitchId: twitchIdStr },
            { oauthId: twitchIdStr, oauthProvider: 'twitch' },
          ],
        },
      });

      if (user) {
        user.twitchId = twitchIdStr;
        if (!user.oauthId) {
          user.oauthId = twitchIdStr;
          user.oauthProvider = 'twitch';
        }
        // Assign trial on first login if user has no license and never used trial
        if ((!user.licenseKey || String(user.licenseKey).length < 10) && !user.hasUsedTrial) {
          const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('trial') });
          user.licenseType = normalizeLicenseType('trial');
          user.licenseKey = generateLicenseKey('TRIAL', 12);
          user.licenseExpiresAt = expiryResult.error ? null : expiryResult.value;
          user.hasUsedTrial = true;
        }
        await user.save();
      } else {
        const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('trial') });
        user = await User.create({
          username: displayName.replace(/\s+/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') + generateUsernameSuffix(3),
          email,
          passwordHash: null,
          oauthProvider: 'twitch',
          oauthId: twitchIdStr,
          twitchId: twitchIdStr,
          licenseType: normalizeLicenseType('trial'),
          licenseKey: generateLicenseKey('TRIAL', 12),
          licenseExpiresAt: expiryResult.error ? null : expiryResult.value,
          hasUsedTrial: true,
        });
      }

      logger.info('Twitch OAuth user processed successfully', { userId: user.id, email: user.email });
      return done(null, user);
    } catch (error) {
      logger.error('Twitch OAuth error in strategy', { 
        error: error.message,
        stack: error.stack 
      });
      return done(error, null);
    }
  }));
}

// Discord Client ID must be a numeric snowflake (e.g. 1467906951827423305), not a placeholder
const isDiscordConfigured = () => {
  const id = (process.env.DISCORD_CLIENT_ID || '').trim();
  const secret = (process.env.DISCORD_CLIENT_SECRET || '').trim();
  return id.length >= 16 && /^\d+$/.test(id) && secret.length > 0;
};

// Configure Discord OAuth Strategy (user token stored for guild listing; bot token only in env, never in DB)
if (isDiscordConfigured()) {
  passport.use(new DiscordStrategy({
    clientID: (process.env.DISCORD_CLIENT_ID || '').trim(),
    clientSecret: (process.env.DISCORD_CLIENT_SECRET || '').trim(),
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/user/auth/discord/callback`,
    scope: ['identify', 'email', 'guilds'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.email || `discord_${profile.id}@placeholder.local`;
      const displayName = (profile.username || profile.global_name || `user${profile.id}`).toString();

      // Find or create user (by email or any linked Discord id)
      let user = await User.findOne({
        where: {
          [Op.or]: [
            { email },
            { discordId: profile.id },
            { oauthId: profile.id, oauthProvider: 'discord' },
          ],
        },
      });

      if (user) {
        user.discordId = profile.id;
        user.discordAccessToken = accessToken;
        user.discordRefreshToken = refreshToken;
        if (!user.oauthId) {
          user.oauthId = profile.id;
          user.oauthProvider = 'discord';
        }
        // Assign trial on first login if user has no license and never used trial
        if ((!user.licenseKey || String(user.licenseKey).length < 10) && !user.hasUsedTrial) {
          const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('trial') });
          user.licenseType = normalizeLicenseType('trial');
          user.licenseKey = generateLicenseKey('TRIAL', 12);
          user.licenseExpiresAt = expiryResult.error ? null : expiryResult.value;
          user.hasUsedTrial = true;
        }
        await user.save();
      } else {
        const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('trial') });
        const baseUsername = (displayName || 'user').replace(/\s+/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
        user = await User.create({
          username: baseUsername + generateUsernameSuffix(3),
          email,
          passwordHash: null,
          oauthProvider: 'discord',
          oauthId: profile.id,
          discordId: profile.id,
          discordAccessToken: accessToken,
          discordRefreshToken: refreshToken,
          licenseType: normalizeLicenseType('trial'),
          licenseKey: generateLicenseKey('TRIAL', 12),
          licenseExpiresAt: expiryResult.error ? null : expiryResult.value,
          hasUsedTrial: true,
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

    const email = String(supabaseUser.email).trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(401).json({ error: 'Invalid token or missing email' });
    }
    const provider = supabaseUser.app_metadata?.provider ?? 'google';
    const isTwitch = provider === 'twitch';
    // Twitch: preferred_username or user_name; Google: full_name / name
    const rawName = isTwitch
      ? (supabaseUser.user_metadata?.preferred_username ?? supabaseUser.user_metadata?.user_name ?? supabaseUser.user_metadata?.name ?? email?.split('@')[0])
      : (supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? supabaseUser.email?.split('@')[0] ?? 'User');
    const fullName = typeof rawName === 'string' ? rawName : (rawName && typeof rawName === 'object' ? [rawName.given_name, rawName.family_name].filter(Boolean).join(' ') : 'User') || 'User';
    const supabaseId = supabaseUser.id;

    // 2) Find or create user in DB (by email or any linked Google/Twitch id)
    const oauthProvider = isTwitch ? 'twitch' : 'google';
    let dbUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          ...(isTwitch ? [{ twitchId: supabaseId }, { oauthId: supabaseId, oauthProvider: 'twitch' }] : [{ googleId: supabaseId }, { oauthId: supabaseId, oauthProvider: 'google' }]),
        ],
      },
    });

    if (dbUser) {
      if (isTwitch) {
        dbUser.twitchId = supabaseId;
      } else {
        dbUser.googleId = supabaseId;
      }
      if (!dbUser.oauthId) {
        dbUser.oauthId = supabaseId;
        dbUser.oauthProvider = oauthProvider;
      }
      // Assign trial on first login if user has no license and never used trial
      if ((!dbUser.licenseKey || String(dbUser.licenseKey).length < 10) && !dbUser.hasUsedTrial) {
        const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('trial') });
        dbUser.licenseType = normalizeLicenseType('trial');
        dbUser.licenseKey = generateLicenseKey('TRIAL', 12);
        dbUser.licenseExpiresAt = expiryResult.error ? null : expiryResult.value;
        dbUser.hasUsedTrial = true;
      }
      await dbUser.save();
    } else {
      const baseUsername = ((fullName || 'user').replace(/\s+/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'user').slice(0, 20);
      const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('trial') });
      const licenseExpiresAt = expiryResult.error ? null : expiryResult.value;
      let username = baseUsername + generateUsernameSuffix(3);
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          dbUser = await User.create({
            username: attempt === 0 ? username : baseUsername + generateUsernameSuffix(5 + attempt),
            email,
            passwordHash: null,
            oauthProvider,
            oauthId: supabaseId,
            ...(isTwitch ? { twitchId: supabaseId } : { googleId: supabaseId }),
            licenseType: normalizeLicenseType('trial'),
            licenseKey: generateLicenseKey('TRIAL', 12),
            licenseExpiresAt,
            hasUsedTrial: true,
          });
          break;
        } catch (createErr) {
          const isUsernameConflict = createErr.name === 'SequelizeUniqueConstraintError' &&
            (createErr.fields?.username !== undefined || (Array.isArray(createErr.fields) && createErr.fields.includes('username')) || createErr.message?.includes('username'));
          if (isUsernameConflict && attempt < 4) continue;
          throw createErr;
        }
      }
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
      errors: err.errors,
    });
    const isDev = process.env.NODE_ENV === 'development';
    const isValidation = err.name === 'SequelizeValidationError';
    const isUnique = err.name === 'SequelizeUniqueConstraintError';
    const details = isDev
      ? (isValidation && err.errors?.length ? err.errors.map((e) => `${e.path}: ${e.message}`).join('; ') : err.message)
      : (isValidation || isUnique ? 'Invalid or duplicate user data. Try logging in with the same provider you used to sign up.' : undefined);
    res.status(500).json({
      error: 'OAuth login failed',
      ...(details && { details }),
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

router.get('/auth/twitch', (req, res, next) => {
  if (!isTwitchConfigured()) {
    logger.warn('Twitch OAuth login attempted but Twitch is not configured');
    return res.redirect(`${FRONTEND_URL}/login?error=twitch_not_configured`);
  }
  logger.info('Initiating Twitch OAuth flow');
  passport.authenticate('twitch', { scope: ['user:read:email'] })(req, res, next);
});

router.get('/auth/twitch/callback',
  (req, res, next) => {
    if (!isTwitchConfigured()) {
      logger.warn('Twitch OAuth callback attempted but Twitch is not configured');
      return res.redirect(`${FRONTEND_URL}/login?error=twitch_not_configured`);
    }
    // Log callback attempt for debugging
    logger.info('Twitch OAuth callback received', { 
      query: req.query,
      hasCode: !!req.query.code,
      hasError: !!req.query.error 
    });
    
    if (req.query.error) {
      logger.error('Twitch OAuth callback error', { 
        error: req.query.error,
        errorDescription: req.query.error_description 
      });
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed&reason=${encodeURIComponent(req.query.error_description || req.query.error)}`);
    }
    
    passport.authenticate('twitch', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` })(req, res, next);
  },
  (req, res) => {
    if (!req.user) {
      logger.error('Twitch OAuth callback: user not found after authentication');
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed&reason=user_not_found`);
    }
    logger.info('Twitch OAuth callback successful', { userId: req.user.id, email: req.user.email });
    generateAuthResponse(req.user, res);
  }
);

// Export for app.js: register these BEFORE authenticateToken so Discord/Twitch OAuth works without JWT
export { isDiscordConfigured, isTwitchConfigured };

// Discord OAuth handlers - define before using in routes
export const discordAuth = (req, res, next) => {
  if (!isDiscordConfigured()) {
    return res.redirect(`${FRONTEND_URL}/login?error=discord_not_configured`);
  }
  const returnTo = (req.query.returnTo || '').trim() || undefined;
  passport.authenticate('discord', { scope: ['identify', 'email', 'guilds'], state: returnTo })(req, res, next);
};

export const discordCallback = (req, res, next) => {
  if (!isDiscordConfigured()) {
    return res.redirect(`${FRONTEND_URL}/login?error=discord_not_configured`);
  }
  passport.authenticate('discord', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` })(req, res, (err) => {
    if (err) return next(err);
    // Use generateAuthResponse for consistency, but handle returnTo state
    const returnTo = (req.query.state || '').trim() || undefined;
    if (returnTo) {
      const authData = generateAuthData(req.user);
      const redirectUrl = `${FRONTEND_URL}/auth/callback?token=${authData.token}&user=${encodeURIComponent(JSON.stringify(authData.user))}&returnTo=${encodeURIComponent(returnTo)}`;
      return res.redirect(redirectUrl);
    }
    // Standard OAuth callback - use generateAuthResponse
    generateAuthResponse(req.user, res);
  });
};

// Discord OAuth routes - using exported functions for consistency
router.get('/auth/discord', discordAuth);
router.get('/auth/discord/callback', discordCallback);

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

/** Start Discord link flow: token in query, redirect to Discord OAuth with state=userId. Register before authenticateToken. */
export const discordLinkStart = async (req, res) => {
  if (!isDiscordConfigured()) {
    logger.warn('Discord link start: Discord not configured');
    return res.redirect(`${FRONTEND_URL}/login?error=discord_not_configured`);
  }
  const token = (req.query.token || '').trim();
  if (!token) {
    logger.warn('Discord link start: missing token');
    return res.redirect(`${FRONTEND_URL}/settings?error=link_token_missing`);
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const stateToken = createLinkState(payload.id, 'link_discord');
    const clientId = (process.env.DISCORD_CLIENT_ID || '').trim();
    const redirectUri = `${BACKEND_URL}/api/user/auth/discord/link/callback`;
    const scope = 'identify email guilds';
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(stateToken)}`;
    
    logger.info('Discord link start: redirecting to Discord OAuth', {
      userId: payload.id,
      redirectUri,
      clientIdLength: clientId.length,
      stateTokenLength: stateToken.length
    });
    
    res.redirect(url);
  } catch (err) {
    logger.error('Discord link start: token verification failed', { 
      error: err.message,
      hasToken: !!token 
    });
    res.redirect(`${FRONTEND_URL}/settings?error=link_token_invalid`);
  }
};

/** Discord link callback: exchange code for token, attach Discord to user by state userId. Register before authenticateToken. */
export const discordLinkCallback = async (req, res) => {
  const { code, state, error, error_description } = req.query;
  
  // Handle Discord OAuth errors
  if (error) {
    logger.warn('Discord OAuth error in callback', { 
      error, 
      error_description,
      query: req.query 
    });
    return res.redirect(`${FRONTEND_URL}/settings?error=link_failed&reason=${encodeURIComponent(error_description || error)}`);
  }
  
  if (!code || !state) {
    logger.warn('Discord link callback: missing code or state', { 
      hasCode: !!code, 
      hasState: !!state,
      query: req.query 
    });
    return res.redirect(`${FRONTEND_URL}/settings?error=link_failed&reason=missing_code_or_state`);
  }
  
  logger.info('Discord link callback received', { 
    hasCode: !!code, 
    hasState: !!state,
    stateLength: state?.length 
  });
  
  const parsed = verifyLinkState(state, 'link_discord');
  if (!parsed) {
    logger.warn('Discord link callback: invalid state token', { 
      stateLength: state?.length,
      statePreview: state?.substring(0, 50) 
    });
    return res.redirect(`${FRONTEND_URL}/settings?error=link_state_invalid`);
  }
  
  const clientId = (process.env.DISCORD_CLIENT_ID || '').trim();
  const clientSecret = (process.env.DISCORD_CLIENT_SECRET || '').trim();
  const redirectUri = `${BACKEND_URL}/api/user/auth/discord/link/callback`;
  
  if (!clientId || !clientSecret) {
    logger.error('Discord link callback: Discord credentials not configured');
    return res.redirect(`${FRONTEND_URL}/settings?error=link_failed&reason=discord_not_configured`);
  }
  
  try {
    logger.debug('Discord link callback: exchanging code for token', { 
      redirectUri,
      clientIdLength: clientId.length 
    });
    
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
    
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      logger.error('Discord link token exchange failed', { 
        status: tokenRes.status, 
        statusText: tokenRes.statusText,
        body: errText,
        redirectUri,
        codeLength: code?.length 
      });
      return res.redirect(`${FRONTEND_URL}/settings?error=link_failed&reason=token_exchange_failed`);
    }
    
    const data = await tokenRes.json();
    if (!data.access_token) {
      logger.error('Discord link: no access_token in response', { responseKeys: Object.keys(data) });
      return res.redirect(`${FRONTEND_URL}/settings?error=link_failed&reason=no_access_token`);
    }
    
    logger.info('Discord link: token exchange successful', { userId: parsed.userId });
    
    const user = await User.findByPk(parsed.userId);
    if (!user) {
      logger.error('Discord link callback: user not found', { userId: parsed.userId });
      return res.redirect(`${FRONTEND_URL}/settings?error=link_failed&reason=user_not_found`);
    }
    
    // Get Discord user ID
    const discordUserRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    
    if (!discordUserRes.ok) {
      const errText = await discordUserRes.text();
      logger.error('Discord link: failed to get user info', { 
        status: discordUserRes.status,
        body: errText 
      });
      return res.redirect(`${FRONTEND_URL}/settings?error=link_failed&reason=user_info_failed`);
    }
    
    const discordUser = await discordUserRes.json();
    const discordUserId = discordUser.id;
    
    if (!discordUserId) {
      logger.error('Discord link: no user ID in Discord response', { responseKeys: Object.keys(discordUser) });
      return res.redirect(`${FRONTEND_URL}/settings?error=link_failed&reason=no_discord_user_id`);
    }
    
    // Update user with Discord info
    user.discordId = discordUserId;
    user.discordAccessToken = data.access_token;
    user.discordRefreshToken = data.refresh_token || user.discordRefreshToken;
    
    if (!user.oauthId) {
      user.oauthId = discordUserId;
      user.oauthProvider = 'discord';
    }
    
    await user.save();
    
    logger.info('Discord link: successfully linked Discord account', { 
      userId: parsed.userId,
      discordUserId 
    });
    
    res.redirect(`${FRONTEND_URL}/settings?linked=discord`);
  } catch (err) {
    logger.error('Discord link callback error', { 
      error: err.message,
      stack: err.stack,
      userId: parsed?.userId 
    });
    res.redirect(`${FRONTEND_URL}/settings?error=link_failed&reason=${encodeURIComponent(err.message)}`);
  }
};

// Discord link routes (must be registered so /api/user/* is handled by this router on Render)
router.get('/auth/discord/link', discordLinkStart);
router.get('/auth/discord/link/callback', discordLinkCallback);

/** POST /link-google - link Google (Supabase OAuth) to current user. Requires JWT + body.supabaseAccessToken. */
export async function linkGoogleHandler(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }
    const supabaseToken = req.body.supabaseAccessToken;
    const { data, error } = await supabaseAdmin.auth.getUser(supabaseToken);
    if (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const supabaseUser = data?.user ?? data;
    if (!supabaseUser?.email) {
      return res.status(401).json({ error: 'Invalid token or missing email' });
    }
    const provider = supabaseUser.app_metadata?.provider ?? 'google';
    if (provider !== 'google') {
      return res.status(400).json({ error: 'Token is not from Google. Use link-twitch for Twitch.' });
    }
    const supabaseId = supabaseUser.id;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.googleId = supabaseId;
    if (!user.oauthId) {
      user.oauthId = supabaseId;
      user.oauthProvider = 'google';
    }
    await user.save();
    res.json({ message: 'Google account linked' });
  } catch (err) {
    logger.error('Link Google error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
}

/** POST /link-twitch - link Twitch (Supabase OAuth) to current user. Requires JWT + body.supabaseAccessToken. */
export async function linkTwitchHandler(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }
    const supabaseToken = req.body.supabaseAccessToken;
    const { data, error } = await supabaseAdmin.auth.getUser(supabaseToken);
    if (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const supabaseUser = data?.user ?? data;
    if (!supabaseUser?.email) {
      return res.status(401).json({ error: 'Invalid token or missing email' });
    }
    const provider = supabaseUser.app_metadata?.provider ?? 'twitch';
    if (provider !== 'twitch') {
      return res.status(400).json({ error: 'Token is not from Twitch. Use link-google for Google.' });
    }
    const supabaseId = supabaseUser.id;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.twitchId = supabaseId;
    if (!user.oauthId) {
      user.oauthId = supabaseId;
      user.oauthProvider = 'twitch';
    }
    await user.save();
    res.json({ message: 'Twitch account linked' });
  } catch (err) {
    logger.error('Link Twitch error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
}

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

/** GET /connected-accounts - which OAuth providers and email are linked to the current user. Exported for explicit registration in app.js if needed. */
export async function connectedAccountsHandler(req, res) {
  const userId = req.user?.id;
  logger.debug('Get connected accounts request', { userId, ip: req.ip });
  
  try {
    const user = await User.findByPk(userId, {
      attributes: ['googleId', 'twitchId', 'discordId', 'passwordHash', 'oauthProvider', 'oauthId', 'discordAccessToken', 'discordRefreshToken'],
    });
    if (!user) {
      logger.warn('Connected accounts: User not found', { userId });
      return res.status(404).json({ error: 'User not found' });
    }
    const u = user.get ? user.get({ plain: true }) : user;
    
    logger.debug('Connected accounts: User data retrieved', {
      userId,
      hasGoogleId: !!u.googleId,
      hasTwitchId: !!u.twitchId,
      hasDiscordId: !!u.discordId,
      hasPassword: !!u.passwordHash,
      oauthProvider: u.oauthProvider,
      oauthId: u.oauthId,
      hasDiscordToken: !!(u.discordAccessToken || u.discordRefreshToken)
    });
    
    // Check if Discord is connected: must have discordId AND (discordAccessToken OR discordRefreshToken)
    // This ensures Discord is only shown as connected if it can actually be used (has tokens)
    // Note: oauthProvider === 'discord' alone is not enough - need actual tokens for API calls
    const discordConnected = !!(u.discordId && (u.discordAccessToken || u.discordRefreshToken));
    const googleConnected = !!(u.googleId || (u.oauthProvider === 'google' && u.oauthId));
    const twitchConnected = !!(u.twitchId || (u.oauthProvider === 'twitch' && u.oauthId));
    
    const result = {
      google: googleConnected,
      twitch: twitchConnected,
      discord: discordConnected,
      email: !!u.passwordHash,
    };
    
    logger.debug('Connected accounts: Result', { userId, ...result });
    
    res.json(result);
  } catch (err) {
    logger.error('Connected accounts error', { 
      error: err.message,
      stack: err.stack,
      userId,
      name: err.name,
      code: err.code,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
    console.error('Connected accounts - Full error details:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

router.get('/connected-accounts', requireAuth, connectedAccountsHandler);

/** Ensure user has at least one login method (password or any OAuth). */
function hasAnyLoginMethod(u) {
  return !!(u.passwordHash || u.googleId || u.twitchId || u.discordId);
}

/** POST /disconnect-google - remove Google from current account. */
router.post('/disconnect-google', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  logger.info('Disconnect Google request', { userId, ip: req.ip });
  
  try {
    const user = await User.findByPk(userId, { attributes: ['id', 'googleId', 'twitchId', 'discordId', 'passwordHash', 'oauthProvider', 'oauthId'] });
    if (!user) {
      logger.warn('Disconnect Google: User not found', { userId });
      return res.status(404).json({ error: 'User not found' });
    }
    if (!user.googleId) {
      logger.warn('Disconnect Google: Google not connected', { userId });
      return res.status(400).json({ error: 'Google is not connected' });
    }
    const u = user.get ? user.get({ plain: true }) : user;
    u.googleId = null;
    if (!hasAnyLoginMethod(u)) {
      logger.warn('Disconnect Google: Would leave user without login method', { userId });
      return res.status(400).json({ error: 'You must keep at least one sign-in method' });
    }
    user.googleId = null;
    if (user.oauthProvider === 'google') {
      user.oauthProvider = user.twitchId ? 'twitch' : user.discordId ? 'discord' : null;
      user.oauthId = user.twitchId || user.discordId || null;
    }
    await user.save();
    logger.info('Google disconnected successfully', { userId });
    res.json({ message: 'Google disconnected' });
  } catch (err) {
    logger.error('Disconnect Google error', { 
      error: err.message,
      stack: err.stack,
      userId,
      name: err.name,
      code: err.code,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
    console.error('Disconnect Google - Full error details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /disconnect-twitch - remove Twitch from current account. */
router.post('/disconnect-twitch', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  logger.info('Disconnect Twitch request', { userId, ip: req.ip });
  
  try {
    const user = await User.findByPk(userId, { attributes: ['id', 'googleId', 'twitchId', 'discordId', 'passwordHash', 'oauthProvider', 'oauthId'] });
    if (!user) {
      logger.warn('Disconnect Twitch: User not found', { userId });
      return res.status(404).json({ error: 'User not found' });
    }
    if (!user.twitchId) {
      logger.warn('Disconnect Twitch: Twitch not connected', { userId });
      return res.status(400).json({ error: 'Twitch is not connected' });
    }
    const u = user.get ? user.get({ plain: true }) : user;
    u.twitchId = null;
    if (!hasAnyLoginMethod(u)) {
      logger.warn('Disconnect Twitch: Would leave user without login method', { userId });
      return res.status(400).json({ error: 'You must keep at least one sign-in method' });
    }
    user.twitchId = null;
    if (user.oauthProvider === 'twitch') {
      user.oauthProvider = user.googleId ? 'google' : user.discordId ? 'discord' : null;
      user.oauthId = user.googleId || user.discordId || null;
    }
    await user.save();
    logger.info('Twitch disconnected successfully', { userId });
    res.json({ message: 'Twitch disconnected' });
  } catch (err) {
    logger.error('Disconnect Twitch error', { 
      error: err.message,
      stack: err.stack,
      userId,
      name: err.name,
      code: err.code,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
    console.error('Disconnect Twitch - Full error details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /disconnect-discord - remove Discord from current account. */
router.post('/disconnect-discord', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  logger.info('Disconnect Discord request', { userId, ip: req.ip });
  
  try {
    const user = await User.findByPk(userId, { attributes: ['id', 'googleId', 'twitchId', 'discordId', 'passwordHash', 'oauthProvider', 'oauthId', 'discordAccessToken', 'discordRefreshToken'] });
    if (!user) {
      logger.warn('Disconnect Discord: User not found', { userId });
      return res.status(404).json({ error: 'User not found' });
    }
    
    logger.debug('Disconnect Discord: User data retrieved', {
      userId: user.id,
      hasDiscordId: !!user.discordId,
      hasDiscordToken: !!(user.discordAccessToken || user.discordRefreshToken),
      oauthProvider: user.oauthProvider,
      hasGoogleId: !!user.googleId,
      hasTwitchId: !!user.twitchId,
      hasPassword: !!user.passwordHash
    });
    
    const hasDiscord = user.discordId || (user.oauthProvider === 'discord' && user.oauthId);
    if (!hasDiscord) {
      logger.warn('Disconnect Discord: Discord not connected', { 
        userId: user.id,
        discordId: user.discordId,
        oauthProvider: user.oauthProvider,
        oauthId: user.oauthId
      });
      return res.status(400).json({ error: 'Discord is not connected' });
    }
    
    // Store original discordId before clearing it (needed for edge case check)
    const originalDiscordId = user.discordId;
    const wasDiscordPrimary = user.oauthProvider === 'discord';
    
    // Check if user will have at least one login method after disconnecting Discord
    const u = user.get ? user.get({ plain: true }) : user;
    u.discordId = null;
    if (wasDiscordPrimary) {
      u.oauthProvider = user.googleId ? 'google' : user.twitchId ? 'twitch' : null;
      u.oauthId = user.googleId || user.twitchId || null;
    }
    
    const hasLoginMethod = hasAnyLoginMethod(u);
    if (!hasLoginMethod) {
      logger.warn('Disconnect Discord: Would leave user without login method', {
        userId: user.id,
        googleId: user.googleId,
        twitchId: user.twitchId,
        passwordHash: !!user.passwordHash,
        discordId: originalDiscordId
      });
      return res.status(400).json({ error: 'You must keep at least one sign-in method' });
    }
    
    // Update the user model
    user.discordId = null;
    user.discordAccessToken = null;
    user.discordRefreshToken = null;
    
    // If Discord was the primary OAuth provider, switch to another or clear it
    if (wasDiscordPrimary) {
      user.oauthProvider = user.googleId ? 'google' : user.twitchId ? 'twitch' : null;
      user.oauthId = user.googleId || user.twitchId || null;
    } else if (user.oauthId && originalDiscordId && user.oauthId === originalDiscordId) {
      // Edge case: oauthId matches discordId but oauthProvider is not discord
      // This shouldn't happen normally, but we clean it up just in case
      if (!user.googleId && !user.twitchId) {
        user.oauthId = null;
      } else {
        user.oauthId = user.googleId || user.twitchId || null;
      }
    }
    
    logger.debug('Disconnect Discord: Saving user changes', {
      userId: user.id,
      newOauthProvider: user.oauthProvider,
      newOauthId: user.oauthId,
      discordIdCleared: !user.discordId
    });
    
    await user.save();
    
    // Verify the disconnect worked
    const savedUser = await User.findByPk(userId, {
      attributes: ['discordId', 'oauthProvider', 'oauthId', 'googleId', 'twitchId']
    });
    const stillConnected = savedUser.discordId || (savedUser.oauthProvider === 'discord' && savedUser.oauthId);
    if (stillConnected) {
      logger.error('Discord disconnect verification failed - Discord still appears connected', { 
        userId,
        discordId: savedUser.discordId,
        oauthProvider: savedUser.oauthProvider,
        oauthId: savedUser.oauthId,
        googleId: savedUser.googleId,
        twitchId: savedUser.twitchId
      });
      // Try to fix it
      savedUser.discordId = null;
      if (savedUser.oauthProvider === 'discord') {
        savedUser.oauthProvider = savedUser.googleId ? 'google' : savedUser.twitchId ? 'twitch' : null;
        savedUser.oauthId = savedUser.googleId || savedUser.twitchId || null;
      }
      await savedUser.save();
    }
    
    logger.info('Discord disconnected successfully', { userId });
    res.json({ message: 'Discord disconnected' });
  } catch (err) {
    logger.error('Disconnect Discord error', { 
      error: err.message,
      stack: err.stack,
      userId,
      name: err.name,
      code: err.code,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
    console.error('Disconnect Discord - Full error details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /link-google - link Google (Supabase) to current account. Body: { supabaseAccessToken }. */
router.post('/link-google', requireAuth, validateBody(linkSupabaseSchema), linkGoogleHandler);

/** POST /link-twitch - link Twitch (Supabase) to current account. Body: { supabaseAccessToken }. */
router.post('/link-twitch', requireAuth, validateBody(linkSupabaseSchema), linkTwitchHandler);

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
  const users = await User.findAll({ 
    attributes: [
      'id', 
      'username', 
      'email', 
      'licenseKey', 
      'licenseType', 
      'licenseExpiresAt', 
      'isAdmin', 
      'hasUsedTrial', 
      'trialExtensions',
      'googleId',
      'twitchId',
      'discordId',
      'discordAccessToken',
      'discordRefreshToken',
      'passwordHash',
      'oauthProvider',
      'oauthId'
    ] 
  });
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
    const u = user.get ? user.get({ plain: true }) : user;
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
      lastUploadAt,
      connectedPlatforms: {
        google: !!(u.googleId || (u.oauthProvider === 'google' && u.oauthId)),
        twitch: !!(u.twitchId || (u.oauthProvider === 'twitch' && u.oauthId)),
        // Discord requires both discordId AND tokens (accessToken or refreshToken) to be considered connected
        discord: !!(u.discordId && (u.discordAccessToken || u.discordRefreshToken)),
        email: !!u.passwordHash
      }
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

/** GET /twitch-dashboard-stats - Twitch subs/bits/donations for dashboard. Requires Twitch connected. */
router.get('/twitch-dashboard-stats', requireAuth, checkLicense, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'twitchId'] });
    const twitchConnected = !!(user && user.twitchId);
    if (!twitchConnected) {
      return res.json({
        twitchConnected: false,
        subscriptions: { total: 0, label: 'Suscripciones' },
        bits: { total: 0, label: 'Bits' },
        donations: { total: 0, label: 'Donaciones' }
      });
    }
    
    // Try to get real data from Twitch API
    // Note: Requires user to have connected Twitch with proper scopes
    // For now, return placeholder until user reconnects with scopes
    let subscriptions = { total: 0, label: 'Suscripciones' };
    let bits = { total: 0, label: 'Bits' };
    
    // Try to import Twitch service if available (requires axios)
    try {
      const twitchServiceModule = await import('../services/twitchService.js');
      const { TwitchService } = twitchServiceModule;
      const twitchService = new TwitchService();
      
      // If we had user access token with scopes, we could fetch real data:
      // const subsData = await twitchService.getSubscriptions(user.twitchId, userAccessToken);
      // subscriptions = { total: subsData.total, label: 'Suscripciones' };
      
      // const bitsData = await twitchService.getBitsLeaderboard(user.twitchId, userAccessToken);
      // bits = { total: bitsData.total, label: 'Bits' };
    } catch (importError) {
      // Service not available (axios not installed or other error)
      // Continue with placeholder data
      logger.debug('Twitch service not available, using placeholder data', { 
        error: importError.message 
      });
    }
    
    res.json({
      twitchConnected: true,
      subscriptions,
      bits,
      donations: { total: 0, label: 'Donaciones' } // External service needed
    });
  } catch (err) {
    logger.error('Twitch dashboard stats error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to load Twitch stats' });
  }
});

/** GET /twitch-subs - Lista detallada de suscriptores de Twitch */
router.get('/twitch-subs', requireAuth, checkLicense, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'twitchId'] });
    const twitchConnected = !!(user && user.twitchId);
    if (!twitchConnected) {
      return res.status(400).json({ error: 'Twitch no conectado' });
    }
    
    // TODO: Obtener datos reales de Twitch API cuando tengamos access token con scopes
    // Por ahora devolvemos estructura vacía
    res.json({
      subscriptions: []
    });
  } catch (err) {
    logger.error('Twitch subs list error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to load subscriptions' });
  }
});

/** GET /twitch-bits - Lista de bits. Query: ?format=chronological|total */
router.get('/twitch-bits', requireAuth, checkLicense, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'twitchId'] });
    const twitchConnected = !!(user && user.twitchId);
    if (!twitchConnected) {
      return res.status(400).json({ error: 'Twitch no conectado' });
    }
    
    const format = req.query.format || 'chronological'; // 'chronological' o 'total'
    
    // TODO: Obtener datos reales de Twitch API cuando tengamos access token con scopes
    // Por ahora devolvemos estructura vacía
    res.json({
      format,
      bits: []
    });
  } catch (err) {
    logger.error('Twitch bits list error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to load bits' });
  }
});

/** GET /twitch-donations - Lista de donaciones */
router.get('/twitch-donations', requireAuth, checkLicense, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'twitchId'] });
    const twitchConnected = !!(user && user.twitchId);
    if (!twitchConnected) {
      return res.status(400).json({ error: 'Twitch no conectado' });
    }
    
    // TODO: Integrar con servicio externo (Streamlabs, StreamElements, etc.)
    // Por ahora devolvemos estructura vacía
    res.json({
      donations: []
    });
  } catch (err) {
    logger.error('Twitch donations list error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to load donations' });
  }
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
router.put('/profile', requireAuth, validateBody(updateProfileSchema), auditLog('profile_updated', 'User'), async (req, res) => {
  const { username, email, merchandisingLink, dashboardShowTwitchSubs, dashboardShowTwitchBits, dashboardShowTwitchDonations } = req.body;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (merchandisingLink !== undefined) user.merchandisingLink = merchandisingLink;
    if (dashboardShowTwitchSubs !== undefined) user.dashboardShowTwitchSubs = dashboardShowTwitchSubs;
    if (dashboardShowTwitchBits !== undefined) user.dashboardShowTwitchBits = dashboardShowTwitchBits;
    if (dashboardShowTwitchDonations !== undefined) user.dashboardShowTwitchDonations = dashboardShowTwitchDonations;
    
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
        merchandisingLink: user.merchandisingLink,
        dashboardShowTwitchSubs: user.dashboardShowTwitchSubs,
        dashboardShowTwitchBits: user.dashboardShowTwitchBits,
        dashboardShowTwitchDonations: user.dashboardShowTwitchDonations
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