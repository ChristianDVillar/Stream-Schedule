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
import userRoutes from './routes/user.js';
import contentRoutes from './routes/content.js';
import platformsRoutes from './routes/platforms.js';
import paymentsRoutes from './routes/payments.js';
import { sequelize } from './models/index.js';
import { authenticateToken } from './middleware/auth.js';

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

// JWT authentication middleware - attaches user to req.user if token is valid
app.use(authenticateToken);

// API Routes
app.use('/api/user', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/platforms', platformsRoutes);
app.use('/api/payments', paymentsRoutes);

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
      payments: '/api/payments'
    }
  });
});

const PORT = process.env.PORT || 5000;
const enableLogging = process.env.ENABLE_LOGGING === 'true';
const logLevel = process.env.LOG_LEVEL || 'info';

async function initServer() {
  try {
    await sequelize.authenticate();
    if (enableLogging && logLevel === 'debug') {
      const dbType = process.env.DATABASE_URL ? 'PostgreSQL (Supabase)' : 'SQLite';
      console.log(`✅ Database connection established: ${dbType} (${nodeEnv})`);
    }
    
    // Only sync in non-production environments
    if (nodeEnv !== 'production') {
      await sequelize.sync({ alter: true });
      if (enableLogging && logLevel === 'debug') {
        console.log('✅ Database schema synchronized');
      }
    }
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    if (err.message.includes('SSL') || err.message.includes('certificate')) {
      console.error('💡 Tip: Make sure DATABASE_SSL=true is set in your .env file for Supabase');
    }
    if (err.message.includes('password') || err.message.includes('authentication')) {
      console.error('💡 Tip: Check your DATABASE_URL - make sure special characters in password are URL-encoded');
      console.error('   Example: ! becomes %21, @ becomes %40');
    }
    console.error('Full error:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    const envInfo = nodeEnv === 'production' ? '🚀 PRODUCTION' : nodeEnv === 'test' ? '🧪 TEST' : '🔧 DEVELOPMENT';
    console.log(`${envInfo} Server running on port ${PORT}`);
    if (nodeEnv === 'production') {
      console.log('⚠️  Logging is DISABLED in production');
      console.log('⚠️  SSL is REQUIRED for database connections');
    }
  });
}

initServer();