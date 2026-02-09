/**
 * Authentication Utilities
 * Helper functions for JWT generation and user response formatting
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import jwt from 'jsonwebtoken';
import { buildLicenseSummary } from './licenseUtils.js';

const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

/**
 * Create a short-lived state token for OAuth link flow (userId in state)
 * @param {number} userId - User id to link the provider to
 * @param {string} purpose - e.g. 'link_discord', 'link_google'
 * @returns {string} JWT state token
 */
export function createLinkState(userId, purpose) {
  return jwt.sign(
    { userId, purpose },
    jwtSecret,
    { expiresIn: '10m' }
  );
}

/**
 * Verify link state token and return userId
 * @param {string} stateToken - JWT from OAuth state
 * @param {string} purpose - expected purpose
 * @returns {{ userId: number }|null}
 */
export function verifyLinkState(stateToken, purpose) {
  try {
    const payload = jwt.verify(stateToken, jwtSecret);
    if (payload.purpose !== purpose) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

/**
 * Create state for X (Twitter) OAuth 2.0 with PKCE. Stores code_verifier so callback can exchange code.
 * @param {string} codeVerifier - PKCE code_verifier
 * @param {string} purpose - 'twitter_oauth2_login' | 'link_twitter'
 * @param {number} [userId] - For link_twitter only
 * @returns {string} JWT state token
 */
export function createTwitterOAuth2State(codeVerifier, purpose, userId) {
  const payload = { purpose, verifier: codeVerifier };
  if (purpose === 'link_twitter' && userId != null) payload.userId = userId;
  return jwt.sign(payload, jwtSecret, { expiresIn: '10m' });
}

/**
 * Verify X OAuth 2.0 state and return verifier (and userId for link).
 * @param {string} stateToken - JWT from OAuth state
 * @param {string} purpose - 'twitter_oauth2_login' | 'link_twitter'
 * @returns {{ verifier: string, userId?: number }|null}
 */
export function verifyTwitterOAuth2State(stateToken, purpose) {
  try {
    const payload = jwt.verify(stateToken, jwtSecret);
    if (payload.purpose !== purpose || !payload.verifier) return null;
    const out = { verifier: payload.verifier };
    if (purpose === 'link_twitter' && payload.userId != null) out.userId = payload.userId;
    return out;
  } catch {
    return null;
  }
}

/**
 * Generate JWT token for a user
 * @param {Object} user - User object with id, email, username, isAdmin
 * @returns {string} JWT token
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin
    },
    jwtSecret,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Build standardized user response object
 * @param {Object} user - Sequelize User instance or plain user object
 * @returns {Object} Formatted user response with license summary
 */
export function buildUserResponse(user) {
  // Convert Sequelize instance to plain object if needed
  const userPlain = user.get ? user.get({ plain: true }) : user;
  const licenseSummary = buildLicenseSummary(userPlain);

  return {
    id: userPlain.id,
    username: userPlain.username,
    email: userPlain.email,
    licenseKey: userPlain.licenseKey,
    licenseExpiresAt: userPlain.licenseExpiresAt,
    licenseType: userPlain.licenseType,
    licenseAlert: licenseSummary.alert,
    licenseDaysLeft: licenseSummary.daysLeft,
    isAdmin: userPlain.isAdmin,
    merchandisingLink: userPlain.merchandisingLink,
    profileImageUrl: userPlain.profileImageUrl || null,
    dashboardShowTwitchSubs: userPlain.dashboardShowTwitchSubs !== false,
    dashboardShowTwitchBits: userPlain.dashboardShowTwitchBits !== false,
    dashboardShowTwitchDonations: userPlain.dashboardShowTwitchDonations === true
  };
}

/**
 * Generate authentication response with token and user data
 * @param {Object} user - Sequelize User instance or plain user object
 * @returns {Object} Object with token and user data
 */
export function generateAuthData(user) {
  const token = generateToken(user);
  const userResponse = buildUserResponse(user);

  return {
    token,
    user: userResponse
  };
}
