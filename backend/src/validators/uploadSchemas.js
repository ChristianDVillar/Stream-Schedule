/**
 * Upload Validation Schemas with Joi
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import Joi from 'joi';

// Register upload schema
export const registerUploadSchema = Joi.object({
  user_id: Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      Joi.string().uuid()
    )
    .optional()
    .messages({
      'alternatives.match': 'User ID must be a number or valid UUID'
    }),
  bucket: Joi.string()
    .valid('images', 'videos')
    .required()
    .messages({
      'any.only': 'Bucket must be either "images" or "videos"',
      'any.required': 'Bucket is required'
    }),
  file_path: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.min': 'File path must not be empty',
      'string.max': 'File path must not exceed 500 characters',
      'any.required': 'File path is required'
    }),
  isTrialUser: Joi.boolean().optional()
}).required();

// Get upload stats schema
// Note: URL params are always strings, so we accept string that can be converted to number or UUID
export const getUploadStatsSchema = Joi.object({
  user_id: Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      Joi.string().uuid(),
      Joi.string().pattern(/^\d+$/).message('User ID must be a number or valid UUID')
    )
    .required()
    .messages({
      'alternatives.match': 'User ID must be a number or valid UUID',
      'any.required': 'User ID is required'
    })
}).required();
