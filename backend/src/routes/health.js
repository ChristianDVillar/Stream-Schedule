/**
 * Enhanced health check endpoint
 * Checks all critical dependencies
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import express from 'express';
import { sequelize } from '../models/index.js';
import { supabase } from '../utils/supabaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/health/ping - Health check ligero para Render (sin Supabase/Stripe).
 * Responde 200 rápido; opcionalmente comprueba DB. Usar como Health Check path en Render.
 */
router.get('/ping', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ ok: true, service: 'stream-schedule-api' });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

/**
 * Check database connection
 */
async function checkDatabase() {
  try {
    await sequelize.authenticate();
    return { status: 'ok', message: 'Database connected' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

/**
 * Check Supabase storage connection
 */
async function checkSupabase() {
  if (!supabase) {
    return { status: 'warning', message: 'Supabase not configured' };
  }
  
  try {
    // Try to list buckets (lightweight operation)
    const { error } = await supabase.storage.listBuckets();
    if (error) {
      return { status: 'error', message: error.message };
    }
    return { status: 'ok', message: 'Supabase connected' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

/**
 * Check Stripe configuration
 */
async function checkStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey === 'your-stripe-secret-key') {
    return { status: 'warning', message: 'Stripe not configured' };
  }
  if (!stripeKey.startsWith('sk_')) {
    return { status: 'warning', message: 'Stripe key format invalid' };
  }
  const mode = stripeKey.startsWith('sk_test_') ? 'test' : (stripeKey.startsWith('sk_live_') ? 'live' : 'unknown');
  return { status: 'ok', message: `Stripe configured (${mode})` };
}

/**
 * GET /api/health - Enhanced health check
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  const checks = {
    database: await checkDatabase(),
    supabase: await checkSupabase(),
    stripe: await checkStripe(),
  };
  
  const allHealthy = Object.values(checks).every(
    check => check.status === 'ok'
  );
  
  const responseTime = Date.now() - startTime;
  
  const healthStatus = {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'stream-schedule-api',
    version: '2.1.0',
    checks,
    responseTime: `${responseTime}ms`,
    uptime: process.uptime(),
  };
  
  // Log if degraded
  if (!allHealthy) {
    logger.warn('Health check degraded', healthStatus);
  }
  
  res.status(allHealthy ? 200 : 503).json(healthStatus);
});

export default router;
