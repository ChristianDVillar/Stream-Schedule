/**
 * Streamer Scheduler - Backend Application
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 * Proprietary Software - Unauthorized copying, distribution, or modification is strictly prohibited.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import userRoutes, {
  googleLoginHandler,
  discordAuth,
  discordCallback,
  discordLinkStart,
  discordLinkCallback,
  slackLinkStart,
  slackLinkCallback,
  twitterOAuth2Start,
  twitterOAuth2Callback,
  twitterLinkStart,
  twitterLinkCallback,
  connectedAccountsHandler,
  postPerformanceHandler,
} from './routes/user.js';
import contentRoutes from './routes/content.js';
import platformsRoutes from './routes/platforms.js';
import paymentsRoutes, { handleStripeWebhook } from './routes/payments.js';
import uploadsRoutes from './routes/uploads.js';
import discordRoutes from './routes/discord.js';
import akoenetRoutes from './routes/akoenet.js';
import youtubeRoutes from './routes/youtube.js';
// Instagram Graph API routes — re-enable with app.use('/api/instagram', instagramRoutes) when product is ready.
// import instagramRoutes from './routes/instagram.js';
import healthRoutes from './routes/health.js';
import integrationPublicRoutes from './routes/integrationPublic.js';
import templatesRoutes from './routes/templates.js';
import todosRoutes from './routes/todos.js';
import nightbotRoutes from './routes/nightbot.js';
import streamerRoutes, { publicStreamerUpcomingRouter } from './routes/streamer.js';
import webhooksRoutes from './routes/webhooks/index.js';
import rouletteRoutes from './routes/roulette.js';
import streamItemsRoutes from './routes/streamItems.js';
import suggestionsRoutes from './routes/suggestions.js';
import cronRoutes, { runStreamReminders } from './routes/cron.js';
import timelineRoutes from './routes/timeline.js';
import messagesRoutes from './routes/messages.js';
import notificationsRoutes from './routes/notifications.js';
import adminPlatformsRoutes from './routes/admin/platforms.js';
import { exchangeRateUsdEurHandler } from './routes/admin/exchangeRate.js';
import { getAlertConfigHandler, putAlertConfigHandler, postAlertConfigTestHandler } from './routes/admin/alerts.js';
import { getCostMetricsForAdmin } from './modules/system/application/publicationMetricService.js';
import { sequelize } from './modules/users/infrastructure/models.js';
import { SystemConfig } from './modules/system/infrastructure/models.js';
import { authenticateToken, requireAuth, requireAdmin } from './middleware/auth.js';
import { authLimiter, apiLimiter, uploadLimiter, webhookLimiter } from './middleware/rateLimit.js';
import { csrfProtection, getCsrfToken } from './middleware/csrf.js';
import { metricsMiddleware, metrics } from './utils/metrics.js';
import { setupSwagger } from './app-swagger.js';
import logger from './utils/logger.js';
import { getPublicAdminDashboardUrl } from './utils/publicFrontendUrl.js';
import platformConfigService from './modules/system/application/platformConfigService.js';
import { handleTwitchEventSub } from './routes/twitchWebhook.js';
import { PLATFORM_VALUES } from './constants/platforms.js';
import { dakinisCopyrightNotice } from './constants/copyright.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables: backend/.env first (so REDIS_URL etc. work when run from repo root), then cwd
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

// Feature flags: disable optional modules to reduce surface (audit: "fase 2")
const ENABLE_ADMIN_FINANCE = process.env.ENABLE_ADMIN_FINANCE !== 'false'; // true by default (backwards compat)
const ENABLE_PROMETHEUS_METRICS = process.env.ENABLE_PROMETHEUS_METRICS === 'true'; // false by default

const app = express();
const nodeEnv = process.env.NODE_ENV || 'development';

// Trust proxy when behind reverse proxy (Render, Nginx, etc.) so rate-limit and IP work correctly
app.set('trust proxy', 1);

// Copyright and Legal Protection Headers (includes commercial brand Dakinis Systems)
app.use((req, res, next) => {
  res.setHeader('X-Copyright', dakinisCopyrightNotice());
  res.setHeader('X-Proprietary', 'Proprietary Software - Unauthorized use prohibited.');
  next();
});
const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-jwt-secret')) {
  logger.error('Fatal: set JWT_SECRET in production (Render Environment).');
  process.exit(1);
}

// CORS: allow FRONTEND_URL (single) or FRONTEND_URLS (comma-separated). Default common dev origins.
// If you use a custom domain (e.g. streamautomator.com), set FRONTEND_URLS to include your domains:
//   FRONTEND_URLS=https://streamautomator.com,https://stream-schedule-v1.onrender.com
// so requests from the custom domain are allowed. FRONTEND_URL is still used for OAuth redirects.
function isLocalDevBrowserOrigin(origin) {
  try {
    const u = new URL(origin);
    const h = u.hostname.toLowerCase();
    if (h !== 'localhost' && h !== '127.0.0.1') return false;
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const integrationCorsOrigins = (process.env.INTEGRATION_CORS_ORIGINS || '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

const corsOriginConfig = (() => {
  const urls = process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(',').map((u) => u.trim()).filter(Boolean)
    : process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL.trim()]
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
        ];
  const isProduction = process.env.NODE_ENV === 'production';
  return (origin, cb) => {
    // Same-origin navigation, curl, Postman: often no Origin header
    if (!origin) return cb(null, true);
    if (integrationCorsOrigins.includes(origin)) return cb(null, origin);
    if (urls.includes(origin)) return cb(null, origin);
    // Dev: any localhost / 127.0.0.1 port (CRA, Vite, alternate ports) so ACAO is always set when Origin is local
    if (!isProduction && isLocalDevBrowserOrigin(origin)) return cb(null, origin);
    // Production fallback: allow Render frontends when env not set
    if (isProduction && (origin === 'https://stream-schedule-v1.onrender.com' || /^https:\/\/[\w-]+\.onrender\.com$/.test(origin))) {
      return cb(null, origin);
    }
    return cb(null, false);
  };
})();

// CORS must be before rate limiter to ensure CORS headers are sent even on rate limit errors
// Handle preflight OPTIONS requests first
app.options('*', cors({
  origin: corsOriginConfig,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

app.use(cors({
  origin: corsOriginConfig,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiter after CORS so CORS headers are always sent
app.use(apiLimiter);
app.use(passport.initialize());

// Webhooks must be before JSON parsing (raw body required for signature verification).
// Single canonical Stripe webhook: use /api/payments/webhook in Stripe Dashboard (avoids duplicate processing).
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.use('/api/webhooks/twitch/eventsub', express.raw({ type: 'application/json' }), (req, res, next) => {
  handleTwitchEventSub(req, res).catch((err) => {
    logger.error('Twitch EventSub webhook error', { error: err.message });
    res.status(500).end();
  });
});

app.use(express.json());

// Metrics middleware (before routes)
app.use(metricsMiddleware);

// CSRF token endpoint (before auth, public)
app.get('/api/csrf-token', getCsrfToken);

// AkoeNet / integrators: discovery (no auth). Mount before heavy routes.
app.use('/api/integration', integrationPublicRoutes);

// OAuth routes: register before authenticateToken so login/link callbacks work without JWT
// (callbacks are GET redirects from the provider and do not send Authorization header).
app.post('/api/user/google-login', authLimiter, googleLoginHandler);
app.get('/api/user/auth/discord', authLimiter, discordAuth);
app.get('/api/user/auth/discord/callback', discordCallback);
app.get('/api/user/auth/discord/link', discordLinkStart);
app.get('/api/user/auth/discord/link/callback', discordLinkCallback);
app.get('/api/user/auth/twitter', authLimiter, twitterOAuth2Start);
app.get('/api/user/auth/twitter/callback', twitterOAuth2Callback);
app.get('/api/user/auth/twitter/link', twitterLinkStart);
app.get('/api/user/auth/twitter/link/callback', twitterLinkCallback);
app.get('/api/user/auth/slack/link', slackLinkStart);
app.get('/api/user/auth/slack/link/callback', slackLinkCallback);

// Public endpoint: Get enabled platforms (no auth required)
app.get('/api/platforms/enabled', async (req, res) => {
  try {
    const enabled = await platformConfigService.getEnabledPlatforms();
    res.json({ platforms: enabled });
  } catch (error) {
    logger.error('Error getting enabled platforms', { error: error.message });
    // Fail open: return all platforms if error
    res.json({ platforms: PLATFORM_VALUES });
  }
});

// Admin UI is the React SPA (e.g. streamautomator.com/admin), not this API. If someone opens api.../admin, redirect.
function redirectApiAdminToSpa(req, res) {
  const target = getPublicAdminDashboardUrl();
  if (!target) {
    return res.status(404).json({
      error: 'Endpoint not found',
      message:
        'The admin dashboard runs on the Streamer Scheduler frontend (React), not on the API host. Use https://your-app-domain/admin — the same origin as users use for the app. Set FRONTEND_URL (or PUBLIC_FRONTEND_URL) on this server to enable an automatic redirect from /admin.',
      path: req.path,
    });
  }
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(302, `${target}${q}`);
}
app.get('/admin', redirectApiAdminToSpa);
app.get('/admin/', redirectApiAdminToSpa);

// JWT authentication middleware - attaches user to req.user if token is valid
app.use(authenticateToken);

// API Routes - register connected-accounts and admin fixed-costs explicitly so they are always reachable
app.get('/api/user/connected-accounts', requireAuth, connectedAccountsHandler);
app.get('/api/user/post-performance', requireAuth, postPerformanceHandler);

// Admin features flag: frontend can check GET /api/admin/features to hide disabled sections
app.get('/api/admin/features', requireAdmin, (req, res) => {
  res.json({
    adminFinance: ENABLE_ADMIN_FINANCE,
    prometheusMetrics: ENABLE_PROMETHEUS_METRICS,
  });
});

const DEFAULT_FIXED_MONTHLY_COSTS = [
  { label: 'Cursor', amount: 20, currency: 'EUR', type: 'monthly' },
  { label: 'Render', amount: 7, currency: 'EUR', type: 'monthly' },
  { label: 'Upstash Redis', amount: 0.38, currency: 'USD', type: 'monthly' },
  { label: 'Dominio', amount: 12, currency: 'EUR', type: 'annual', effectiveFrom: null },
];
function normalizeFixedCostItem(item) {
  const label = String(item?.label ?? '').trim() || 'Item';
  const amount = Number(item?.amount) || 0;
  const currency = String(item?.currency ?? 'EUR').trim().toUpperCase() || 'EUR';
  const type = item?.type === 'annual' ? 'annual' : 'monthly';
  let effectiveFrom = item?.effectiveFrom;
  if (effectiveFrom != null && typeof effectiveFrom === 'string') {
    const d = effectiveFrom.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) effectiveFrom = null;
    else effectiveFrom = d;
  } else {
    effectiveFrom = null;
  }
  return { label, amount, currency, type, effectiveFrom };
}

function normalizeDiscountCodeItem(item) {
  let code = String(item?.code || '').trim().toUpperCase();
  if (!code) return null;
  let percentOff = Number(item?.percentOff);
  if (!Number.isFinite(percentOff) || percentOff <= 0) percentOff = 0;
  if (percentOff > 100) percentOff = 100;
  let maxRedemptions = item?.maxRedemptions;
  if (maxRedemptions != null) {
    const n = Number(maxRedemptions);
    maxRedemptions = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  } else {
    maxRedemptions = null;
  }
  let validFrom = item?.validFrom ? String(item.validFrom).trim() : null;
  if (validFrom && !/^\d{4}-\d{2}-\d{2}$/.test(validFrom.slice(0, 10))) validFrom = null;
  let validUntil = item?.validUntil ? String(item.validUntil).trim() : null;
  if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil.slice(0, 10))) validUntil = null;
  const note = String(item?.note || '').trim() || null;
  return { code, percentOff, maxRedemptions, validFrom, validUntil, note };
}

if (ENABLE_ADMIN_FINANCE) {
app.get('/api/user/admin/fixed-costs', requireAdmin, async (req, res) => {
  try {
    const config = await SystemConfig.findOne({ where: { key: 'fixedMonthlyCosts' } });
    const raw = config && Array.isArray(config.value) ? config.value : DEFAULT_FIXED_MONTHLY_COSTS;
    const fixedCosts = raw.map((item) => normalizeFixedCostItem(item));
    res.json({ fixedCosts });
  } catch (err) {
    logger.error('Error getting fixed costs', { error: err.message, adminId: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: discount codes configuration (percentage, max uses, valid period)
app.get('/api/user/admin/discount-codes', requireAdmin, async (req, res) => {
  try {
    const config = await SystemConfig.findOne({ where: { key: 'discountCodes' } });
    const raw = config && Array.isArray(config.value) ? config.value : [];
    const discountCodes = raw
      .map((item) => normalizeDiscountCodeItem(item))
      .filter((item) => item && item.percentOff > 0);
    res.json({ discountCodes });
  } catch (err) {
    logger.error('Error getting discount codes', { error: err.message, adminId: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/user/admin/discount-codes', requireAdmin, async (req, res) => {
  const { discountCodes } = req.body;
  if (!Array.isArray(discountCodes)) {
    return res.status(400).json({ error: 'discountCodes must be an array' });
  }
  const normalized = discountCodes
    .map((item) => normalizeDiscountCodeItem(item))
    .filter((item) => item && item.percentOff > 0);
  try {
    let config = await SystemConfig.findOne({ where: { key: 'discountCodes' } });
    if (config) {
      config.value = normalized;
      await config.save();
    } else {
      config = await SystemConfig.create({
        key: 'discountCodes',
        value: normalized,
        description: 'Admin-configured discount codes (percentage, max uses, valid period)',
      });
    }
    res.json({ discountCodes: config.value, message: 'Discount codes updated' });
  } catch (err) {
    logger.error('Error updating discount codes', { error: err.message, adminId: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
});
app.post('/api/user/admin/fixed-costs', requireAdmin, async (req, res) => {
  const { fixedCosts } = req.body;
  if (!Array.isArray(fixedCosts)) {
    return res.status(400).json({ error: 'fixedCosts must be an array' });
  }
  const normalized = fixedCosts.map(normalizeFixedCostItem).filter((item) => item.label && item.amount >= 0);
  try {
    let config = await SystemConfig.findOne({ where: { key: 'fixedMonthlyCosts' } });
    if (config) {
      config.value = normalized;
      await config.save();
    } else {
      config = await SystemConfig.create({
        key: 'fixedMonthlyCosts',
        value: normalized,
        description: 'Fixed monthly costs for admin control (e.g. Cursor, Render)',
      });
    }
    res.json({ fixedCosts: config.value, message: 'Fixed costs updated' });
  } catch (err) {
    logger.error('Error updating fixed costs', { error: err.message, adminId: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/exchange-rate-usd-eur', requireAdmin, exchangeRateUsdEurHandler);

app.get('/api/user/admin/cost-metrics', requireAdmin, async (req, res) => {
  try {
    const data = await getCostMetricsForAdmin();
    res.json(data);
  } catch (err) {
    logger.error('Error getting cost metrics', { error: err.message, adminId: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/user/admin/alert-config', requireAdmin, getAlertConfigHandler);
app.put('/api/user/admin/alert-config', requireAdmin, putAlertConfigHandler);
app.post('/api/user/admin/alert-config/test', requireAdmin, postAlertConfigTestHandler);
}

app.use('/api/user', userRoutes);
app.use('/api/discord', discordRoutes);
app.use('/api/akoenet', akoenetRoutes);
app.use('/api/youtube', youtubeRoutes);
// app.use('/api/instagram', instagramRoutes);
// CSRF disabled for content until frontend sends X-CSRF-Token (GET /api/csrf-token)
app.use('/api/content', contentRoutes);
app.use('/api/platforms', platformsRoutes);
app.use('/api/payments', paymentsRoutes);
// Apply uploadLimiter only to write operations (POST/PUT/DELETE). GET (stats, video-url) use apiLimiter only to avoid 429 on page load.
app.use('/api/upload', (req, res, next) => {
  if (req.method === 'GET') return next();
  return uploadLimiter(req, res, next);
}, uploadsRoutes);
// CSRF disabled for templates until frontend sends X-CSRF-Token
app.use('/api/templates', templatesRoutes);
app.use('/api/todos', todosRoutes);
app.use('/api/nightbot', nightbotRoutes);
app.use('/api/streamer', streamerRoutes);
app.use('/api/public/streamer', publicStreamerUpcomingRouter);
app.use('/api/webhooks', webhookLimiter, webhooksRoutes);
app.use('/api/roulette', rouletteRoutes);
app.use('/api/stream-items', streamItemsRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin/platforms', adminPlatformsRoutes);

// Enhanced health check endpoint
app.use('/api/health', healthRoutes);

// Metrics endpoint (Prometheus format) - disabled by default; set ENABLE_PROMETHEUS_METRICS=true to enable
if (ENABLE_PROMETHEUS_METRICS) {
  app.get('/api/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(metrics.export());
  });
}

// Swagger documentation (if available)
setupSwagger(app);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Streamer Scheduler API',
    version: '2.3.1',
    status: 'running',
    endpoints: {
      health: '/api/health',
      integration: '/api/integration/akoenet',
      user: '/api/user',
      content: '/api/content',
      platforms: '/api/platforms',
      payments: '/api/payments',
      upload: '/api/upload'
    }
  });
});

// 404 handler - Always return JSON, never HTML
app.use((req, res) => {
  logger.warn('404 - Endpoint not found', {
    path: req.path,
    originalUrl: req.originalUrl,
    method: req.method,
    query: req.query
  });
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    originalUrl: req.originalUrl,
    method: req.method
  });
});

// Error handler - Always return JSON
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
const enableLogging = process.env.ENABLE_LOGGING === 'true';
const logLevel = process.env.LOG_LEVEL || 'info';

async function initServer() {
  try {
    await sequelize.authenticate();
    const dbType = process.env.DATABASE_URL ? 'PostgreSQL (Supabase)' : 'SQLite';
    logger.info('Database connection established', { dbType, environment: nodeEnv });
    
    // Only sync in non-production environments
    // Note: sync({ alter: true }) can cause issues with existing tables
    // Migrations handle schema changes, so sync is mainly for initial setup
    if (nodeEnv !== 'production') {
      try {
        await sequelize.sync({ alter: false }); // Use alter: false to avoid conflicts with migrations
        logger.debug('Database schema synchronized');
      } catch (syncError) {
        // If sync fails, it's okay - migrations handle schema changes
        logger.warn('Database sync skipped (migrations handle schema)', {
          error: syncError.message
        });
      }
    }
  } catch (err) {
    logger.error('Database initialization failed', {
      error: err.message,
      stack: err.stack,
      hasSSL: process.env.DATABASE_SSL === 'true',
      hasDatabaseUrl: !!process.env.DATABASE_URL
    });
    
    if (err.message.includes('SSL') || err.message.includes('certificate')) {
      logger.warn('SSL configuration issue - make sure DATABASE_SSL=true is set for Supabase');
    }
    if (err.message.includes('password') || err.message.includes('authentication')) {
      logger.warn('Authentication issue - check DATABASE_URL and URL-encode special characters');
    }
    
    process.exit(1);
  }

  const server = app.listen(PORT, '0.0.0.0', async () => {
    logger.info('Server started', {
      port: PORT,
      environment: nodeEnv,
      logLevel
    });
    // Initialize WebSocket if available
    try {
      const { initWebSocket } = await import('./services/websocketService.js');
      await initWebSocket(server);
    } catch (error) {
      logger.debug('WebSocket not initialized', { error: error.message });
    }
    
    if (nodeEnv === 'production') {
      logger.warn('Production mode - ensure SSL is enabled for database connections');
    }

    // Recordatorios de streams:
    // - Recomendado: usar el proceso de scheduler/worker (schedulerServer.js) o un cron externo que llame a /api/cron/send-stream-reminders.
    // - Este cron in-process puede activarse en entornos pequeños con ENABLE_STREAM_REMINDER_CRON=true, pero no es la opción recomendada para escalar.
    if (process.env.ENABLE_STREAM_REMINDER_CRON === 'true') {
      const run = () =>
        runStreamReminders().catch((e) =>
          logger.error('Stream reminders job error (in-process cron)', { error: e.message })
        );
      setTimeout(run, 30 * 1000);
      setInterval(run, 15 * 60 * 1000);
      logger.info('Stream reminder cron enabled in API process (every 15 min) — prefer schedulerServer or external cron in production');
    }
  });

  return server;
}

export { app, initServer };
export default app;