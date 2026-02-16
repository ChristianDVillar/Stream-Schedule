/**
 * Admin Platform Configuration Routes
 * Manage which platforms are enabled/disabled globally
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import platformConfigService from '../../services/platformConfigService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// All routes require admin
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/platforms/config
 * Get current platform configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = await platformConfigService.getPlatformConfig();
    res.json({ platforms: config });
  } catch (error) {
    logger.error('Error getting platform config', { error: error.message });
    res.status(500).json({ error: 'Failed to get platform configuration' });
  }
});

/**
 * PUT /api/admin/platforms/config
 * Update platform configuration
 * Body: { platforms: ['twitch', 'twitter', 'discord', 'youtube'] }
 */
router.put('/config', async (req, res) => {
  try {
    const { platforms } = req.body;
    
    if (!Array.isArray(platforms)) {
      return res.status(400).json({ error: 'Platforms must be an array' });
    }

    const enabled = await platformConfigService.setEnabledPlatforms(platforms);
    res.json({ 
      message: 'Platform configuration updated',
      platforms: enabled
    });
  } catch (error) {
    logger.error('Error updating platform config', { 
      error: error.message,
      userId: req.user.id
    });
    res.status(400).json({ error: error.message || 'Failed to update platform configuration' });
  }
});

export default router;
