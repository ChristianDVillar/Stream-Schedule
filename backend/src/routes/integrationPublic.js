/**
 * Public integration discovery for AkoeNet and other consumers (no auth).
 * GET /api/integration/akoenet — contract + version for wiring checks.
 */

import express from 'express';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedVersion;
function getPackageVersion() {
  if (cachedVersion) return cachedVersion;
  try {
    const pkgPath = path.join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    cachedVersion = pkg.version || 'unknown';
  } catch {
    cachedVersion = 'unknown';
  }
  return cachedVersion;
}

const router = express.Router();

const INTEGRATION_BODY = () => ({
  service: 'streamer-scheduler',
  version: getPackageVersion(),
  public_api: {
    events_json: 'GET /api/streamer/{username}/events',
    upcoming_alias: 'GET /api/streamer/{username}/upcoming',
    legacy_upcoming: 'GET /api/public/streamer/{username}/upcoming',
  },
  auth: 'Public endpoints above require no JWT. Optional: resolve username as Users.username (slug) or Twitch login if TWITCH_CLIENT_* set and account linked.',
  outbound_webhook_to_akoenet: {
    method: 'POST',
    path_on_akoenet_example: '/integrations/scheduler/webhooks/stream-scheduled',
    header: 'x-scheduler-webhook-secret',
    payload_fields: [
      'streamer',
      'scheduler_slug',
      'twitch_login',
      'title',
      'starts_at',
      'url',
      'platform',
      'channel_id',
    ],
  },
  health: {
    live: '/api/health/live',
    ready: '/api/health/ready',
    full: '/api/health',
  },
});

router.get('/akoenet', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json(INTEGRATION_BODY());
});

router.get('/', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json(INTEGRATION_BODY());
});

export default router;
