/**
 * AkoeNet admin proxy router — no DB; mock admin auth.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import akoenetProxyRouter from '../src/routes/admin/akoenetProxy.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/akoenet', (req, res, next) => {
    req.user = { id: 1, isAdmin: true };
    next();
  }, akoenetProxyRouter);
  return app;
}

describe('akoenetProxyRouter', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = createApp();
    await new Promise((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
    });
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://127.0.0.1:${port}/api/admin/akoenet`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });

  it('GET /status returns JSON with configured flags (no AkoeNet call)', async () => {
    const r = await fetch(`${baseUrl}/status`);
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j).toHaveProperty('configured');
    expect(j).toHaveProperty('hasBearer');
    expect(j).toHaveProperty('apiBaseUrl');
    expect(typeof j.configured).toBe('boolean');
  });
});
