/**
 * Authentication middleware
 * Validates JWT tokens and attaches user to request
 */

import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import logger from '../utils/logger.js';

const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';

/**
 * Middleware to authenticate requests using JWT
 * Attaches user object to req.user if token is valid
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    
    // Attach user to request (async lookup)
    User.findByPk(payload.id)
      .then(user => {
        if (!user) {
          req.user = null;
        } else {
          req.user = user;
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
