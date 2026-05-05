/**
 * Payment Validation Schemas with Joi
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import Joi from 'joi';

// Create checkout schema
export const checkoutSchema = Joi.object({
  licenseType: Joi.string()
    .valid('monthly', 'quarterly', 'creator', 'pro_monthly', 'lifetime', 'temporary')
    .optional()
    .default('creator')
    .messages({
      'any.only': 'License type must be one of: creator, pro_monthly, monthly, quarterly, lifetime, temporary'
    })
}).required();

// Create checkout session by Stripe Price lookup_key (Stripe docs pattern)
export const createCheckoutSessionSchema = Joi.object({
  lookup_key: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.min': 'lookup_key is required',
      'string.max': 'lookup_key must not exceed 200 characters',
      'any.required': 'lookup_key is required (Stripe Price lookup key from Dashboard)'
    }),
  success_url: Joi.string().uri().max(500).optional(),
  cancel_url: Joi.string().uri().max(500).optional(),
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

// Create subscription schema (Creator / Pro plans; compat with legacy monthly/quarterly)
export const subscribeSchema = Joi.object({
  licenseType: Joi.string()
    .valid('creator', 'pro_monthly', 'monthly', 'quarterly')
    .required()
    .messages({
      'any.only': 'Subscription license type must be one of: creator, pro_monthly, monthly, quarterly',
      'any.required': 'License type is required for subscription'
    })
}).required();
