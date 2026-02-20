/**
 * Twitch API Service
 * Integrates with Twitch Helix API for subscriptions, bits, schedule, and channel
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import axios from 'axios';
import logger from '../utils/logger.js';

const TWITCH_API_BASE = 'https://api.twitch.tv/helix';
const TWITCH_OAUTH_BASE = 'https://id.twitch.tv/oauth2';

// Log "credentials not configured" only once per process to avoid log spam
let twitchCredentialsWarnLogged = false;

export class TwitchService {
  constructor() {
    this.clientId = process.env.TWITCH_CLIENT_ID;
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET;
    this.appAccessToken = null;
    this.appAccessTokenExpires = null;
  }

  /**
   * Get app access token (for public endpoints)
   */
  async getAppAccessToken() {
    if (this.appAccessToken && this.appAccessTokenExpires > Date.now()) {
      return this.appAccessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      if (!twitchCredentialsWarnLogged) {
        twitchCredentialsWarnLogged = true;
        logger.warn('Twitch credentials not configured - set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in production for Twitch features');
      }
      return null;
    }

    try {
      const response = await axios.post(`${TWITCH_OAUTH_BASE}/token`, null, {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        },
      });

      this.appAccessToken = response.data.access_token;
      this.appAccessTokenExpires = Date.now() + (59 * 24 * 60 * 60 * 1000);
      return this.appAccessToken;
    } catch (error) {
      logger.error('Failed to get Twitch app access token', { error: error.message });
      return null;
    }
  }

  /**
   * Refresh user access token using refresh_token
   * @returns {{ accessToken, refreshToken, expiresAt }}
   */
  async refreshUserAccessToken(refreshToken) {
    if (!this.clientId || !this.clientSecret || !refreshToken) {
      throw new Error('Twitch credentials or refresh token not available');
    }
    const response = await axios.post(`${TWITCH_OAUTH_BASE}/token`, null, {
      params: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
    });
    const data = response.data;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + (data.expires_in || 0) * 1000),
    };
  }

  /**
   * Make authenticated request to Twitch Helix API (GET by default)
   */
  async makeRequest(endpoint, userAccessToken = null, options = {}) {
    const token = userAccessToken || await this.getAppAccessToken();
    if (!token) {
      throw new Error('Twitch access token not available');
    }

    const method = (options.method || 'GET').toUpperCase();
    const config = {
      method,
      url: `${TWITCH_API_BASE}${endpoint}`,
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${token}`,
      },
    };
    if (options.body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      config.headers['Content-Type'] = 'application/json';
      config.data = options.body;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      logger.error('Twitch API request failed', {
        endpoint,
        method,
        error: error.message,
        status: error.response?.status,
      });
      throw error;
    }
  }

  /**
   * Get broadcaster (current user) ID from Helix /users using user access token
   */
  async getBroadcasterId(userAccessToken) {
    const data = await this.makeRequest('/users', userAccessToken);
    const user = data.data?.[0];
    if (!user?.id) {
      throw new Error('Could not get Twitch user id');
    }
    return user.id;
  }

  /**
   * Get broadcaster subscriptions
   * Requires user access token with channel:read:subscriptions scope
   */
  async getSubscriptions(broadcasterId, userAccessToken) {
    try {
      const data = await this.makeRequest(
        `/subscriptions?broadcaster_id=${broadcasterId}`,
        userAccessToken
      );
      
      return {
        total: data.total || 0,
        subscriptions: data.data || [],
      };
    } catch (error) {
      // If scope not available, return placeholder
      if (error.response?.status === 403) {
        logger.warn('Twitch subscriptions scope not available', {
          broadcasterId,
        });
        return { total: 0, subscriptions: [] };
      }
      throw error;
    }
  }

  /**
   * Get bits leaderboard
   * Requires user access token with bits:read scope
   * Returns total = sum of all scores (total bits), leaderboard = array from Helix
   */
  async getBitsLeaderboard(broadcasterId, userAccessToken, period = 'all') {
    try {
      const data = await this.makeRequest(
        `/bits/leaderboard?broadcaster_id=${broadcasterId}&period=${period}`,
        userAccessToken
      );
      const leaderboard = data.data || [];
      const totalBits = leaderboard.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
      return {
        total: totalBits,
        leaderboard,
      };
    } catch (error) {
      if (error.response?.status === 403) {
        logger.warn('Twitch bits scope not available', { broadcasterId });
        return { total: 0, leaderboard: [] };
      }
      throw error;
    }
  }

  /**
   * Get game/category ID by name (for schedule segment or channel category)
   */
  async getGameId(userAccessToken, gameName) {
    if (!gameName || !String(gameName).trim()) return null;
    try {
      const data = await this.makeRequest(
        `/games?name=${encodeURIComponent(String(gameName).trim())}`,
        userAccessToken
      );
      return data.data?.[0]?.id || null;
    } catch (error) {
      logger.warn('Twitch getGameId failed', { gameName, error: error.message });
      return null;
    }
  }

  /**
   * Create a schedule segment (stream event) on Twitch
   * Requires user access token with channel:manage:schedule
   * @param {{ userAccessToken, broadcasterId, startTime, timezone, duration, title, categoryId? }}
   */
  async createScheduleSegment({ userAccessToken, broadcasterId, startTime, timezone, duration, title, categoryId }) {
    const body = {
      start_time: typeof startTime === 'string' ? startTime : new Date(startTime).toISOString(),
      timezone: timezone || 'UTC',
      duration: Number(duration) || 120,
      title: String(title || 'Scheduled Stream').slice(0, 140),
    };
    if (categoryId) body.category_id = categoryId;

    const data = await this.makeRequest(
      `/schedule/segment?broadcaster_id=${broadcasterId}`,
      userAccessToken,
      { method: 'POST', body }
    );
    const segment = data.data?.segments?.[0];
    return { segmentId: segment?.id, data };
  }

  /**
   * Update an existing schedule segment
   */
  async updateScheduleSegment({ userAccessToken, broadcasterId, segmentId, startTime, duration, title, categoryId }) {
    const body = {};
    if (startTime != null) body.start_time = typeof startTime === 'string' ? startTime : new Date(startTime).toISOString();
    if (duration != null) body.duration = Number(duration);
    if (title != null) body.title = String(title).slice(0, 140);
    if (categoryId != null) body.category_id = categoryId;

    const data = await this.makeRequest(
      `/schedule/segment?broadcaster_id=${broadcasterId}&id=${segmentId}`,
      userAccessToken,
      { method: 'PATCH', body }
    );
    return data;
  }

  /**
   * Delete a schedule segment
   */
  async deleteScheduleSegment(userAccessToken, broadcasterId, segmentId) {
    await this.makeRequest(
      `/schedule/segment?broadcaster_id=${broadcasterId}&id=${segmentId}`,
      userAccessToken,
      { method: 'DELETE' }
    );
    return true;
  }

  /**
   * Update channel info (title and/or game)
   * Requires channel:manage:broadcast or channel:manage:channel
   */
  async updateChannelInfo({ userAccessToken, broadcasterId, title, gameId }) {
    const body = {};
    if (title != null) body.title = String(title).slice(0, 140);
    if (gameId != null) body.game_id = gameId;
    if (Object.keys(body).length === 0) return;

    await this.makeRequest(
      `/channels?broadcaster_id=${broadcasterId}`,
      userAccessToken,
      { method: 'PATCH', body }
    );
  }

  /**
   * Get user info by ID (uses app or user token).
   * Helix users include view_count (channel total views).
   */
  async getUserInfo(userId, userAccessToken = null) {
    try {
      const data = await this.makeRequest(`/users?id=${userId}`, userAccessToken);
      return data.data?.[0] || null;
    } catch (error) {
      logger.error('Failed to get Twitch user info', { userId, error: error.message });
      return null;
    }
  }

  /**
   * Get channel followers count (broadcaster).
   * Requires moderator:read:followers or no scope with user token for own channel.
   * Helix: GET /channels/followers
   */
  async getChannelFollowers(broadcasterId, userAccessToken) {
    try {
      const data = await this.makeRequest(
        `/channels/followers?broadcaster_id=${broadcasterId}&first=1`,
        userAccessToken
      );
      return { total: data.total ?? 0 };
    } catch (error) {
      if (error.response?.status === 403) {
        logger.warn('Twitch channel followers not available', { broadcasterId });
        return { total: 0 };
      }
      throw error;
    }
  }
}

export const twitchService = new TwitchService();
