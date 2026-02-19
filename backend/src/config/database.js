/**
 * Centralized Database Configuration
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import path from 'path';
import logger from '../utils/logger.js';

// Load environment variables
dotenv.config();

let databaseUrl = process.env.DATABASE_URL;
// In production, ensure SSL mode for Postgres (Render, Supabase, etc.)
if (databaseUrl && typeof databaseUrl === 'string' && (process.env.NODE_ENV === 'production' || process.env.DATABASE_SSL === 'true')) {
  const hasSslmode = /[?&]sslmode=/i.test(databaseUrl);
  if (!hasSslmode) {
    const sep = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${sep}sslmode=require`;
  }
}
const usePostgres = Boolean(databaseUrl);
const nodeEnv = process.env.NODE_ENV || 'development';
const enableLogging = process.env.ENABLE_LOGGING === 'true';
const isProduction = nodeEnv === 'production';
const requireSSL = isProduction || process.env.DATABASE_SSL === 'true';

// In production, DATABASE_URL and SSL are required
if (isProduction && !databaseUrl) {
  logger.error('DATABASE_URL is required in production environment');
  throw new Error('DATABASE_URL is required in production environment');
}

if (isProduction && !requireSSL) {
  logger.error('DATABASE_SSL=true is required in production environment');
  throw new Error('DATABASE_SSL=true is required in production environment');
}

// Create Sequelize instance
const sequelize = usePostgres
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: enableLogging ? (msg) => logger.debug(msg) : false,
      protocol: 'postgres',
      dialectOptions: {
        ssl: requireSSL
          ? {
              require: true,
              rejectUnauthorized: false, // Supabase uses self-signed certificates
            }
          : false,
        // Supabase pooler compatibility
        ...(databaseUrl.includes('pooler.supabase.com') && {
          application_name: 'streamer-scheduler',
        }),
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.SQLITE_STORAGE || path.resolve(process.cwd(), 'database.sqlite'),
      logging: enableLogging ? (msg) => logger.debug(msg) : false,
    });

export { sequelize, usePostgres, nodeEnv, enableLogging, isProduction, requireSSL };
