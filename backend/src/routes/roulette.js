/**
 * Roulette (spin wheel) API – streamer controls and state
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import rouletteService from '../modules/content/application/rouletteService.js';
import { emitRouletteToUser } from '../services/websocketService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/** GET /api/roulette/state – current players (for overlay initial load / dashboard) */
router.get('/state', requireAuth, (req, res) => {
  try {
    const players = rouletteService.getState(req.user.id);
    res.json({ players });
  } catch (error) {
    logger.error('Roulette state error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get roulette state' });
  }
});

/** POST /api/roulette/join – add a viewer (e.g. from dashboard); body: { username } */
router.post('/join', requireAuth, (req, res) => {
  try {
    const username = req.body?.username?.trim();
    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }
    const { added, players } = rouletteService.join(req.user.id, username);
    emitRouletteToUser(req.user.id, 'roulette_players', { players });
    res.json({ added, players });
  } catch (error) {
    logger.error('Roulette join error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to join roulette' });
  }
});

/** POST /api/roulette/leave – remove a viewer; body: { username } */
router.post('/leave', requireAuth, (req, res) => {
  try {
    const username = req.body?.username?.trim();
    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }
    const { removed, players } = rouletteService.leave(req.user.id, username);
    emitRouletteToUser(req.user.id, 'roulette_players', { players });
    res.json({ removed, players });
  } catch (error) {
    logger.error('Roulette leave error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to leave roulette' });
  }
});

/** POST /api/roulette/reset – clear all players (streamer only) */
router.post('/reset', requireAuth, (req, res) => {
  try {
    const players = rouletteService.reset(req.user.id);
    emitRouletteToUser(req.user.id, 'roulette_players', { players: [] });
    res.json({ players: [] });
  } catch (error) {
    logger.error('Roulette reset error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to reset roulette' });
  }
});

/** POST /api/roulette/spin – pick winner and notify overlay (streamer only) */
router.post('/spin', requireAuth, (req, res) => {
  try {
    const result = rouletteService.spin(req.user.id);
    if (!result) {
      return res.status(400).json({ error: 'No players in the wheel. Use !join in chat first.' });
    }
    emitRouletteToUser(req.user.id, 'roulette_spin', {
      players: result.players,
      winner: result.winner,
    });
    res.json({ winner: result.winner, players: result.players });
  } catch (error) {
    logger.error('Roulette spin error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to spin roulette' });
  }
});

export default router;
