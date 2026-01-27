/**
 * Validation Middleware using Joi
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import logger from '../utils/logger.js';

/**
 * Middleware to validate request data against a Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Where to validate: 'body', 'query', 'params' (default: 'body')
 * @returns {Function} Express middleware
 */
export function validate(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[source];
      
      // Validate data
      // For params, try to convert numeric strings to numbers
      let dataToValidateProcessed = dataToValidate;
      if (source === 'params') {
        dataToValidateProcessed = { ...dataToValidate };
        // Try to convert string numbers to actual numbers
        for (const key in dataToValidateProcessed) {
          const value = dataToValidateProcessed[key];
          if (typeof value === 'string' && /^\d+$/.test(value)) {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              dataToValidateProcessed[key] = numValue;
            }
          }
        }
      }
      
      const { value, error } = schema.validate(dataToValidateProcessed, {
        abortEarly: false, // Return all errors, not just the first one
        stripUnknown: true, // Remove unknown fields
        convert: true // Convert types (e.g., string to number)
      });

      if (error) {
        // Format validation errors
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors,
          source
        });

        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }

      // Replace request data with validated (and sanitized) data
      req[source] = value;
      next();
    } catch (err) {
      logger.error('Validation middleware error', {
        error: err.message,
        stack: err.stack,
        path: req.path
      });
      res.status(500).json({ error: 'Internal validation error' });
    }
  };
}

/**
 * Convenience functions for common validation sources
 */
export const validateBody = (schema) => validate(schema, 'body');
export const validateQuery = (schema) => validate(schema, 'query');
export const validateParams = (schema) => validate(schema, 'params');
