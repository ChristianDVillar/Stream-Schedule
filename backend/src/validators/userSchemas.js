/**
 * User Validation Schemas with Joi
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import Joi from 'joi';

// Common validations
const emailSchema = Joi.string().email().max(255).required().messages({
  'string.email': 'Email must be a valid email address',
  'string.max': 'Email must not exceed 255 characters',
  'any.required': 'Email is required'
});

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/)
  .pattern(/[0-9]/)
  .pattern(/[a-z]/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    'any.required': 'Password is required'
  });

const usernameSchema = Joi.string()
  .alphanum()
  .min(3)
  .max(30)
  .required()
  .messages({
    'string.alphanum': 'Username must contain only letters and numbers',
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username must not exceed 30 characters',
    'any.required': 'Username is required'
  });

// Register schema
export const registerSchema = Joi.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  startWithTrial: Joi.boolean().optional(),
  licenseOption: Joi.string().valid('trial', 'monthly').optional().messages({
    'any.only': 'License option must be either "trial" or "monthly"'
  })
}).required();

// Login schema
export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
}).required();

// Change password schema
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: passwordSchema
}).required();

// Forgot password schema
export const forgotPasswordSchema = Joi.object({
  email: emailSchema
}).required();

// Update profile schema
export const updateProfileSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  email: Joi.string().email().max(255).optional(),
  merchandisingLink: Joi.string().uri().max(500).allow('', null).optional().messages({
    'string.uri': 'Merchandising link must be a valid URL'
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided to update'
});

// Admin create user schema
export const adminCreateUserSchema = Joi.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  isAdmin: Joi.boolean().optional().default(false)
}).required();

// Admin update license schema
export const adminUpdateLicenseSchema = Joi.object({
  userId: Joi.number().integer().positive().required().messages({
    'number.base': 'User ID must be a number',
    'number.integer': 'User ID must be an integer',
    'number.positive': 'User ID must be positive',
    'any.required': 'User ID is required'
  }),
  licenseType: Joi.string()
    .valid('none', 'trial', 'temporary', 'monthly', 'quarterly', 'lifetime')
    .required()
    .messages({
      'any.only': 'License type must be one of: none, trial, temporary, monthly, quarterly, lifetime',
      'any.required': 'License type is required'
    })
}).required();

// Admin change email schema
export const adminChangeEmailSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  newEmail: emailSchema
}).required();

// Admin reset password schema
export const adminResetPasswordSchema = Joi.object({
  userId: Joi.number().integer().positive().required()
}).required();

// Admin assign trial schema
export const adminAssignTrialSchema = Joi.object({
  userId: Joi.number().integer().positive().required()
}).required();

// Generate license schema (admin)
export const generateLicenseSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  licenseType: Joi.string()
    .valid('trial', 'temporary', 'monthly', 'quarterly', 'lifetime')
    .optional(),
  expiresAt: Joi.date().optional(),
  durationDays: Joi.number().integer().positive().max(3650).optional()
}).required();
