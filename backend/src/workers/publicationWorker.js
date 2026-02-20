/**
 * Publication Worker Entry Point
 * Run this as a separate process in production for scalability.
 * Usage: node backend/src/workers/publicationWorker.js
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import dotenv from 'dotenv';
import { startWorker } from '../services/publicationWorker.js';
import logger from '../utils/logger.js';
import { sequelize } from '../models/index.js';

// Load environment variables
dotenv.config();

async function main() {
  try {
    logger.info('Starting publication worker...');
    
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established');
    
    // Start worker
    const worker = await startWorker();
    
    if (!worker) {
      logger.warn('Worker not started (Redis/BullMQ not available)');
      logger.info('Make sure REDIS_URL or REDIS_HOST is configured');
      process.exit(1);
    }
    
    logger.info('Publication worker started successfully');
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down worker...');
      const { stopWorker } = await import('../services/publicationWorker.js');
      await stopWorker();
      await sequelize.close();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down worker...');
      const { stopWorker } = await import('../services/publicationWorker.js');
      await stopWorker();
      await sequelize.close();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start publication worker', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

main();
