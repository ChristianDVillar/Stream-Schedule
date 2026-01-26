/**
 * Structured Logging with Winston
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodeEnv = process.env.NODE_ENV || 'development';
const logLevel = process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug');
const enableFileLogging = process.env.ENABLE_FILE_LOGGING !== 'false';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format (more readable for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

// Create transports array
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: nodeEnv === 'production' ? logFormat : consoleFormat,
    level: logLevel
  })
);

// File transports (only in production or if explicitly enabled)
if (enableFileLogging && nodeEnv === 'production') {
  const logsDir = path.join(__dirname, '../../logs');

  // Combined log (all levels)
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
      level: 'info'
    })
  );

  // Error log (only errors)
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
      level: 'error'
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'stream-schedule-api',
    environment: nodeEnv
  },
  transports,
  // Don't exit on handled exceptions
  exitOnError: false
});

// Create a stream object for Morgan HTTP logger (if needed in the future)
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Helper function to add request context
logger.withContext = (req) => {
  return logger.child({
    requestId: req.id || req.headers['x-request-id'],
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path
  });
};

export default logger;
