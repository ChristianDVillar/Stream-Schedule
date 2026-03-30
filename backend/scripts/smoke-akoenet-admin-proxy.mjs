/**
 * Smoke test: Scheduler AkoeNet admin proxy
 * - Without token: expect 401 on GET /api/admin/akoenet/status
 * - With SCHEDULER_ADMIN_TOKEN (Scheduler admin JWT): expect 200 + JSON from /status
 * - Optional: if proxy configured, GET /api/admin/akoenet/metrics
 *
 * Usage (from backend/):
 *   node scripts/smoke-akoenet-admin-proxy.mjs
 *   SCHEDULER_URL=http://localhost:5000 SCHEDULER_ADMIN_TOKEN=eyJ... node scripts/smoke-akoenet-admin-proxy.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BASE = (process.env.SCHEDULER_URL || 'http://localhost:5000').replace(/\/$/, '');
const TOKEN = process.env.SCHEDULER_ADMIN_TOKEN || '';

async function main() {
  const url = `${BASE}/api/admin/akoenet/status`;
  console.log(`[1] GET ${url} (no Authorization)`);
  const r1 = await fetch(url);
  const t1 = await r1.text();
  console.log(`    HTTP ${r1.status}`, t1.slice(0, 200));
  if (r1.status === 404) {
    console.error(
      '    FAIL: 404 — el proceso en SCHEDULER_URL no expone esta ruta (API desactualizada o otro servicio). Reinicia el backend de Streamer Scheduler con el código actual (incluye routes/admin/akoenetProxy.js).'
    );
    process.exitCode = 1;
    return;
  }
  if (r1.status !== 401 && r1.status !== 403) {
    console.error('    FAIL: expected 401 or 403 without token (got ' + r1.status + ')');
    process.exitCode = 1;
    return;
  }
  console.log('    OK (auth required)\n');

  if (!TOKEN) {
    console.log('[2] Skip authenticated checks (set SCHEDULER_ADMIN_TOKEN=... for full smoke)');
    console.log('    Done.');
    return;
  }

  console.log(`[2] GET ${url} (with Scheduler admin Bearer)`);
  const r2 = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const j2 = await r2.json().catch(() => ({}));
  console.log(`    HTTP ${r2.status}`, JSON.stringify(j2));
  if (r2.status !== 200) {
    console.error('    FAIL: expected 200 with valid admin token');
    process.exitCode = 1;
    return;
  }
  if (typeof j2.configured !== 'boolean') {
    console.error('    FAIL: body should include configured boolean');
    process.exitCode = 1;
    return;
  }
  console.log('    OK\n');

  if (!j2.configured) {
    console.log('[3] Proxy not configured (AKOENET_API_URL / AKOENET_ADMIN_BEARER). Skip /metrics.');
    return;
  }

  const mUrl = `${BASE}/api/admin/akoenet/metrics`;
  console.log(`[3] GET ${mUrl}`);
  const r3 = await fetch(mUrl, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const t3 = await r3.text();
  console.log(`    HTTP ${r3.status}`, t3.slice(0, 300));
  if (r3.status !== 200) {
    console.error('    WARN: metrics did not return 200 (AkoeNet down or invalid bearer?)');
    process.exitCode = 1;
    return;
  }
  console.log('    OK');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
