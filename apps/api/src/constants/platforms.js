/**
 * Platform Constants
 * Centralized constants for supported platforms
 */

export const PLATFORMS = {
  TWITCH: 'twitch',
  TWITTER: 'twitter',
  INSTAGRAM: 'instagram',
  DISCORD: 'discord',
  YOUTUBE: 'youtube'
};

export const PLATFORM_VALUES = Object.values(PLATFORMS);

export const PLATFORM_LABELS = {
  [PLATFORMS.TWITCH]: 'Twitch',
  [PLATFORMS.TWITTER]: 'Twitter',
  [PLATFORMS.INSTAGRAM]: 'Instagram',
  [PLATFORMS.DISCORD]: 'Discord',
  [PLATFORMS.YOUTUBE]: 'YouTube'
};

/** Max characters for a single tweet (X/Twitter). */
export const TWITTER_MAX_CHARS = 280;
