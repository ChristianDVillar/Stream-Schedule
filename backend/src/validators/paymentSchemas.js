/**
 * Payment Validation Schemas with Joi
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import Joi from 'joi';

// Create checkout schema
export const checkoutSchema = Joi.object({
  licenseType: Joi.string()
    .valid('monthly', 'quarterly', 'lifetime', 'temporary')
    .optional()
    .default('monthly')
    .messages({
      'any.only': 'License type must be one of: monthly, quarterly, lifetime, temporary'
    })
}).required();

// Verify session schema
export const verifySessionSchema = Joi.object({
  sessionId: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.min': 'Session ID must not be empty',
      'string.max': 'Session ID must not exceed 200 characters',
      'any.required': 'Session ID is required'
    })
}).required();
