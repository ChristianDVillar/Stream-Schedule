import { apiClient } from '../../shared/api/client';
import { loginWithGoogle, loginWithTwitch } from '../auth/api';

const OAUTH_LINK_MODE_KEY = 'oauthLinkMode';

export async function getConnectedAccounts() {
  const res = await apiClient.get('/user/connected-accounts');
  return res.data;
}

export async function getOnboardingStatus() {
  const res = await apiClient.get('/user/onboarding-status');
  return res.data;
}

export async function autoCreateFirstStream() {
  const res = await apiClient.post('/user/auto-create-first-stream');
  return res.data;
}

export function startDiscordLink(token) {
  const base = apiClient.defaults.baseURL;
  window.location.href = `${base}/user/auth/discord/link?token=${encodeURIComponent(token)}`;
}

export function startGoogleLink() {
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(OAUTH_LINK_MODE_KEY, 'google');
  loginWithGoogle();
}

export function startTwitchLink() {
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(OAUTH_LINK_MODE_KEY, 'twitch');
  loginWithTwitch();
}

export function startTwitchPublishConnect(token) {
  if (!token) return;
  let backend = (
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_TWITCH_OAUTH_BASE_URL ||
    process.env.REACT_APP_API_URL ||
    'http://localhost:5000'
  ).replace(/\/$/, '');
  if (
    typeof window !== 'undefined' &&
    window.location?.hostname &&
    !window.location.hostname.includes('localhost') &&
    backend.includes('localhost')
  ) {
    const host = window.location.hostname;
    backend = host.startsWith('api.') ? `https://${host}` : `https://api.${host}`;
  }
  const base = backend.endsWith('/api') ? backend : `${backend}/api`;
  window.location.href = `${base}/user/twitch/connect?token=${encodeURIComponent(token)}`;
}

export function startTwitterLink(token) {
  if (!token) return;
  const base = apiClient.defaults.baseURL;
  window.location.href = `${base}/user/auth/twitter/link?token=${encodeURIComponent(token)}`;
}

export function startYoutubeConnect(token) {
  if (!token) return;
  const base = apiClient.defaults.baseURL;
  window.location.href = `${base}/youtube/connect?token=${encodeURIComponent(token)}`;
}

export function startSlackLink(token) {
  if (!token) return;
  const base = apiClient.defaults.baseURL;
  window.location.href = `${base}/user/auth/slack/link?token=${encodeURIComponent(token)}`;
}

export async function disconnectGoogle() { return (await apiClient.post('/user/disconnect-google')).data; }
export async function disconnectTwitch() { return (await apiClient.post('/user/disconnect-twitch')).data; }
export async function disconnectTwitter() { return (await apiClient.post('/user/disconnect-twitter')).data; }
export async function disconnectDiscord() { return (await apiClient.post('/user/disconnect-discord')).data; }
export async function disconnectYoutube() { return (await apiClient.post('/youtube/disconnect')).data; }
export async function disconnectSlack() { return (await apiClient.post('/user/disconnect-slack')).data; }

