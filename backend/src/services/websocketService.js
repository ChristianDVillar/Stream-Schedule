/**
 * WebSocket Service (Socket.IO)
 * Real-time notifications for content publishing
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 * 
 * Note: Requires socket.io. Install: npm install socket.io
 */

import logger from '../utils/logger.js';

let io = null;
let wsAvailable = false;

/**
 * Initialize WebSocket server
 */
export function initWebSocket(server) {
  try {
    // Dynamic import to avoid errors if not installed
    import('socket.io').then((socketModule) => {
      const { Server } = socketModule;
      io = new Server(server, {
        cors: {
          origin: process.env.FRONTEND_URL || '*',
          methods: ['GET', 'POST'],
        },
      });
      
      io.on('connection', (socket) => {
        logger.info('WebSocket client connected', { socketId: socket.id });
        
        // Join user room
        socket.on('join', (userId) => {
          socket.join(`user:${userId}`);
          logger.debug('User joined room', { userId, socketId: socket.id });
        });
        
        socket.on('disconnect', () => {
          logger.info('WebSocket client disconnected', { socketId: socket.id });
        });
      });
      
      wsAvailable = true;
      logger.info('WebSocket service initialized');
    }).catch((error) => {
      logger.warn('WebSocket not available (socket.io not installed)', {
        error: error.message,
      });
    });
  } catch (error) {
    logger.warn('WebSocket initialization failed', { error: error.message });
  }
}

/**
 * Emit event to user
 */
export function emitToUser(userId, event, data) {
  if (!wsAvailable || !io) {
    logger.debug('WebSocket not available, skipping notification', { userId, event });
    return;
  }
  
  try {
    io.to(`user:${userId}`).emit(event, data);
    logger.debug('WebSocket event emitted', { userId, event });
  } catch (error) {
    logger.warn('WebSocket emit error', { userId, event, error: error.message });
  }
}

/**
 * Emit content published notification
 */
export function notifyContentPublished(userId, content) {
  emitToUser(userId, 'content-published', {
    contentId: content.id,
    title: content.title,
    platforms: content.platforms,
    status: 'success',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit content failed notification
 */
export function notifyContentFailed(userId, content, error) {
  emitToUser(userId, 'content-failed', {
    contentId: content.id,
    title: content.title,
    platforms: content.platforms,
    error: error.message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Check if WebSocket is available
 */
export function isWebSocketAvailable() {
  return wsAvailable;
}
