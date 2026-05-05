/**
 * Integration Token Service
 * Handles proactive token refresh for OAuth integrations.
 */

import logger from '../../../utils/logger.js';
import { Integration } from '../infrastructure/models.js';
import { Op } from 'sequelize';
import { TwitchService } from './twitchService.js';
import axios from 'axios';

const REFRESH_THRESHOLD_MS = 10 * 60 * 1000;

async function refreshTwitchToken(integration) {
  if (!integration.refreshToken) {
    throw new Error('No refresh token available for Twitch');
  }

  const twitchService = new TwitchService();
  const refreshed = await twitchService.refreshUserAccessToken(integration.refreshToken);

  if (!refreshed || !refreshed.accessToken) {
    throw new Error('Failed to refresh Twitch token');
  }

  integration.accessToken = refreshed.accessToken;
  integration.refreshToken = refreshed.refreshToken || integration.refreshToken;
  integration.expiresAt = refreshed.expiresAt || null;
  integration.status = 'active';
  await integration.save();

  logger.info('Twitch token refreshed', {
    userId: integration.userId,
    provider: integration.provider,
  });

  return integration;
}

async function refreshTwitterToken(integration) {
  if (!integration.refreshToken) {
    throw new Error('No refresh token available for Twitter');
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Twitter OAuth not configured');
  }

  const response = await axios.post(
    'https://api.x.com/2/oauth2/token',
    new URLSearchParams({
      refresh_token: integration.refreshToken,
      grant_type: 'refresh_token',
      client_id: clientId,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
    }
  );

  if (!response.data || !response.data.access_token) {
    throw new Error('Failed to refresh Twitter token');
  }

  integration.accessToken = response.data.access_token;
  integration.refreshToken = response.data.refresh_token || integration.refreshToken;
  integration.expiresAt = response.data.expires_in ? new Date(Date.now() + response.data.expires_in * 1000) : null;
  integration.status = 'active';
  await integration.save();

  logger.info('Twitter token refreshed', {
    userId: integration.userId,
    provider: integration.provider,
  });

  return integration;
}

async function refreshDiscordToken(integration) {
  if (!integration.refreshToken) {
    throw new Error('No refresh token available for Discord');
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Discord OAuth not configured');
  }

  const response = await axios.post(
    'https://discord.com/api/oauth2/token',
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: integration.refreshToken,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!response.data || !response.data.access_token) {
    throw new Error('Failed to refresh Discord token');
  }

  integration.accessToken = response.data.access_token;
  integration.refreshToken = response.data.refresh_token || integration.refreshToken;
  integration.expiresAt = response.data.expires_in ? new Date(Date.now() + response.data.expires_in * 1000) : null;
  integration.status = 'active';
  await integration.save();

  logger.info('Discord token refreshed', {
    userId: integration.userId,
    provider: integration.provider,
  });

  return integration;
}

export async function refreshIntegrationToken(userId, platform) {
  const integration = await Integration.findOne({
    where: {
      userId,
      provider: platform,
      status: 'active',
    },
  });

  if (!integration) {
    return null;
  }

  if (!integration.expiresAt) {
    return integration;
  }

  const timeUntilExpiry = integration.expiresAt.getTime() - Date.now();
  if (timeUntilExpiry > REFRESH_THRESHOLD_MS) {
    return integration;
  }

  logger.info('Refreshing integration token proactively', {
    userId,
    platform,
    expiresAt: integration.expiresAt,
    timeUntilExpiry_ms: timeUntilExpiry,
  });

  try {
    switch (platform) {
      case 'twitch':
        return await refreshTwitchToken(integration);
      case 'twitter':
        return await refreshTwitterToken(integration);
      case 'discord':
        return await refreshDiscordToken(integration);
      default:
        logger.warn('Token refresh not implemented for platform', { platform });
        return integration;
    }
  } catch (error) {
    logger.error('Token refresh failed', {
      userId,
      platform,
      error: error.message,
    });

    integration.status = 'expired';
    await integration.save();
    throw error;
  }
}

export async function refreshExpiringTokens() {
  const threshold = new Date(Date.now() + REFRESH_THRESHOLD_MS);

  const integrations = await Integration.findAll({
    where: {
      status: 'active',
      expiresAt: {
        [Op.lte]: threshold,
      },
    },
  });

  logger.info('Batch refreshing expiring tokens', {
    count: integrations.length,
  });

  const results = {
    refreshed: 0,
    failed: 0,
    errors: [],
  };

  for (const integration of integrations) {
    try {
      await refreshIntegrationToken(integration.userId, integration.provider);
      results.refreshed++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        userId: integration.userId,
        provider: integration.provider,
        error: error.message,
      });
    }
  }

  logger.info('Batch token refresh complete', results);
  return results;
}

export default {
  refreshIntegrationToken,
  refreshExpiringTokens,
};

