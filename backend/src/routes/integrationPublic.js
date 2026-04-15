/**
 * Public integration discovery for AkoeNet and other consumers (no auth).
 * GET /api/integration/akoenet — contract + version for wiring checks.
 */

import express from 'express';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPublicAdminDashboardUrl, getPublicFrontendOrigin } from '../utils/publicFrontendUrl.js';

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
    discovery_on_akoenet_optional: {
      list_servers: 'GET {origin}/integrations/scheduler/servers (same header)',
      list_channels: 'GET {origin}/integrations/scheduler/servers/{serverId}/channels (same header)',
      note: 'Implemented by AkoeNet; Scheduler proxies via GET /api/akoenet/guilds and /api/akoenet/guilds/:id/channels',
    },
    payload_fields: [
      'webhook_event',
      'scheduler_content_type',
      'streamer',
      'scheduler_slug',
      'twitch_login',
      'title',
      'starts_at',
      'url',
      'platform',
      'channel_id',
      'thumbnail_url',
      'creator_name',
    ],
    webhook_event_values: {
      schedule: 'Streams/events from the calendar (starts_at, title, url, platform, scheduler_content_type event|stream)',
      twitch_clip: 'When a clip is auto-published and user enables akoenetSendClips (url, title, optional thumbnail_url, creator_name)',
    },
  },
  health: {
    live: '/api/health/live',
    ready: '/api/health/ready',
    full: '/api/health',
  },
  /** Browser URL for Scheduler admin (SPA). Not on api.* unless you proxy; prefer this for links from AkoeNet. */
  admin_dashboard_url: getPublicAdminDashboardUrl(),
  /** Browser URL for direct AkoeNet onboarding: redirects to login if needed, then opens platform auto-connect. */
  akoenet_connect_url: getPublicFrontendOrigin()
    ? `${getPublicFrontendOrigin().replace(/\/$/, '')}/akoenet/connect?slug={slug}`
    : null,
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
