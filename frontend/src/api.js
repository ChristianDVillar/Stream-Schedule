import axios from 'axios';
import { isTokenExpired, clearAuth } from './utils/auth';
import { supabase } from './utils/supabaseClient';

// Get API URL from environment variable, fallback to localhost for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_BASE_URL = `${API_URL}/api`;

/** Full URL where Supabase redirects after OAuth. Add this to Supabase Dashboard > URL Configuration > Redirect URLs. */
function getOAuthRedirectUrl() {
  if (typeof window === 'undefined' || !window.location.origin) {
    throw new Error('OAuth redirect requires browser origin');
  }
  return `${window.location.origin.replace(/\/$/, '')}/auth/callback`;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
});

// Requests where we should NOT clear session or redirect on 401 (let the caller show error and user stay on page)
function shouldSkipLogoutOn401(config) {
  const url = config?.url || '';
  const method = (config?.method || '').toUpperCase();
  if (url.includes('/user/login') || url.includes('/user/register') || url.includes('/user/google-login')) return true;
  if (method === 'POST' && url.includes('/upload/file')) return true;
  if (method === 'POST' && url.includes('/content') && !url.match(/\/content\/\d+/)) return true; // POST /content (create), not PUT /content/:id
  if (method === 'GET' && url.includes('/upload/stats')) return true;
  if (method === 'GET' && (url.includes('/discord/guilds') || url.includes('/discord/invite-url'))) return true; // list guilds, channels, invite URL
  if (method === 'GET' && url.includes('/user/connected-accounts')) return true; // let Settings show defaults on 401
  return false;
}

// Request interceptor: Add token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    
    // If token is expired: for "protected" URLs (upload, schedule, discord guilds, stats) still send the request
    // so the caller can show an error without being logged out. For other URLs, clear and reject so we redirect on next 401 or via response.
    if (token && isTokenExpired(token) && !shouldSkipLogoutOn401(config)) {
      clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(new Error('Token expired'));
    }
    
    // Add token to request headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors (unauthorized)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized (token expired or invalid)
    // Do NOT clear auth or redirect when the failed request was login/register – let the form show the error
    const isLoginOrRegister = error.config?.url?.includes('/user/login') || error.config?.url?.includes('/user/register') || error.config?.url?.includes('/user/google-login');
    const skipLogout = isLoginOrRegister || shouldSkipLogoutOn401(error.config);
    if (error.response?.status === 401 && !skipLogout) {
      clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export async function register({ username, email, password, startWithTrial, licenseOption }) {
  return apiClient.post('/user/register', { username, email, password, startWithTrial, licenseOption });
}

export async function login({ email, password }) {
  return apiClient.post('/user/login', { email, password });
}

export async function forgotPassword({ email }) {
  return apiClient.post('/user/forgot-password', { email });
}

/**
 * URL to which Supabase should redirect after "reset password" email link click.
 * Uses current origin so it works in dev (localhost) and production (Render/domain).
 * Use with: supabase.auth.resetPasswordForEmail(email, { redirectTo: getPasswordResetRedirectUrl() })
 * See SUPABASE_PRODUCTION.md for full Supabase + Resend setup.
 */
export function getPasswordResetRedirectUrl() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin ? `${origin.replace(/\/$/, '')}/reset-password` : '/reset-password';
}

/**
 * Login or register with Google via Supabase OAuth.
 * Works from both "Iniciar sesion" and "Crear usuario"; new users are created with trial in backend.
 * Redirect URL is always the current origin so production (e.g. Render) redirects back correctly.
 * In Supabase Dashboard: Authentication > URL Configuration, add your app origin to "Redirect URLs"
 * (e.g. http://localhost:3000, https://your-app.onrender.com) and set "Site URL" to your app origin.
 * @param {boolean} [isSignUp] - true when user clicked from "Crear usuario" (same flow, backend creates account if new)
 */
export async function loginWithGoogle(isSignUp = false) {
  if (supabase) {
    const redirectTo = getOAuthRedirectUrl();
    const options = {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    };
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options,
    });
    if (error) {
      throw error;
    }
    if (data?.url) {
      window.location.href = data.url;
      return;
    }
    throw new Error('Could not start Google sign in');
  }
  window.location.href = `${apiClient.defaults.baseURL}/user/auth/google`;
}

/**
 * Send Supabase session to backend to get JWT and user. Call this from /auth/callback after Supabase OAuth.
 * @param {string} accessToken - session.access_token from Supabase
 * @returns {Promise<{ data: { token, user } }>}
 */
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

/**
 * Login or register with Twitch via Supabase OAuth.
 * Same flow as Google: Supabase redirects to /auth/callback, then backend creates/links user.
 * Requires Twitch app redirect URL: https://<project-ref>.supabase.co/auth/v1/callback
 * and Twitch provider configured in Supabase Dashboard (Authentication > Providers).
 */
export async function loginWithTwitch() {
  try {
    if (supabase) {
      const redirectTo = getOAuthRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitch',
        options: { 
          redirectTo,
          skipBrowserRedirect: false
        },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.replace(data.url);
        return;
      }
      throw new Error('Could not start Twitch sign in');
    }
    
    const backendUrl = `${apiClient.defaults.baseURL}/user/auth/twitch`;
    window.location.replace(backendUrl);
  } catch (error) {
    throw error;
  }
}

/**
 * Login or register with X (Twitter) via Supabase OAuth.
 * Same flow as Google/Twitch: Supabase redirects to /auth/callback, then backend creates/links user.
 * Twitter often does not provide email; backend handles that.
 * Configure Twitter provider in Supabase Dashboard (Authentication > Providers > Twitter).
 */
export async function loginWithTwitter() {
  if (supabase) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectTo = origin ? `${origin.replace(/\/$/, '')}/auth/callback` : '/auth/callback';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: { redirectTo },
    });
    if (error) {
      console.error('Twitter OAuth error:', error);
      throw error;
    }
    if (data?.url) {
      window.location.replace(data.url);
      return;
    }
    throw new Error('Could not start X (Twitter) sign in');
  }
  throw new Error('Supabase not configured');
}

/**
 * Login with Discord via backend OAuth (Passport). Redirects to backend; callback returns to /auth/callback with token.
 * Bot token is never sent to frontend; backend uses it only for listing channels and posting.
 */
export function loginWithDiscord() {
  window.location.href = `${apiClient.defaults.baseURL}/user/auth/discord`;
}

/** GET /discord/invite-url - URL to invite the bot to a Discord server (add bot to server). */
export async function getDiscordInviteUrl() {
  const res = await apiClient.get('/discord/invite-url');
  return res.data;
}

/** GET /discord/guilds - guilds where user is member and bot is in. Requires Discord OAuth login first. */
export async function getDiscordGuilds() {
  const res = await apiClient.get('/discord/guilds');
  return res.data;
}

/** GET /discord/guilds/:guildId/channels - text channels in guild. Uses bot token in backend. */
export async function getDiscordChannels(guildId) {
  const res = await apiClient.get(`/discord/guilds/${guildId}/channels`);
  return res.data;
}

/** POST /discord/channels/:channelId/messages - send message. Uses bot token in backend only. */
export async function postDiscordMessage(channelId, { content, embeds } = {}) {
  const res = await apiClient.post(`/discord/channels/${channelId}/messages`, { content, embeds });
  return res.data;
}

/** GET /user/connected-accounts - which providers are linked (google, twitch, discord, email). */
export async function getConnectedAccounts() {
  const res = await apiClient.get('/user/connected-accounts');
  return res.data;
}

/** GET /user/twitch-dashboard-stats - Twitch subs/bits/donations for dashboard (requires Twitch connected). */
export async function getTwitchDashboardStats() {
  const res = await apiClient.get('/user/twitch-dashboard-stats');
  return res.data;
}

/** GET /user/twitch-subs - Lista detallada de suscriptores */
export async function getTwitchSubs() {
  const res = await apiClient.get('/user/twitch-subs');
  return res.data;
}

/** GET /user/twitch-bits - Lista de bits (?format=chronological|total) */
export async function getTwitchBits(format = 'chronological') {
  const res = await apiClient.get(`/user/twitch-bits?format=${format}`);
  return res.data;
}

/** GET /user/twitch-donations - Lista de donaciones */
export async function getTwitchDonations() {
  const res = await apiClient.get('/user/twitch-donations');
  return res.data;
}

/** GET /discord/dashboard-stats - Discord connection and guild count for dashboard */
export async function getDiscordDashboardStats() {
  const res = await apiClient.get('/discord/dashboard-stats');
  return res.data;
}

/** GET /content - Get paginated content with filters */
export async function getContent(options = {}) {
  const params = new URLSearchParams();
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);
  if (options.status) params.append('status', options.status);
  if (options.platform) params.append('platform', options.platform);
  if (options.dateFrom) params.append('dateFrom', options.dateFrom);
  if (options.dateTo) params.append('dateTo', options.dateTo);
  if (options.search) params.append('search', options.search);
  if (options.orderBy) params.append('orderBy', options.orderBy);
  if (options.order) params.append('order', options.order);
  
  const res = await apiClient.get(`/content?${params.toString()}`);
  return res.data;
}

/** Cancel scheduled content (sets status to canceled). Requires auth token. */
export async function cancelContent(contentId, token) {
  const res = await apiClient.put(`/content/${contentId}`, { status: 'canceled' }, {
    headers: { Authorization: `Bearer ${token}` },
    withCredentials: true,
  });
  return res.data;
}

/** Start Discord link flow (add Discord to current account). Pass token; redirects to backend. */
export function startDiscordLink(token) {
  const base = apiClient.defaults.baseURL;
  window.location.href = `${base}/user/auth/discord/link?token=${encodeURIComponent(token)}`;
}

/** Link Google to current account: send Supabase access token to backend. Used from AuthCallback when oauthLinkMode=google. */
export async function linkGoogleWithSupabaseToken(accessToken) {
  const res = await apiClient.post('/user/link-google', { supabaseAccessToken: accessToken });
  return res.data;
}

/** Link Twitch to current account: send Supabase access token to backend. Used from AuthCallback when oauthLinkMode=twitch. */
export async function linkTwitchWithSupabaseToken(accessToken) {
  const res = await apiClient.post('/user/link-twitch', { supabaseAccessToken: accessToken });
  return res.data;
}

/** Link X (Twitter) to current account: send Supabase access token to backend. Used from AuthCallback when oauthLinkMode=twitter. */
export async function linkTwitterWithSupabaseToken(accessToken) {
  const res = await apiClient.post('/user/link-twitter', { supabaseAccessToken: accessToken });
  return res.data;
}

const OAUTH_LINK_MODE_KEY = 'oauthLinkMode';

/** Start Google link: set link mode and redirect to Supabase Google OAuth. After callback, AuthCallback will call link-google and redirect to Settings. */
export function startGoogleLink() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(OAUTH_LINK_MODE_KEY, 'google');
  }
  loginWithGoogle();
}

/** Start Twitch link: set link mode and redirect to Supabase Twitch OAuth. After callback, AuthCallback will call link-twitch and redirect to Settings. */
export function startTwitchLink() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(OAUTH_LINK_MODE_KEY, 'twitch');
  }
  loginWithTwitch();
}

/** Start Twitch connect for publishing (schedule + bits). Redirects to backend OAuth flow; tokens stored in Integration. Call with auth token (e.g. from localStorage). */
export function startTwitchPublishConnect(token) {
  if (!token) {
    console.warn('startTwitchPublishConnect: token required');
    return;
  }
  // When main API URL is Supabase, Twitch OAuth must hit your real backend (set REACT_APP_TWITCH_OAUTH_BASE_URL or we use localhost)
  let base = apiClient.defaults.baseURL;
  if (process.env.REACT_APP_TWITCH_OAUTH_BASE_URL) {
    base = process.env.REACT_APP_TWITCH_OAUTH_BASE_URL.replace(/\/$/, '');
    if (!base.endsWith('/api')) base = `${base}/api`;
  } else if (base && base.includes('supabase.co')) {
    base = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000/api';
  }
  window.location.href = `${base}/user/twitch/connect?token=${encodeURIComponent(token)}`;
}

/** Start X (Twitter) link: redirect to backend OAuth2 link flow so we get access/refresh tokens for publishing. */
export function startTwitterLink(token) {
  if (!token) {
    console.error('startTwitterLink: token required');
    return;
  }
  const base = apiClient.defaults.baseURL;
  window.location.href = `${base}/user/auth/twitter/link?token=${encodeURIComponent(token)}`;
}

/** Start YouTube connect for publishing (video uploads). Redirects to backend OAuth flow; tokens stored in Integration. */
export function startYoutubeConnect(token) {
  if (!token) {
    console.warn('startYoutubeConnect: token required');
    return;
  }
  const base = apiClient.defaults.baseURL;
  window.location.href = `${base}/youtube/connect?token=${encodeURIComponent(token)}`;
}

/** GET /youtube/status - YouTube connection status (connected, channelTitle, etc.). */
export async function getYoutubeStatus() {
  const res = await apiClient.get('/youtube/status');
  return res.data;
}

/** POST /youtube/disconnect - remove YouTube integration. */
export async function disconnectYoutube() {
  const res = await apiClient.post('/youtube/disconnect');
  return res.data;
}

/** Clear OAuth link mode (used after AuthCallback finishes link flow). */
export function clearOAuthLinkMode() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(OAUTH_LINK_MODE_KEY);
  }
}

/** Get current OAuth link mode ('google' | 'twitch' | 'twitter' | null). */
export function getOAuthLinkMode() {
  if (typeof sessionStorage === 'undefined') return null;
  const mode = sessionStorage.getItem(OAUTH_LINK_MODE_KEY);
  return mode === 'google' || mode === 'twitch' || mode === 'twitter' ? mode : null;
}

/** POST /user/disconnect-google - remove Google from current account. */
export async function disconnectGoogle() {
  const res = await apiClient.post('/user/disconnect-google');
  return res.data;
}

/** POST /user/disconnect-twitch - remove Twitch from current account. */
export async function disconnectTwitch() {
  const res = await apiClient.post('/user/disconnect-twitch');
  return res.data;
}

/** POST /user/disconnect-twitter - remove X (Twitter) from current account. */
export async function disconnectTwitter() {
  const res = await apiClient.post('/user/disconnect-twitter');
  return res.data;
}

/** POST /user/disconnect-discord - remove Discord from current account. */
export async function disconnectDiscord() {
  const res = await apiClient.post('/user/disconnect-discord');
  return res.data;
}

/** @deprecated Use adminGenerateLicense. Kept for compatibility. */
export async function generateLicense({ userId, licenseType = 'monthly', token }) {
  return apiClient.post('/user/admin/generate-license', { userId, licenseType }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAllUsers(token) {
  return apiClient.get('/user/admin/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminDeleteUser({ userId, token }) {
  return apiClient.delete(`/user/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminGenerateLicense({ userId, licenseType, token }) {
  return apiClient.post('/user/admin/generate-license', { userId, licenseType }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminChangeEmail({ userId, newEmail, token }) {
  return apiClient.post('/user/admin/change-email', { userId, newEmail }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminResetPassword({ userId, token }) {
  return apiClient.post('/user/admin/reset-password', { userId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
} 

export async function adminCreateUser({ username, email, password, isAdmin, token }) {
  return apiClient.post('/user/admin/create', { username, email, password, isAdmin }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminUpdateLicense({ userId, licenseType, token }) {
  return apiClient.post('/user/admin/update-license', { userId, licenseType }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminAssignTrial({ userId, token }) {
  return apiClient.post('/user/admin/assign-trial', { userId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getLicenseStatus(token) {
  return apiClient.get('/user/license', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createCheckout({ licenseType, token }) {
  return apiClient.post('/payments/checkout', { licenseType }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/** Create checkout session by Stripe Price lookup_key (Stripe docs pattern). */
export async function createCheckoutSession({ lookup_key, success_url, cancel_url, token }) {
  return apiClient.post('/payments/create-checkout-session', { lookup_key, success_url, cancel_url }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function verifyPaymentSession({ sessionId, token }) {
  return apiClient.post('/payments/verify-session', { sessionId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getPaymentStats(token) {
  return apiClient.get('/payments/admin/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/** List payments for admin (paginated). Params: { limit, offset, status, from, to, token } */
export async function getAdminPaymentsList({ limit, offset, status, from, to, token }) {
  const params = new URLSearchParams();
  if (limit != null) params.set('limit', limit);
  if (offset != null) params.set('offset', offset);
  if (status) params.set('status', status);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return apiClient.get(`/payments/admin/list${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/** Get export URL for admin payments (CSV or JSON). Call and use window.open or location.href with token in header - use blob download instead. */
export async function getAdminPaymentsExportBlob({ format, status, from, to, token }) {
  const params = new URLSearchParams();
  params.set('format', format || 'csv');
  if (status) params.set('status', status);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const res = await apiClient.get(`/payments/admin/export?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
  });
  return res.data;
}

export async function getPaymentConfigStatus() {
  return apiClient.get('/payments/config-status');
}

export async function createSubscription({ licenseType, token }) {
  return apiClient.post('/payments/subscribe', { licenseType }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getSubscriptionStatus(token) {
  return apiClient.get('/payments/subscription', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function cancelSubscription(token) {
  return apiClient.post('/payments/subscription/cancel', {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getPaymentHistory(token) {
  return apiClient.get('/payments/history', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAvailableLicenses() {
  return apiClient.get('/user/available-licenses');
}

export async function getLicenseConfig(token) {
  return apiClient.get('/user/admin/license-config', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminExtendTrial({ userId, days, token }) {
  return apiClient.post('/user/admin/extend-trial', { userId, days }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function updateLicenseConfig({ availableLicenseTypes, token }) {
  return apiClient.post('/user/admin/license-config', { availableLicenseTypes }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/** GET /user/admin/fixed-costs - List of fixed monthly costs (admin). */
export async function getFixedCosts(token) {
  return apiClient.get('/user/admin/fixed-costs', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/** POST /user/admin/fixed-costs - Update fixed monthly costs (admin). Body: { fixedCosts: [{ label, amount, currency }] } */
export async function updateFixedCosts({ fixedCosts, token }) {
  return apiClient.post('/user/admin/fixed-costs', { fixedCosts }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function changePassword({ currentPassword, newPassword, token }) {
  return apiClient.put('/user/password', { currentPassword, newPassword }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getPasswordReminder(token) {
  return apiClient.get('/user/admin/password-reminder', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Upload file through backend (secure method using Service Role Key)
 * @param {File} file - The file to upload
 * @param {string} bucket - 'images' or 'videos' (optional, auto-detected)
 * @returns {Promise} API response with upload info and URL
 */
export async function uploadFileThroughBackend(file, bucket) {
  const formData = new FormData();
  formData.append('file', file);
  if (bucket) {
    formData.append('bucket', bucket);
  }
  
  return apiClient.post('/upload/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 5 * 60 * 1000 // 5 minutes (compression + upload can take a long time for videos)
  });
}

/**
 * Register an upload in the backend
 * This should be called after successfully uploading a file to Supabase Storage
 * @param {Object} params
 * @param {string} params.user_id - User UUID
 * @param {string} params.bucket - 'images' or 'videos'
 * @param {string} params.file_path - Path to the file in Supabase Storage
 * @param {boolean} params.isTrialUser - Whether the user is on trial (optional, will be inferred from user if not provided)
 * @returns {Promise} API response
 */
export async function registerUpload({ user_id, bucket, file_path, isTrialUser }) {
  return apiClient.post('/upload', {
    user_id,
    bucket,
    file_path,
    isTrialUser
  });
}

/**
 * Get upload statistics for a user
 * @param {string} user_id - User UUID
 * @returns {Promise} API response with upload stats
 */
export async function getUploadStats(user_id) {
  return apiClient.get(`/upload/stats/${user_id}`, {
    timeout: 25000, // 25s - stats can be slow (cache/Supabase)
  });
}

/**
 * Delete an uploaded file
 * @param {string} upload_id - Upload record ID
 * @returns {Promise} API response
 */
export async function deleteUpload(upload_id) {
  return apiClient.delete(`/upload/${upload_id}`);
}

/**
 * Get a signed URL for a video file
 * @param {string} file_path - Path to the video file in storage
 * @param {number} expiresIn - Expiration time in seconds (default: 3600)
 * @returns {Promise} API response with signedUrl
 */
export async function getVideoSignedUrl(file_path, expiresIn = 3600) {
  // Use query parameters instead of path parameters to avoid routing issues
  return apiClient.get('/upload/video-url', {
    params: { 
      file_path: file_path, // Axios will encode this automatically
      expiresIn 
    }
  });
}

// Messages API functions
export async function createMessage({ subject, content, priority, category, attachments, token }) {
  const formData = new FormData();
  formData.append('subject', subject);
  formData.append('content', content);
  formData.append('priority', priority || 'normal');
  if (category) formData.append('category', category);
  
  // Append attachments if any
  if (attachments && attachments.length > 0) {
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });
  }
  
  return apiClient.post('/messages', formData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });
}

export async function getMyMessages(token) {
  return apiClient.get('/messages/my-messages', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminMessages({ status, priority, category, userId, resolved, page, limit, token }) {
  const params = {};
  if (status) params.status = status;
  if (priority) params.priority = priority;
  if (category) params.category = category;
  if (userId) params.userId = userId;
  if (resolved !== undefined && resolved !== '') params.resolved = resolved;
  if (page) params.page = page;
  if (limit) params.limit = limit;
  
  return apiClient.get('/messages/admin', {
    params,
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getUnreadMessageCount(token) {
  return apiClient.get('/messages/admin/unread-count', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAdminMessage(messageId, token) {
  return apiClient.get(`/messages/admin/${messageId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function updateMessageStatus({ messageId, status, token }) {
  return apiClient.patch('/messages/admin/status', { messageId, status }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function replyToMessage({ messageId, reply, attachments, token }) {
  const formData = new FormData();
  formData.append('messageId', messageId);
  formData.append('reply', reply);
  
  // Append attachments if any
  if (attachments && attachments.length > 0) {
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });
  }
  
  return apiClient.post('/messages/reply', formData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });
}

export async function getMessage(messageId, token) {
  return apiClient.get(`/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function resolveMessage(messageId, token) {
  return apiClient.post('/messages/admin/resolve', { messageId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function reopenMessage(messageId, token) {
  return apiClient.post('/messages/admin/reopen', { messageId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function deleteMessage(messageId, token) {
  return apiClient.delete(`/messages/admin/${messageId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// ——— Notifications (admin announcements to users) ———
export async function getNotifications(token) {
  return apiClient.get('/notifications', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getNotificationsUnreadCount(token) {
  return apiClient.get('/notifications/unread-count', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function markNotificationRead(notificationId, token) {
  return apiClient.patch(`/notifications/${notificationId}/read`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function sendNotification({ title, content, broadcast = true, userId, token }) {
  return apiClient.post('/notifications', { title, content, broadcast, userId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// ——— Platform Configuration (admin) ———
export async function getPlatformConfig(token) {
  return apiClient.get('/admin/platforms/config', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function updatePlatformConfig({ platforms, token }) {
  return apiClient.put('/admin/platforms/config', { platforms }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// ——— Get Enabled Platforms (public) ———
export async function getEnabledPlatforms() {
  return apiClient.get('/platforms/enabled');
}
