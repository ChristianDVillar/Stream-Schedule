/**
 * OpenAPI (Swagger) documentation for /api/webhooks endpoints.
 * Used by swagger-jsdoc. Auth: X-API-Key header or ?key=API_KEY (from Settings → Bots).
 *
 * @openapi
 * tags:
 *   - name: Webhooks
 *     description: Public API for chat bots (Nightbot, Streamer.bot, etc.). One API key for all.
 *
 * @openapi
 * /api/webhooks/stream/start:
 *   post:
 *     tags: [Webhooks]
 *     summary: Mark stream started
 *     description: |
 *       Records stream start; if user has Discord announce webhook configured, sends "🔴 Stream started!" to that channel.
 *       **Streamer.bot:** When going live → Run Action → HTTP Request POST to this URL, header X-API-Key or body { "apiKey": "YOUR_KEY" }.
 *       **Mix It Up:** Event "Stream Started" → Execute command → POST to this URL with API key in header.
 *     security: [{ apiKeyWebhook: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { note: { type: string, description: 'Optional message' } }
 *     responses:
 *       '200': { description: 'Stream start recorded' }
 *       '401': { description: 'Invalid or missing API key' }
 *
 * @openapi
 * /api/webhooks/nextstream:
 *   get:
 *     tags: [Webhooks]
 *     summary: Next scheduled stream (text)
 *     description: |
 *       Returns plain text for bot to say in chat. Use ?key=API_KEY or header X-API-Key.
 *       **Nightbot:** Custom command → Message: $(urlfetch https://your-api.com/api/webhooks/nextstream?key=YOUR_KEY)
 *       **Streamer.bot:** Action → HTTP Request → GET to this URL, add header X-API-Key or use ?key= in URL.
 *       **Mix It Up:** Command → Get URL → same URL with key in query.
 *     security: [{ apiKeyWebhook: [] }]
 *     parameters:
 *       - in: query
 *         name: key
 *         schema: { type: string }
 *         description: API key from Settings → Bots (alternative to X-API-Key header)
 *     responses:
 *       '200':
 *         description: 'e.g. "Next stream: Friday 20:00 — Minecraft"'
 *         content:
 *           text/plain:
 *             example: "Next stream: Friday 20:00 — Just Chatting"
 *       '401': { description: 'Invalid or missing API key' }
 *
 * @openapi
 * /api/webhooks/countdown:
 *   get:
 *     tags: [Webhooks]
 *     summary: Time until next stream (text)
 *     security: [{ apiKeyWebhook: [] }]
 *     responses:
 *       '200': { description: 'e.g. "Next stream in 2h 14m"' }
 *
 * @openapi
 * /api/webhooks/quote/add:
 *   get:
 *     tags: [Webhooks]
 *     summary: Add a quote (GET, for Nightbot)
 *     description: |
 *       Add a quote. Query params quote= or text=, and key= for API key.
 *       **Nightbot:** !quote add $(1) → Message: $(urlfetch https://your-api.com/api/webhooks/quote/add?quote=$(urlencode $(1))&key=YOUR_KEY)
 *     security: [{ apiKeyWebhook: [] }]
 *     parameters:
 *       - in: query
 *         name: quote
 *         schema: { type: string }
 *       - in: query
 *         name: key
 *         schema: { type: string }
 *     responses:
 *       '201': { description: 'Quote added (text/plain)' }
 *       '400': { description: 'Missing quote' }
 *       '401': { description: 'Invalid or missing API key' }
 *   post:
 *     tags: [Webhooks]
 *     summary: Add a quote (POST)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { quote: { type: string }, text: { type: string } }
 *     security: [{ apiKeyWebhook: [] }]
 *     responses:
 *       '201': { description: 'Quote added' }
 *       '401': { description: 'Invalid or missing API key' }
 *
 * @openapi
 * /api/webhooks/idea/add:
 *   get:
 *     tags: [Webhooks]
 *     summary: Add stream idea (GET, for Nightbot)
 *     parameters:
 *       - in: query
 *         name: text
 *         schema: { type: string }
 *       - in: query
 *         name: key
 *         schema: { type: string }
 *     security: [{ apiKeyWebhook: [] }]
 *     responses:
 *       '201': { description: 'Idea saved (text/plain)' }
 *       '401': { description: 'Invalid or missing API key' }
 *   post:
 *     tags: [Webhooks]
 *     summary: Add stream idea (POST)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { text: { type: string } }
 *     security: [{ apiKeyWebhook: [] }]
 *     responses:
 *       '201': { description: 'Idea saved' }
 *
 * @openapi
 * /api/webhooks/goal:
 *   get:
 *     tags: [Webhooks]
 *     summary: Follower/sub goal (text)
 *     security: [{ apiKeyWebhook: [] }]
 *     responses:
 *       '200': { description: 'e.g. "Follower goal: 500. Current: 421"' }
 *
 * @openapi
 * /api/webhooks/commands:
 *   get:
 *     tags: [Webhooks]
 *     summary: List all commands (for !commands)
 *     security: [{ apiKeyWebhook: [] }]
 *     responses:
 *       '200': { description: 'Plain text list of available commands' }
 */

export const __webhooksOpenApi = true;
