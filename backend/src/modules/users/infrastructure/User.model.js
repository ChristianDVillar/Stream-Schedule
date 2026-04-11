import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/database.js';
import { LICENSE_TYPES, LICENSE_TYPE_VALUES } from '../../../constants/licenseTypes.js';

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  oauthProvider: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['google', 'twitch', 'discord', 'twitter', null]],
    },
  },
  oauthId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Google OAuth user id (for account linking)',
  },
  twitchId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Twitch OAuth user id (for account linking)',
  },
  discordId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord OAuth user id (for account linking)',
  },
  twitterId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'X (Twitter) OAuth user id via Supabase (for account linking)',
  },
  twitterAccessToken: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'X (Twitter) OAuth2 access token for publishing tweets. Never expose to frontend.',
  },
  twitterRefreshToken: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'X (Twitter) OAuth2 refresh token. Never expose to frontend.',
  },
  discordAccessToken: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord OAuth access token (user token, for listing guilds). Never expose to frontend.',
  },
  discordRefreshToken: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord OAuth refresh token. Never expose to frontend.',
  },
  licenseKey: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  licenseType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: LICENSE_TYPES.NONE,
    validate: {
      isIn: [LICENSE_TYPE_VALUES],
    },
  },
  licenseExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isDisabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'If true, user is deactivated and cannot log in or use the app.',
  },
  merchandisingLink: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  merchandisingButtonPosition: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'bottom-right',
    comment: 'Position of floating merchandising button: bottom-right, bottom-left, top-right, top-left',
  },
  hasUsedTrial: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  trialExtensions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of times the trial has been extended (max 2)',
  },
  lastPasswordChange: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Customer ID for subscriptions',
  },
  stripeSubscriptionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Subscription ID for recurring payments',
  },
  subscriptionStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
    comment: 'Subscription status: active, canceled, past_due, etc.',
  },
  dashboardShowTwitchSubs: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Show Twitch subscriptions on dashboard',
  },
  dashboardShowTwitchBits: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Show Twitch bits on dashboard',
  },
  dashboardShowTwitchDonations: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Show Twitch donations on dashboard',
  },
  profileImageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL of user profile/avatar image (e.g. from uploads)',
  },
  discordClipsGuildId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord server (guild) ID where Twitch clips are published automatically',
  },
  discordClipsChannelId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord channel ID where Twitch clips are published automatically',
  },
  nightbotApiKey: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'API key for Nightbot custom commands (e.g. !todo) to create todos in this account',
  },
  discordAnnounceWebhookUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Discord webhook URL to post "Stream started!" when POST /webhooks/stream/start is called',
  },
  akoenetWebhookUrl: {
    type: DataTypes.STRING(2000),
    allowNull: true,
    comment: 'AkoeNet POST URL for /integrations/scheduler/webhooks/stream-scheduled (local or public)',
  },
  akoenetWebhookSecret: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Shared secret for AkoeNet webhook header; never returned to API clients',
  },
  akoenetAnnounceChannelId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Optional channel id sent as channel_id in AkoeNet payload',
  },
  akoenetServerId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'AkoeNet server id selected in Settings (loads channel list)',
  },
  akoenetSendClips: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'POST twitch_clip webhook to same AkoeNet URL when clips are published to Discord',
  },
  streamGoalType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'followers or subs — for !goal command',
  },
  streamGoalTarget: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Target number for stream goal (e.g. 500 followers)',
  },
  publicPageBannerUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Banner/image URL for the public shared calendar page',
  },
  publicPageBannerPosition: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'top',
    comment: 'Position of banner: top, above-avatar, above-schedule, center, bottom, background',
  },
});

export default User;

