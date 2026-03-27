import { apiClient, API_BASE_URL } from '../../shared/api/client';
import { supabase } from '../../utils/supabaseClient';

const OAUTH_LINK_MODE_KEY = 'oauthLinkMode';

function getOAuthRedirectUrl() {
  const envFrontend = (process.env.REACT_APP_FRONTEND_URL || '').replace(/\/$/, '');
  if (envFrontend && !envFrontend.includes('localhost')) {
    return `${envFrontend}/auth/callback`;
  }
  if (typeof window === 'undefined' || !window.location.origin) {
    throw new Error('OAuth redirect requires browser origin');
  }
  return `${window.location.origin.replace(/\/$/, '')}/auth/callback`;
}

export async function register({ username, email, password, startWithTrial, licenseOption }) {
  return apiClient.post('/user/register', { username, email, password, startWithTrial, licenseOption });
}

export async function login({ email, password }) {
  return apiClient.post('/user/login', { email, password });
}

export async function forgotPassword({ email }) {
  return apiClient.post('/user/forgot-password', { email });
}

export async function loginWithGoogle() {
  if (supabase) {
    const redirectTo = getOAuthRedirectUrl();
    const options = { redirectTo, queryParams: { prompt: 'select_account' } };
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options });
    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
      return;
    }
    throw new Error('Could not start Google sign in');
  }
  window.location.href = `${apiClient.defaults.baseURL}/user/auth/google`;
}

export function loginWithTwitch() {
  let backend = (process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
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
  window.location.replace(`${base}/user/auth/twitch`);
}

export async function loginWithTwitter() {
  if (!supabase) throw new Error('Supabase not configured');
  const redirectTo = getOAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'twitter',
    options: { redirectTo },
  });
  if (error) throw error;
  if (data?.url) {
    window.location.replace(data.url);
    return;
  }
  throw new Error('Could not start X (Twitter) sign in');
}

export function loginWithDiscord() {
  window.location.href = `${apiClient.defaults.baseURL}/user/auth/discord`;
}

export async function loginBackendWithSupabaseToken(accessToken) {
  const res = await fetch(`${API_BASE_URL}/user/google-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const message = [data.error, data.details].filter(Boolean).join(' - ') || 'OAuth login failed';
    const err = new Error(message);
    err.response = { data, status: res.status };
    throw err;
  }
  return { data: { token: data.token, user: data.user } };
}

export async function linkGoogleWithSupabaseToken(accessToken) {
  const res = await apiClient.post('/user/link-google', { supabaseAccessToken: accessToken });
  return res.data;
}

export async function linkTwitchWithSupabaseToken(accessToken) {
  const res = await apiClient.post('/user/link-twitch', { supabaseAccessToken: accessToken });
  return res.data;
}

export async function linkTwitterWithSupabaseToken(accessToken) {
  const res = await apiClient.post('/user/link-twitter', { supabaseAccessToken: accessToken });
  return res.data;
}

export function clearOAuthLinkMode() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(OAUTH_LINK_MODE_KEY);
  }
}

export function getOAuthLinkMode() {
  if (typeof sessionStorage === 'undefined') return null;
  const mode = sessionStorage.getItem(OAUTH_LINK_MODE_KEY);
  return mode === 'google' || mode === 'twitch' || mode === 'twitter' ? mode : null;
}

