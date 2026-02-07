/**
 * Discord API routes - backend only.
 * Bot token (DISCORD_BOT_TOKEN) is NEVER sent to frontend; all Discord API calls use it here.
 * User's Discord OAuth token is used only to list guilds (servers) the user is in; posting uses bot token.
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/index.js';
import logger from '../utils/logger.js';

const router = express.Router();
const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_OAUTH2 = 'https://discord.com/api/oauth2';

function getBotToken() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    logger.warn('DISCORD_BOT_TOKEN not set - Discord post/list will fail');
    return null;
  }
  return token;
}

/**
 * Refresh Discord OAuth2 access token so the user does not have to log in again.
 * Returns { accessToken, refreshToken } or null on failure.
 */
async function refreshDiscordToken(refreshToken) {
  const clientId = (process.env.DISCORD_CLIENT_ID || '').trim();
  const clientSecret = (process.env.DISCORD_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret || !refreshToken) return null;
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const res = await fetch(`${DISCORD_OAUTH2}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token || refreshToken };
  } catch (e) {
    logger.warn('Discord token refresh failed', { error: e.message });
    return null;
  }
}

/**
 * GET /discord/invite-url
 * Returns the Discord bot invite URL so the user can add the bot to their server.
 * Uses DISCORD_CLIENT_ID (same Application as the bot in Discord Developer Portal).
 */
router.get('/invite-url', requireAuth, (req, res) => {
  const clientId = (process.env.DISCORD_CLIENT_ID || '').trim();
  if (!clientId) {
    return res.status(503).json({ error: 'Discord not configured', inviteUrl: null });
  }
  // Permissions: View Channels, Send Messages, Embed Links, Attach Files, Read Message History (117760)
  const permissions = '117760';
  const scope = 'bot%20applications.commands';
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scope}`;
  res.json({ inviteUrl: url });
});

/**
 * GET /discord/guilds
 * Returns guilds where the authenticated user is a member AND the bot is also in.
 * Uses user's Discord OAuth token for user guilds, bot token for bot guilds; intersection returned.
 */
router.get('/guilds', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'discordId', 'discordAccessToken', 'discordRefreshToken', 'oauthProvider'] });
    
    // Discord is considered connected only if discordId exists AND has at least one token
    // This matches the logic in /connected-accounts endpoint
    const hasDiscord = user?.discordId && (user?.discordAccessToken || user?.discordRefreshToken);
    if (!hasDiscord) {
      logger.warn('Discord guilds: User does not have valid Discord connection', {
        userId: req.user.id,
        hasDiscordId: !!user?.discordId,
        hasAccessToken: !!user?.discordAccessToken,
        hasRefreshToken: !!user?.discordRefreshToken,
        oauthProvider: user?.oauthProvider
      });
      return res.status(400).json({
        code: 'discord_not_connected',
        error: 'Connect Discord first',
        details: 'Log in with Discord or link Discord in Settings to list your servers.',
      });
    }
    let accessToken = user?.discordAccessToken;
    if (!accessToken && user?.discordRefreshToken) {
      const refreshed = await refreshDiscordToken(user.discordRefreshToken);
      if (refreshed) {
        accessToken = refreshed.accessToken;
        user.discordAccessToken = refreshed.accessToken;
        user.discordRefreshToken = refreshed.refreshToken;
        await user.save();
      }
    }
    if (!accessToken) {
      return res.status(400).json({
        code: 'discord_reconnect_required',
        error: 'Discord session expired or invalid',
        details: 'Please reconnect Discord in Settings (link again) to list your servers.',
      });
    }

    const botToken = getBotToken();
    if (!botToken) {
      return res.status(503).json({ error: 'Discord bot not configured' });
    }

    let userGuildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (userGuildsRes.status === 401 && user?.discordRefreshToken) {
      const refreshed = await refreshDiscordToken(user.discordRefreshToken);
      if (refreshed) {
        user.discordAccessToken = refreshed.accessToken;
        user.discordRefreshToken = refreshed.refreshToken;
        await user.save();
        userGuildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
          headers: { Authorization: `Bearer ${refreshed.accessToken}` },
        });
      }
    }

    const botGuildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!userGuildsRes.ok) {
      const errText = await userGuildsRes.text();
      logger.warn('Discord user guilds failed', { status: userGuildsRes.status, body: errText });
      if (userGuildsRes.status === 401) {
        return res.status(400).json({
          code: 'discord_session_expired',
          error: 'Discord session expired',
          details: 'Please reconnect Discord in Settings to list your servers.',
        });
      }
      return res.status(502).json({ error: 'Failed to fetch your Discord servers' });
    }

    if (!botGuildsRes.ok) {
      logger.warn('Discord bot guilds failed', { status: botGuildsRes.status });
      return res.status(502).json({ error: 'Failed to fetch bot servers' });
    }

    const userGuilds = await userGuildsRes.json();
    const botGuilds = await botGuildsRes.json();
    const botGuildIds = new Set(botGuilds.map((g) => g.id));

    const guilds = userGuilds.filter((g) => botGuildIds.has(g.id)).map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
    }));

    res.json({ guilds });
  } catch (err) {
    logger.error('Discord guilds error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to list Discord servers' });
  }
});

/**
 * GET /discord/guilds/:guildId/channels
 * Returns text channels in the guild. Uses BOT token only.
 * Frontend should only show channels from guilds returned by GET /discord/guilds.
 */
router.get('/guilds/:guildId/channels', requireAuth, async (req, res) => {
  try {
    const botToken = getBotToken();
    if (!botToken) {
      return res.status(503).json({ error: 'Discord bot not configured' });
    }

    const { guildId } = req.params;
    const resDiscord = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (resDiscord.status === 403) {
      return res.status(403).json({
        error: 'Bot does not have access to this server',
        details: 'The bot needs to be invited to the server with permission to view channels.',
      });
    }
    if (resDiscord.status === 404) {
      return res.status(404).json({ error: 'Server not found' });
    }
    if (!resDiscord.ok) {
      const errText = await resDiscord.text();
      logger.warn('Discord guild channels failed', { guildId, status: resDiscord.status, body: errText });
      return res.status(502).json({ error: 'Failed to fetch channels' });
    }

    const channels = await resDiscord.json();
    const GUILD_TEXT = 0;
    const textChannels = channels
      .filter((c) => c.type === GUILD_TEXT)
      .map((c) => ({ id: c.id, name: c.name, type: c.type }));

    res.json({ channels: textChannels });
  } catch (err) {
    logger.error('Discord channels error', { error: err.message, guildId: req.params.guildId });
    res.status(500).json({ error: 'Failed to list channels' });
  }
});

/**
 * POST /discord/channels/:channelId/messages
 * Sends a message to a channel. Uses BOT token only. User never sees bot token.
 * If bot lacks SEND_MESSAGES or ATTACH_FILES, Discord returns 403; we return a clear error.
 */
router.post('/channels/:channelId/messages', requireAuth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, embeds } = req.body || {};
    const { postToDiscordChannel } = await import('../utils/discordPublish.js');
    const message = await postToDiscordChannel(channelId, content, embeds);
    res.json({ id: message.id, channel_id: channelId });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({
        error: 'Bot does not have permission in this channel',
        details: 'The bot needs SEND_MESSAGES (and ATTACH_FILES if you send attachments) in this channel.',
      });
    }
    if (err.status === 404) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    logger.error('Discord post message error', { error: err.message, channelId: req.params.channelId });
    res.status(err.status || 500).json({
      error: err.message || 'Failed to send message',
      details: err.details,
    });
  }
});

export default router;
