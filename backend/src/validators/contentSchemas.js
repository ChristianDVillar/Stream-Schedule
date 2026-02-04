/**
 * Content Validation Schemas with Joi
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import Joi from 'joi';
import { CONTENT_TYPE_VALUES } from '../constants/contentTypes.js';

// Recurrence schema
const recurrenceSchema = Joi.object({
  enabled: Joi.boolean().optional().default(false),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly').optional().default('weekly'),
  count: Joi.number().integer().min(1).max(50).optional().default(1)
}).optional();

// Create/Update content schema
export const contentSchema = Joi.object({
  title: Joi.string().min(1).max(500).required().messages({
    'string.min': 'Title must not be empty',
    'string.max': 'Title must not exceed 500 characters',
    'any.required': 'Title is required'
  }),
  content: Joi.string().min(1).max(10000).required().messages({
    'string.min': 'Content must not be empty',
    'string.max': 'Content must not exceed 10000 characters',
    'any.required': 'Content is required'
  }),
  contentType: Joi.string()
    .valid(...CONTENT_TYPE_VALUES)
    .required()
    .messages({
      'any.only': `Content type must be one of: ${CONTENT_TYPE_VALUES.join(', ')}`,
      'any.required': 'Content type is required'
    }),
  scheduledFor: Joi.date().iso().required().messages({
    'date.base': 'Scheduled date must be a valid date',
    'date.format': 'Scheduled date must be in ISO format',
    'any.required': 'Scheduled date is required'
  }),
  platforms: Joi.array()
    .items(Joi.string().valid('twitch', 'twitter', 'instagram', 'discord', 'youtube', 'tiktok'))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one platform must be selected',
      'any.required': 'Platforms are required',
      'any.only': 'Platform must be one of: twitch, twitter, instagram, discord, youtube, tiktok'
    }),
  hashtags: Joi.string().max(500).allow('', null).optional(),
  mentions: Joi.string().max(500).allow('', null).optional(),
  timezone: Joi.string().max(100).optional(),
  mediaUrls: Joi.array()
    .items(Joi.string().uri())
    .optional()
    .messages({
      'array.base': 'Media URLs must be an array',
      'string.uri': 'Each media URL must be a valid URI'
    }),
  mediaItems: Joi.array()
    .items(Joi.object({
      url: Joi.string().uri().optional(),
      file_path: Joi.string().max(500).optional(),
      fileName: Joi.string().allow('', null).optional(),
      type: Joi.string().valid('image', 'video').optional(),
      durationSeconds: Joi.number().min(0).optional()
    }).or('url', 'file_path'))
    .optional()
    .messages({
      'array.base': 'Media items must be an array',
      'object.missing': 'Each media item must have url or file_path'
    }),
  recurrence: recurrenceSchema,
  discordGuildId: Joi.string().max(100).allow('', null).optional(),
  discordChannelId: Joi.string().max(100).allow('', null).optional()
}).required();

// Update content schema (all fields optional)
export const updateContentSchema = Joi.object({
  title: Joi.string().min(1).max(500).optional(),
  content: Joi.string().min(1).max(10000).optional(),
  contentType: Joi.string()
    .valid(...CONTENT_TYPE_VALUES)
    .optional(),
  scheduledFor: Joi.date().iso().optional(),
  platforms: Joi.array()
    .items(Joi.string().valid('twitch', 'twitter', 'instagram', 'discord', 'youtube', 'tiktok'))
    .min(1)
    .optional(),
  hashtags: Joi.string().max(500).allow('', null).optional(),
  mentions: Joi.string().max(500).allow('', null).optional(),
  timezone: Joi.string().max(100).optional(),
  mediaUrls: Joi.array()
    .items(Joi.string().uri())
    .optional()
    .messages({
      'array.base': 'Media URLs must be an array',
      'string.uri': 'Each media URL must be a valid URI'
    }),
  mediaItems: Joi.array()
    .items(Joi.object({
      url: Joi.string().uri().optional(),
      file_path: Joi.string().max(500).optional(),
      fileName: Joi.string().allow('', null).optional(),
      type: Joi.string().valid('image', 'video').optional(),
      durationSeconds: Joi.number().min(0).optional()
    }).or('url', 'file_path'))
    .optional(),
  recurrence: recurrenceSchema,
  discordGuildId: Joi.string().max(100).allow('', null).optional(),
  discordChannelId: Joi.string().max(100).allow('', null).optional(),
  status: Joi.string()
    .valid('draft', 'scheduled', 'published', 'failed', 'cancelled')
    .optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided to update'
});
