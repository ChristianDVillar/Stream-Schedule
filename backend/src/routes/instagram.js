/**
 * Instagram Business (Graph API) — token stays on server.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  isInstagramGraphConfigured,
  getInstagramAccountInfo,
  getInstagramRecentMedia,
  getInstagramMediaInsights,
  logInstagramConfigError,
} from '../modules/integrations/application/instagramGraphService.js';

const router = express.Router();

router.get('/account', requireAuth, async (req, res) => {
  if (!isInstagramGraphConfigured()) {
    return res.status(503).json({
      error: 'Instagram Graph API is not configured on the server',
      code: 'instagram_not_configured',
    });
  }
  try {
    const account = await getInstagramAccountInfo();
    res.json(account);
  } catch (err) {
    logInstagramConfigError(err);
    const status = err.statusCode || 502;
    res.status(status).json({
      error: err.message || 'Failed to load Instagram account',
      code: err.graphError?.code,
      details: process.env.NODE_ENV === 'development' ? err.graphError : undefined,
    });
  }
});

router.get('/posts', requireAuth, async (req, res) => {
  if (!isInstagramGraphConfigured()) {
    return res.status(503).json({
      error: 'Instagram Graph API is not configured on the server',
      code: 'instagram_not_configured',
    });
  }
  try {
    const posts = await getInstagramRecentMedia(req.query.limit);
    res.json({ data: posts });
  } catch (err) {
    logInstagramConfigError(err);
    const status = err.statusCode || 502;
    res.status(status).json({
      error: err.message || 'Failed to load Instagram media',
      code: err.graphError?.code,
      details: process.env.NODE_ENV === 'development' ? err.graphError : undefined,
    });
  }
});

router.get('/posts/:mediaId/insights', requireAuth, async (req, res) => {
  if (!isInstagramGraphConfigured()) {
    return res.status(503).json({
      error: 'Instagram Graph API is not configured on the server',
      code: 'instagram_not_configured',
    });
  }
  const { mediaId } = req.params;
  if (!mediaId || !/^\d+$/.test(String(mediaId))) {
    return res.status(400).json({ error: 'Invalid media id' });
  }
  try {
    const insights = await getInstagramMediaInsights(mediaId);
    res.json(insights);
  } catch (err) {
    logInstagramConfigError(err);
    const status = err.statusCode || 502;
    res.status(status).json({
      error: err.message || 'Failed to load media insights',
      code: err.graphError?.code,
      details: process.env.NODE_ENV === 'development' ? err.graphError : undefined,
    });
  }
});

export default router;
