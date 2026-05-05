/**
 * Roulette (spin wheel) service - in-memory store per user.
 */

import logger from '../../../utils/logger.js';

const playersByUser = new Map();
const MAX_PLAYERS = 500;

function getPlayers(userId) {
  if (!playersByUser.has(userId)) {
    playersByUser.set(userId, []);
  }
  return playersByUser.get(userId);
}

export function join(userId, username) {
  const name = typeof username === 'string' ? username.trim() : '';
  if (!name) return { added: false, players: getPlayers(userId).slice() };

  const players = getPlayers(userId);
  const normalized = name.toLowerCase();
  if (players.some((p) => p.toLowerCase() === normalized)) {
    return { added: false, players: players.slice() };
  }
  if (players.length >= MAX_PLAYERS) {
    logger.warn('Roulette max players reached', { userId, max: MAX_PLAYERS });
    return { added: false, players: players.slice() };
  }
  players.push(name);
  logger.debug('Roulette join', { userId, username: name, total: players.length });
  return { added: true, players: players.slice() };
}

export function leave(userId, username) {
  const name = typeof username === 'string' ? username.trim() : '';
  if (!name) return { removed: false, players: getPlayers(userId).slice() };

  const players = getPlayers(userId);
  const normalized = name.toLowerCase();
  const idx = players.findIndex((p) => p.toLowerCase() === normalized);
  if (idx === -1) return { removed: false, players: players.slice() };
  players.splice(idx, 1);
  logger.debug('Roulette leave', { userId, username: name });
  return { removed: true, players: players.slice() };
}

export function reset(userId) {
  const players = getPlayers(userId);
  players.length = 0;
  logger.debug('Roulette reset', { userId });
  return [];
}

export function getState(userId) {
  return getPlayers(userId).slice();
}

export function spin(userId) {
  const players = getPlayers(userId);
  if (players.length === 0) return null;
  const winner = players[Math.floor(Math.random() * players.length)];
  logger.info('Roulette spin', { userId, winner, total: players.length });
  return { winner, players: players.slice() };
}

export default {
  join,
  leave,
  reset,
  getState,
  spin,
};

