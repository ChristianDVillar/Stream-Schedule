/**
 * Swagger/OpenAPI Setup
 * API Documentation endpoint
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 * 
 * Note: Requires swagger-jsdoc and swagger-ui-express
 * Install: npm install swagger-jsdoc swagger-ui-express
 */

import { swaggerOptions } from './config/swagger.js';
import logger from './utils/logger.js';

let swaggerSetup = null;

export async function setupSwagger(app) {
  try {
    const swaggerJsdoc = (await import('swagger-jsdoc')).default;
    const swaggerUi = (await import('swagger-ui-express')).default;
    
    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Streamer Scheduler API Documentation',
    }));
    
    swaggerSetup = true;
    logger.info('Swagger documentation available at /api-docs');
  } catch (error) {
    logger.warn('Swagger not available (dependencies not installed)', {
      error: error.message,
    });
    swaggerSetup = false;
  }
}

export function isSwaggerAvailable() {
  return swaggerSetup === true;
}
