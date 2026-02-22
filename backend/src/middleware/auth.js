/**
 * Authentication middleware
 * Validates JWT tokens and attaches user to request
 */

import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { normalizeLicenseType, resolveLicenseExpiry } from '../utils/licenseUtils.js';
import { generateLicenseKey } from '../utils/cryptoUtils.js';
import logger from '../utils/logger.js';

const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';

/**
 * If user has no valid license and never used trial, and has OAuth (Google/Twitch/Discord), assign trial once.
 * So users created with licenseType 'none' get trial on next request without re-login.
 */
async function ensureTrialForOAuthUser(user) {
  if (!user || user.isAdmin) return user;
  const plain = user.get ? user.get({ plain: true }) : user;
  const hasOAuth = !!(plain.googleId || plain.twitchId || plain.discordId || plain.twitterId || (plain.oauthProvider === 'twitter' && plain.oauthId));
  const noLicense = !plain.licenseKey || String(plain.licenseKey).length < 10;
  const neverUsedTrial = !plain.hasUsedTrial;
  if (!hasOAuth || !noLicense || !neverUsedTrial) return user;

  try {
    const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('trial') });
    user.licenseType = normalizeLicenseType('trial');
    user.licenseKey = generateLicenseKey('TRIAL', 12);
    user.licenseExpiresAt = expiryResult.error ? null : expiryResult.value;
    user.hasUsedTrial = true;
    await user.save();
    return user;
  } catch (err) {
    logger.warn('Could not assign trial in auth middleware', { userId: plain.id, error: err.message });
    return user;
  }
}

/**
 * Middleware to authenticate requests using JWT
 * Attaches user object to req.user if token is valid.
 * For GET /api/user/twitch/connect, also accepts token in query (redirect flow has no Authorization header).
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token && req.method === 'GET' && req.query?.token) {
    const url = req.originalUrl || req.url || '';
    if (url.startsWith('/api/user/twitch/connect') || url.startsWith('/api/youtube/connect')) {
      token = req.query.token;
    }
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    
    // Attach user to request (async lookup)
    User.findByPk(payload.id)
      .then(async (user) => {
        if (!user) {
          req.user = null;
        } else {
          await ensureTrialForOAuthUser(user);
          req.user = user.get({ plain: true });
        }
        next();
      })
      .catch(err => {
        logger.error('Error fetching user in auth middleware', {
          error: err.message,
          userId: payload.id,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
        req.user = null;
        next();
      });
  } catch (error) {
    // Token is invalid or expired
    if (error.name === 'TokenExpiredError') {
      req.user = null;
    } else if (error.name === 'JsonWebTokenError') {
      req.user = null;
    } else {
      req.user = null;
    }
    next();
  }
}

/**
 * Middleware to require authentication
 * Returns 401 if user is not authenticated
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Middleware to require admin role
 * Returns 403 if user is not admin
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
