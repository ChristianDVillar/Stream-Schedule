/**
 * Swagger/OpenAPI Configuration
 * API Documentation setup
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Streamer Scheduler API',
      version: '2.3.0',
      description: 'API for managing scheduled content across multiple platforms',
      contact: {
        name: 'API Support',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKeyWebhook: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key from Settings → Bots (same key for all webhooks)',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/app.js', './src/docs/*.js'],
};
