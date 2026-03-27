/**
 * WebSocket Service (Socket.IO)
 * Real-time notifications for content publishing + roulette overlay
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 *
 * Note: Requires socket.io. Install: npm install socket.io
 */

import logger from '../utils/logger.js';
import { User } from '../modules/users/infrastructure/models.js';
import { getRedis } from '../utils/redisConnection.js';

let io = null;
let rouletteNs = null;
let wsAvailable = false;
let wsPubSubEnabled = false;

async function configureRedisPubSubAdapter(socketServer) {
  if (process.env.WS_REDIS_ADAPTER === 'false') {
    return false;
  }
  try {
    const redisClient = await getRedis();
    if (!redisClient || typeof redisClient.duplicate !== 'function') {
      return false;
    }
    const [{ createAdapter }] = await Promise.all([
      import('@socket.io/redis-adapter'),
    ]);
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    socketServer.adapter(createAdapter(pubClient, subClient));
    wsPubSubEnabled = true;
    logger.info('WebSocket Redis pub/sub adapter enabled');
    return true;
  } catch (error) {
    logger.warn('WebSocket Redis pub/sub adapter unavailable, using in-process adapter', {
      error: error.message,
    });
    return false;
  }
}

/**
 * Initialize WebSocket server (main app + roulette namespace for overlay).
 * Must await this before handling traffic: emits are no-ops until setup completes (was previously racy via .then()).
 */
export async function initWebSocket(server) {
  try {
    const { Server } = await import('socket.io');
    io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
      },
    });
    await configureRedisPubSubAdapter(io);

    io.on('connection', (socket) => {
      logger.info('WebSocket client connected', { socketId: socket.id });
      socket.on('join', (userId) => {
        socket.join(`user:${userId}`);
        logger.debug('User joined room', { userId, socketId: socket.id });
      });
      socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', { socketId: socket.id });
      });
    });

    // Roulette overlay: connect with ?key=API_KEY; server joins socket to user room and sends initial state
    rouletteNs = io.of('/roulette');
    rouletteNs.on('connection', async (socket) => {
      const key = (socket.handshake.query?.key || socket.handshake.auth?.key || '').trim();
      if (!key) {
        logger.debug('Roulette overlay connection without key');
        socket.disconnect(true);
        return;
      }
      try {
        const user = await User.findOne({
          where: { nightbotApiKey: key },
          attributes: ['id'],
        });
        if (!user) {
          socket.disconnect(true);
          return;
        }
        socket.join(`user:${user.id}`);
        socket.userId = user.id;
        const rouletteService = (await import('./rouletteService.js')).default;
        const players = rouletteService.getState(user.id);
        socket.emit('roulette_players', { players });
        logger.debug('Roulette overlay joined room', { userId: user.id, socketId: socket.id, playersCount: players.length });
      } catch (err) {
        logger.warn('Roulette overlay auth failed', { error: err.message });
        socket.disconnect(true);
      }
      socket.on('disconnect', () => {});
    });

    wsAvailable = true;
    logger.info('WebSocket service initialized (main + roulette)');
  } catch (error) {
    logger.warn('WebSocket not available (socket.io not installed)', { error: error.message });
  }
}

/**
 * Emit to roulette overlay clients for a given user (room user:userId in /roulette namespace)
 */
export function emitRouletteToUser(userId, event, data) {
  if (!wsAvailable || !rouletteNs) {
    logger.debug('Roulette WebSocket not available', { userId, event });
    return;
  }
  try {
    rouletteNs.to(`user:${userId}`).emit(event, data);
    logger.debug('Roulette event emitted', { userId, event });
  } catch (error) {
    logger.warn('Roulette emit error', { userId, event, error: error.message });
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

export function isWebSocketPubSubEnabled() {
  return wsPubSubEnabled;
}
