/**
 * Publish a tweet (X API v2) on behalf of the authenticated user.
 * Uses OAuth2 access token obtained at login/link.
 */

import logger from './logger.js';

const X_API_TWEETS = 'https://api.x.com/2/tweets';
const TWITTER_MAX_CHARS = 280;

/**
 * Post a tweet with the given text.
 * @param {string} accessToken - User's X OAuth2 access token
 * @param {string} text - Tweet text (max 280 chars)
 * @returns {Promise<{ id: string, text: string }>} Created tweet data
 * @throws {Error} On API error
 */
export async function postTweet(accessToken, text) {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  const payload = trimmed.length > TWITTER_MAX_CHARS
    ? { text: trimmed.slice(0, TWITTER_MAX_CHARS) }
    : { text: trimmed || ' ' };

  const res = await fetch(X_API_TWEETS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  if (!res.ok) {
    let errMsg = body;
    try {
      const errJson = JSON.parse(body);
      errMsg = errJson.detail || errJson.error?.message || errJson.error || body;
    } catch (_) {
      // use body as-is
    }
    logger.error('Twitter post tweet failed', { status: res.status, body: errMsg });
    throw new Error(errMsg || `Twitter API error ${res.status}`);
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch (_) {
    throw new Error('Invalid response from Twitter');
  }

  const tweetId = data?.data?.id;
  const tweetText = data?.data?.text;
  if (!tweetId) {
    throw new Error('Twitter did not return tweet id');
  }

  logger.info('Tweet posted', { tweetId, textLength: (tweetText || payload.text).length });
  return { id: tweetId, text: tweetText || payload.text };
}
