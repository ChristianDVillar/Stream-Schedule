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
  twitterOAuth2Start,
  twitterOAuth2Callback,
  twitterLinkStart,
  twitterLinkCallback,
  connectedAccountsHandler
} from './routes/user.js';
import contentRoutes from './routes/content.js';
import platformsRoutes from './routes/platforms.js';
import paymentsRoutes, { handleStripeWebhook } from './routes/payments.js';
import uploadsRoutes from './routes/uploads.js';
import discordRoutes from './routes/discord.js';
import healthRoutes from './routes/health.js';
import templatesRoutes from './routes/templates.js';
import messagesRoutes from './routes/messages.js';
import { sequelize } from './models/index.js';
import { authenticateToken, requireAuth } from './middleware/auth.js';
import { authLimiter, apiLimiter, uploadLimiter } from './middleware/rateLimit.js';
import { csrfProtection, getCsrfToken } from './middleware/csrf.js';
import { metricsMiddleware, metrics } from './utils/metrics.js';
import { setupSwagger } from './app-swagger.js';
import logger from './utils/logger.js';
import { startScheduler } from './services/scheduler.js';

// Load environment variables
// For local development: loads from .env file
// For Render/production: uses Environment Variables from Render dashboard
dotenv.config();

const app = express();
const nodeEnv = process.env.NODE_ENV || 'development';

// Trust proxy when behind reverse proxy (Render, Nginx, etc.) so rate-limit and IP work correctly
app.set('trust proxy', 1);

// Copyright and Legal Protection Headers
app.use((req, res, next) => {
  res.setHeader('X-Copyright', 'Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.');
  res.setHeader('X-Proprietary', 'Proprietary Software - Unauthorized use prohibited.');
  next();
});
const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';

// CORS: allow FRONTEND_URL (single) or FRONTEND_URLS (comma-separated). Default localhost for dev.
// In production, allow *.onrender.com if FRONTEND_URL/FRONTEND_URLS not set (fallback for Render).
const corsOriginConfig = (() => {
  const urls = process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(',').map((u) => u.trim()).filter(Boolean)
    : process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL.trim()]
      : ['http://localhost:3000'];
  const isProduction = process.env.NODE_ENV === 'production';
  return (origin, cb) => {
    if (!origin) return cb(null, true);
    if (urls.includes(origin)) return cb(null, origin);
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

// Stripe webhook must be before JSON parsing (raw body required for signature verification).
// Support both /api/payments/webhook and /stripe/webhook (Stripe Dashboard often uses /stripe/webhook).
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.use('/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

// Metrics middleware (before routes)
app.use(metricsMiddleware);

// CSRF token endpoint (before auth, public)
app.get('/api/csrf-token', getCsrfToken);

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

// JWT authentication middleware - attaches user to req.user if token is valid
app.use(authenticateToken);

// API Routes - register connected-accounts explicitly so GET /api/user/connected-accounts is always available
app.get('/api/user/connected-accounts', requireAuth, connectedAccountsHandler);
app.use('/api/user', userRoutes);
app.use('/api/discord', discordRoutes);
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
app.use('/api/messages', messagesRoutes);

// Enhanced health check endpoint
app.use('/api/health', healthRoutes);

// Metrics endpoint (Prometheus format)
app.get('/api/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metrics.export());
});

// Swagger documentation (if available)
setupSwagger(app);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Streamer Scheduler API',
    version: '2.1.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
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

  const server = app.listen(PORT, async () => {
    logger.info('Server started', {
      port: PORT,
      environment: nodeEnv,
      logLevel
    });
    startScheduler();
    
    // Initialize WebSocket if available
    try {
      const { initWebSocket } = await import('./services/websocketService.js');
      initWebSocket(server);
    } catch (error) {
      logger.debug('WebSocket not initialized', { error: error.message });
    }
    
    if (nodeEnv === 'production') {
      logger.warn('Production mode - ensure SSL is enabled for database connections');
    }
  });
  
  return server;
}

initServer();