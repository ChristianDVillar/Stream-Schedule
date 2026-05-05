/**
 * WebSocket Client (Socket.IO)
 * Real-time notifications
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 * 
 * Note: Requires socket.io-client. Install: npm install socket.io-client
 */

import { io as socketIO } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

let socket = null;

/**
 * Initialize WebSocket connection
 */
export function initWebSocket(userId, token) {
  if (socket?.connected) {
    return socket;
  }
  
  try {
    socket = socketIO(API_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });
    
    socket.on('connect', () => {
      if (userId) {
        socket.emit('join', userId);
      }
    });
    
    socket.on('disconnect', () => {
    });
    
    socket.on('error', (error) => {
    });
    
    return socket;
  } catch (error) {
    return null;
  }
}

/**
 * Disconnect WebSocket
 */
export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to content published events
 */
export function onContentPublished(callback) {
  if (!socket) return () => {};
  
  socket.on('content-published', callback);
  
  return () => {
    socket.off('content-published', callback);
  };
}

/**
 * Subscribe to content failed events
 */
export function onContentFailed(callback) {
  if (!socket) return () => {};
  
  socket.on('content-failed', callback);
  
  return () => {
    socket.off('content-failed', callback);
  };
}

export { socket };
