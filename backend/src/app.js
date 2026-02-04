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
import userRoutes, { googleLoginHandler, discordAuth, discordCallback, discordLinkStart, discordLinkCallback, connectedAccountsHandler } from './routes/user.js';
import contentRoutes from './routes/content.js';
import platformsRoutes from './routes/platforms.js';
import paymentsRoutes from './routes/payments.js';
import uploadsRoutes from './routes/uploads.js';
import discordRoutes from './routes/discord.js';
import { sequelize } from './models/index.js';
import { authenticateToken, requireAuth } from './middleware/auth.js';
import logger from './utils/logger.js';
import { startScheduler } from './services/scheduler.js';

// Load environment variables
// For local development: loads from .env file
// For Render/production: uses Environment Variables from Render dashboard
dotenv.config();

const app = express();
const nodeEnv = process.env.NODE_ENV || 'development';

// Copyright and Legal Protection Headers
app.use((req, res, next) => {
  res.setHeader('X-Copyright', 'Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.');
  res.setHeader('X-Proprietary', 'Proprietary Software - Unauthorized use prohibited.');
  next();
});
const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300
});

app.use(helmet());
app.use(limiter);
app.use(cors({ origin: true, credentials: true }));
app.use(passport.initialize());

// Stripe webhook must be before JSON parsing middleware
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// OAuth routes: register before authenticateToken so login works without JWT
app.post('/api/user/google-login', googleLoginHandler);
app.get('/api/user/auth/discord', discordAuth);
app.get('/api/user/auth/discord/callback', discordCallback);
app.get('/api/user/auth/discord/link', discordLinkStart);
app.get('/api/user/auth/discord/link/callback', discordLinkCallback);

// JWT authentication middleware - attaches user to req.user if token is valid
app.use(authenticateToken);

// API Routes - register connected-accounts explicitly so GET /api/user/connected-accounts is always available
app.get('/api/user/connected-accounts', requireAuth, connectedAccountsHandler);
app.use('/api/user', userRoutes);
app.use('/api/discord', discordRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/platforms', platformsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/upload', uploadsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: nodeEnv,
    service: 'stream-schedule-api'
  });
});

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
    if (nodeEnv !== 'production') {
      await sequelize.sync({ alter: true });
      logger.debug('Database schema synchronized');
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

  app.listen(PORT, () => {
    logger.info('Server started', {
      port: PORT,
      environment: nodeEnv,
      logLevel
    });
    startScheduler();
    if (nodeEnv === 'production') {
      logger.warn('Production mode - ensure SSL is enabled for database connections');
    }
  });
}

initServer();