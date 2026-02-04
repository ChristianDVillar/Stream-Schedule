/**
 * Audit logging middleware
 * Logs important actions for security and compliance
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

// Ensure AuditLog model is initialized
// This will be available after migrations are run

/**
 * Create audit log entry
 * @param {object} options - Audit log options
 */
export async function createAuditLog(options) {
  try {
    await AuditLog.create({
      userId: options.userId,
      action: options.action,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      changes: options.changes,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata: options.metadata,
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    logger.error('Failed to create audit log', {
      error: error.message,
      action: options.action,
    });
  }
}

/**
 * Middleware to audit actions
 * @param {string} action - Action name
 * @param {string} resourceType - Resource type
 */
export function auditLog(action, resourceType) {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json to capture response
    res.json = function(data) {
      // Only log successful actions (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId = req.params.id || data?.id || null;
        
        // Capture changes for update actions
        let changes = null;
        if (req.method === 'PUT' || req.method === 'PATCH') {
          // In a real implementation, you'd compare before/after
          // For now, we log the update data
          changes = {
            updated: req.body,
          };
        }
        
        createAuditLog({
          userId: req.user?.id,
          action,
          resourceType,
          resourceId,
          changes,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
        });
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Audit admin actions specifically
 */
export function auditAdminAction(action) {
  return auditLog(action, 'Admin');
}
