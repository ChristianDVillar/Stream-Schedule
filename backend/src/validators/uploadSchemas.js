/**
 * Upload Validation Schemas with Joi
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import Joi from 'joi';

// Register upload schema
export const registerUploadSchema = Joi.object({
  user_id: Joi.string().uuid().optional().messages({
    'string.guid': 'User ID must be a valid UUID'
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
export const getUploadStatsSchema = Joi.object({
  user_id: Joi.string().uuid().required().messages({
    'string.guid': 'User ID must be a valid UUID',
    'any.required': 'User ID is required'
  })
}).required();
