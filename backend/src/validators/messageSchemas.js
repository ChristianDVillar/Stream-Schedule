/**
 * Message Validation Schemas with Joi
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import Joi from 'joi';

// Create message schema (user)
export const createMessageSchema = Joi.object({
  subject: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Subject is required',
    'string.min': 'Subject must be at least 1 character',
    'string.max': 'Subject must not exceed 255 characters',
    'any.required': 'Subject is required'
  }),
  content: Joi.string().trim().min(1).max(10000).required().messages({
    'string.empty': 'Message content is required',
    'string.min': 'Message content must be at least 1 character',
    'string.max': 'Message content must not exceed 10000 characters',
    'any.required': 'Message content is required'
  }),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional().default('normal').messages({
    'any.only': 'Priority must be one of: low, normal, high, urgent'
  }),
  category: Joi.string().valid('support', 'bug', 'feature', 'billing', 'account', 'other').optional().allow(null).messages({
    'any.only': 'Category must be one of: support, bug, feature, billing, account, other'
  })
}).required();

// Update message status schema (admin)
export const updateMessageStatusSchema = Joi.object({
  messageId: Joi.number().integer().positive().required().messages({
    'number.base': 'Message ID must be a number',
    'number.integer': 'Message ID must be an integer',
    'number.positive': 'Message ID must be positive',
    'any.required': 'Message ID is required'
  }),
  status: Joi.string().valid('unread', 'read', 'replied', 'archived').required().messages({
    'any.only': 'Status must be one of: unread, read, replied, archived',
    'any.required': 'Status is required'
  })
}).required();

// Reply to message schema (admin)
export const replyMessageSchema = Joi.object({
  messageId: Joi.number().integer().positive().required().messages({
    'number.base': 'Message ID must be a number',
    'number.integer': 'Message ID must be an integer',
    'number.positive': 'Message ID must be positive',
    'any.required': 'Message ID is required'
  }),
  reply: Joi.string().trim().min(1).max(10000).required().messages({
    'string.empty': 'Reply content is required',
    'string.min': 'Reply content must be at least 1 character',
    'string.max': 'Reply content must not exceed 10000 characters',
    'any.required': 'Reply content is required'
  })
}).required();

// Delete message schema (admin)
export const deleteMessageSchema = Joi.object({
  messageId: Joi.number().integer().positive().required().messages({
    'number.base': 'Message ID must be a number',
    'number.integer': 'Message ID must be an integer',
    'number.positive': 'Message ID must be positive',
    'any.required': 'Message ID is required'
  })
}).required();

// Resolve/reopen message schema (admin)
export const resolveMessageSchema = Joi.object({
  messageId: Joi.number().integer().positive().required().messages({
    'number.base': 'Message ID must be a number',
    'number.integer': 'Message ID must be an integer',
    'number.positive': 'Message ID must be positive',
    'any.required': 'Message ID is required'
  })
}).required();

// Get messages query schema (admin)
export const getMessagesQuerySchema = Joi.object({
  status: Joi.string().valid('unread', 'read', 'replied', 'archived').optional().allow(''),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional().allow(''),
  category: Joi.string().valid('support', 'bug', 'feature', 'billing', 'account', 'other').optional().allow(''),
  userId: Joi.number().integer().positive().optional(),
  resolved: Joi.string().valid('true', 'false').optional().allow(''),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20)
}).unknown(true); // Allow unknown query parameters
