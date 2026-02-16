/**
 * Publish a tweet (X API v2) on behalf of the authenticated user.
 * Uses OAuth2 access token obtained at login/link.
 */

import logger from './logger.js';
import { TWITTER_MAX_CHARS } from '../constants/platforms.js';

const X_API_TWEETS = 'https://api.x.com/2/tweets';

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

  logger.info('Twitter API request', {
    url: X_API_TWEETS,
    method: 'POST',
    payloadLength: payload.text.length,
    hasAccessToken: !!accessToken,
    accessTokenLength: accessToken?.length || 0,
    accessTokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : null
  });

  const res = await fetch(X_API_TWEETS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  logger.info('Twitter API response', {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    bodyLength: body.length,
    bodyPreview: body.slice(0, 200)
  });

  if (!res.ok) {
    let errMsg = body;
    let isPermissionError = false;
    let errorDetails = null;
    try {
      const errJson = JSON.parse(body);
      errMsg = errJson.detail || errJson.error?.message || errJson.error || body;
      errorDetails = errJson;
      // 402 Payment Required / Credits depleted (X API paid tiers)
      if (res.status === 402 || errJson.title === 'CreditsDepleted' || (errJson.type && String(errJson.type).includes('credits'))) {
        errMsg = 'X (Twitter) API: No credits left. Your Developer account has no posting credits. Check the Twitter Developer Portal (Billing / Usage) and upgrade your plan if needed.';
      }
      // Check for common permission errors
      const errorStr = String(errMsg).toLowerCase();
      if (errorStr.includes('forbidden') || 
          errorStr.includes('insufficient') || 
          errorStr.includes('permission') ||
          errorStr.includes('unauthorized') ||
          res.status === 403 ||
          res.status === 401) {
        isPermissionError = true;
        errMsg = 'Twitter API: Insufficient permissions. Please ensure your Twitter app has "Read and write" permissions in Twitter Dev Tools, and reconnect your Twitter account in Settings.';
      }
    } catch (_) {
      // use body as-is
      if (res.status === 402) {
        errMsg = 'X (Twitter) API: No credits left. Your Developer account has no posting credits. Check the Twitter Developer Portal (Billing / Usage) and upgrade your plan if needed.';
      } else if (res.status === 403 || res.status === 401) {
        isPermissionError = true;
        errMsg = 'Twitter API: Insufficient permissions. Please ensure your Twitter app has "Read and write" permissions in Twitter Dev Tools, and reconnect your Twitter account in Settings.';
      }
    }
    logger.error('Twitter post tweet failed', { 
      status: res.status,
      statusText: res.statusText,
      body: errMsg,
      errorDetails,
      isPermissionError,
      hint: isPermissionError ? 'Check Twitter Dev Tools App permissions (must be "Read and write")' : undefined
    });
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
