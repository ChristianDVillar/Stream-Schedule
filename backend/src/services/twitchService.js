/**
 * Twitch API Service
 * Integrates with Twitch Helix API for subscriptions, bits, and donations
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import axios from 'axios';
import logger from '../utils/logger.js';

const TWITCH_API_BASE = 'https://api.twitch.tv/helix';

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
    // Return cached token if still valid
    if (this.appAccessToken && this.appAccessTokenExpires > Date.now()) {
      return this.appAccessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      logger.warn('Twitch credentials not configured');
      return null;
    }

    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        },
      });

      this.appAccessToken = response.data.access_token;
      // Expires in 60 days, refresh 1 day early
      this.appAccessTokenExpires = Date.now() + (59 * 24 * 60 * 60 * 1000);

      return this.appAccessToken;
    } catch (error) {
      logger.error('Failed to get Twitch app access token', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Make authenticated request to Twitch API
   */
  async makeRequest(endpoint, userAccessToken = null) {
    const token = userAccessToken || await this.getAppAccessToken();
    
    if (!token) {
      throw new Error('Twitch access token not available');
    }

    try {
      const response = await axios.get(`${TWITCH_API_BASE}${endpoint}`, {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Twitch API request failed', {
        endpoint,
        error: error.message,
        status: error.response?.status,
      });
      throw error;
    }
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
   */
  async getBitsLeaderboard(broadcasterId, userAccessToken, period = 'all') {
    try {
      const data = await this.makeRequest(
        `/bits/leaderboard?broadcaster_id=${broadcasterId}&period=${period}`,
        userAccessToken
      );
      
      return {
        total: data.total || 0,
        leaderboard: data.data || [],
      };
    } catch (error) {
      // If scope not available, return placeholder
      if (error.response?.status === 403) {
        logger.warn('Twitch bits scope not available', {
          broadcasterId,
        });
        return { total: 0, leaderboard: [] };
      }
      throw error;
    }
  }

  /**
   * Get user info by ID
   */
  async getUserInfo(userId) {
    try {
      const data = await this.makeRequest(`/users?id=${userId}`);
      return data.data?.[0] || null;
    } catch (error) {
      logger.error('Failed to get Twitch user info', {
        userId,
        error: error.message,
      });
      return null;
    }
  }
}

export const twitchService = new TwitchService();
