/**
 * YouTube OAuth Routes
 * Handles YouTube OAuth flow and token management
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import express from 'express';
import { google } from 'googleapis';
import { Integration } from '../models/index.js';
import { authenticateToken, requireAuth } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/youtube/callback`
);

/**
 * GET /api/youtube/connect
 * Initiates YouTube OAuth flow
 * Redirects user to Google OAuth consent screen
 */
router.get('/connect', requireAuth, (req, res) => {
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required to get refresh_token
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly'
      ],
      prompt: 'consent', // Force consent screen to ensure refresh_token
      state: req.user.id.toString() // Pass user ID in state for security
    });

    logger.info('YouTube OAuth flow initiated', { userId: req.user.id });
    res.redirect(url);
  } catch (error) {
    logger.error('Failed to initiate YouTube OAuth', {
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to initiate YouTube connection', details: error.message });
  }
});

/**
 * GET /api/youtube/callback
 * Handles OAuth callback from Google
 * Receives authorization code and exchanges it for tokens
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      logger.error('YouTube OAuth error', { error, state });
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?youtube_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      logger.error('YouTube OAuth callback missing code', { query: req.query });
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?youtube_error=missing_code`);
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      logger.warn('YouTube OAuth: No refresh_token received', {
        hasAccessToken: !!tokens.access_token,
        hasIdToken: !!tokens.id_token
      });
      // If no refresh_token, user may need to disconnect and reconnect
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?youtube_error=no_refresh_token`);
    }

    // Get user info from YouTube API
    oauth2Client.setCredentials(tokens);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelResponse = await youtube.channels.list({
      part: ['snippet', 'contentDetails'],
      mine: true
    });

    const channel = channelResponse.data.items?.[0];
    const providerUserId = channel?.id || null;
    const channelTitle = channel?.snippet?.title || 'YouTube Channel';

    // Get user ID from state (passed during OAuth initiation)
    const userId = state ? parseInt(state, 10) : null;
    if (!userId) {
      logger.error('YouTube OAuth callback missing user ID in state');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?youtube_error=invalid_state`);
    }

    // Save or update integration
    const [integration, created] = await Integration.findOrCreate({
      where: {
        userId,
        provider: 'youtube'
      },
      defaults: {
        userId,
        provider: 'youtube',
        providerUserId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope ? (Array.isArray(tokens.scope) ? tokens.scope : tokens.scope.split(' ')) : null,
        status: 'active',
        metadata: {
          channelId: providerUserId,
          channelTitle,
          connectedAt: new Date().toISOString()
        }
      }
    });

    if (!created) {
      // Update existing integration
      await integration.update({
        providerUserId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope ? (Array.isArray(tokens.scope) ? tokens.scope : tokens.scope.split(' ')) : null,
        status: 'active',
        metadata: {
          ...integration.metadata,
          channelId: providerUserId,
          channelTitle,
          connectedAt: new Date().toISOString()
        }
      });
    }

    logger.info('YouTube integration saved', {
      userId,
      providerUserId,
      channelTitle,
      created
    });

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?youtube_connected=true`);
  } catch (error) {
    logger.error('YouTube OAuth callback error', {
      error: error.message,
      stack: error.stack,
      query: req.query
    });
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?youtube_error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /api/youtube/disconnect
 * Disconnects YouTube integration
 */
router.post('/disconnect', requireAuth, async (req, res) => {
  try {
    const integration = await Integration.findOne({
      where: {
        userId: req.user.id,
        provider: 'youtube'
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'YouTube not connected' });
    }

    await integration.update({ status: 'revoked' });
    // Optionally delete instead of marking as revoked
    // await integration.destroy();

    logger.info('YouTube integration disconnected', { userId: req.user.id });
    res.json({ message: 'YouTube disconnected successfully' });
  } catch (error) {
    logger.error('Failed to disconnect YouTube', {
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to disconnect YouTube', details: error.message });
  }
});

/**
 * GET /api/youtube/status
 * Returns YouTube connection status
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const integration = await Integration.findOne({
      where: {
        userId: req.user.id,
        provider: 'youtube',
        status: 'active'
      },
      attributes: ['id', 'provider', 'providerUserId', 'status', 'metadata', 'expiresAt', 'createdAt']
    });

    if (!integration) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      channelId: integration.providerUserId,
      channelTitle: integration.metadata?.channelTitle,
      expiresAt: integration.expiresAt,
      connectedAt: integration.metadata?.connectedAt
    });
  } catch (error) {
    logger.error('Failed to get YouTube status', {
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to get YouTube status', details: error.message });
  }
});

export default router;
