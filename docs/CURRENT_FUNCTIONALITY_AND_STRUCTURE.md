# Current Functionality and Structure

This document is the **single technical reference** for **Streamer Scheduler** in this repository: product behavior, runtime architecture, repository layout, **admin dashboard** behavior, and **environment variables**. All examples use **non-secret placeholders** — never commit real keys, webhook URLs, tokens, or machine-specific paths.

---

## Version and scope

| Item | Value |
|------|--------|
| Package version | `2.3.0` (frontend and backend `package.json`) |
| Layout | Monorepo: `frontend/` (React), `backend/` (Node/Express), `docs/` |
| Databases | **PostgreSQL** when `DATABASE_URL` is set (e.g. Supabase); otherwise **SQLite** (`backend/database.sqlite`) |

---

## Runtime architecture (three processes)

Production-style deployments often run **three separate Node processes**; each loads the same codebase and `.env`.

| Process | Entry script | Role |
|---------|----------------|------|
| **API** | `backend/src/apiServer.js` → `bootstrap/api.js` | HTTP API, OAuth callbacks, webhooks, Socket.IO (overlays), uploads |
| **Worker** | `backend/src/workerServer.js` → `bootstrap/worker.js` | Publication queue, reminder delivery, async jobs (toggle with env flags) |
| **Scheduler** | `backend/src/schedulerServer.js` → `bootstrap/scheduler.js` | Time-based scheduling ticks, stream reminder job producer (toggle with env flags) |

**Feature flags (worker / scheduler)** — all default to enabled unless set to `false`:

- `ENABLE_PUBLICATION_WORKER`, `ENABLE_REMINDER_WORKER` (worker)
- `ENABLE_LEGACY_SCHEDULER`, `ENABLE_STREAM_REMINDER_WORKER` (scheduler)
- `ENABLE_STREAM_REMINDER_CRON` (API `app.js`: optional cron-style hook)

**Realtime:** `services/websocketService.js` supports optional **Redis** adapter for Socket.IO clustering; set `WS_REDIS_ADAPTER=false` to force single-node behavior.

---

## Product functionality (overview)

### Authentication and account

- Email/password and OAuth where configured: **Google**, **Twitch** (login + publishing), **Discord**, **X (Twitter) OAuth2**
- JWT sessions (`JWT_SECRET`, `JWT_EXPIRY`)
- License/trial model; **Stripe** checkout, customer portal, webhooks
- **Admin** area: see [Admin dashboard](#admin-dashboard) below

### Content and scheduling

- Content types including **events** (streams) with `scheduledFor`, platforms, templates
- Calendar UX, todos, stream timeline, suggestions, media gallery
- Publishing to connected platforms (Twitch schedule, Discord, X, YouTube, Instagram, etc.) via integrations and workers
- **Twitch** bits ingestion and dashboard + `/bits` page (`chronological` / `total`)

### Public streamer surface

- **`/streamer/:username`** — public schedule page
- **`/embed/streamer/:username`** — embeddable view
- **Public API** (no auth):
  - `GET /api/streamer/:username/events` — upcoming events + social hints + Twitch live status when possible
  - `GET /api/streamer/:username/upcoming` — same payload (alias for integrators, e.g. AkoeNet)
  - `GET /api/public/streamer/:username/upcoming` — legacy path
  - `POST /api/streamer/:username/remind` — email reminder signup
  - `POST /api/streamer/:username/suggest` — viewer suggestions

**Username resolution for public API:** `:username` is matched first to **`Users.username`** (public slug). If not found, the backend may resolve **Twitch login** via Helix `GET /users?login=...` and then **`Users.twitchId`**, when `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` are set and the account has Twitch linked.

### Overlays (OBS / browser sources)

- **`/overlay/:type`** — `nextstream`, `goal`, `week`, `quote`, `suggestions`, etc. (uses `REACT_APP_API_URL` for API base when built)
- **`/overlay/roulette`** — roulette wheel; Socket.IO updates

### Bots and chat tooling

- **Nightbot**, **Streamer.bot**, **Mix It Up**, **StreamElements**-style HTTP endpoints under `/api/webhooks/...` (API key from Settings → Bots)
- Text/plain responses for chat commands (`!nextstream`, `!schedule`, quotes, goals, etc.)
- Canonical **frontend** base URL for links comes from backend **`FRONTEND_URL`** / **`PUBLIC_FRONTEND_URL`** (and frontend `REACT_APP_*` variants for client-side URLs)

### AkoeNet integration (outbound)

- When an **event** is scheduled/updated, the backend can **POST** to AkoeNet’s `stream-scheduled` webhook
- **Per user:** Settings → Bots → AkoeNet (`akoenetWebhookUrl`, secret, optional `akoenetAnnounceChannelId` on `User`)
- **Global fallback env:** `AKOENET_SCHEDULER_WEBHOOK_URL`, `SCHEDULER_WEBHOOK_SECRET`, optional `SCHEDULER_ANNOUNCE_CHANNEL_ID`
- Payload includes `streamer` (Scheduler username), optional **`twitch_login`**, `title`, `starts_at`, `url`, `platform`, optional `channel_id`; header **`x-scheduler-webhook-secret`**

### Storage and uploads

- **Supabase** storage: backend `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`; frontend `REACT_APP_SUPABASE_URL` + `REACT_APP_SUPABASE_ANON_KEY` for client uploads/signing flows

### Other

- **Slack** OAuth (workspace connect)
- **Instagram** Graph (optional server env for insights/media)
- **Prometheus** metrics gate: `ENABLE_PROMETHEUS_METRICS=true`
- **Admin finance** UI gate: `ENABLE_ADMIN_FINANCE=false` to hide

---

## Admin dashboard

Single-page admin UI at **`/admin`**, implemented in `frontend/src/pages/AdminDashboard.js` (re-exported from `frontend/src/features/admin/pages/AdminDashboardPage.js`). HTTP calls use `frontend/src/features/admin/api.js`. Route guard: `AdminRoute` in `frontend/src/routes/routeGuards.js` (requires `user.isAdmin`). Non-admins see an access-denied screen; admins are blocked from the normal user dashboard by `UserRoute`. Logged-in root `/` sends admins to `/admin`. Sidebar section links live in `frontend/src/App.js`.

### Sections (`?section=`)

Default section is **`overview`** when the query param is omitted.

| `section` | Purpose |
|-----------|---------|
| `overview` | KPI cards, revenue summary, password-reminder banner, expiring-license notice; with admin finance: cost metrics |
| `users` | License catalog settings, trial-extension limits, create user, assigned licenses, expiring table, discount codes (if finance), full user table + actions |
| `support` | Support inbox, filters, unread badge, message modal (reply, status, resolve, etc.) |
| `notifications` | Broadcast / targeted notifications form |
| `platforms` | Global enable/disable of publishing platforms (`PUT` platform config) |
| `payments` | Revenue charts, monthly table, paginated payments + export; with finance: fixed costs, USD→EUR for PDF invoices |
| `alerts` | Discord webhook URLs, alert toggle, queue/DB thresholds, test sends (menu item only if finance enabled) |

### Feature flags: `GET /api/admin/features`

Authenticated admins call **`GET /api/admin/features`** (`backend/src/app.js`). Response fields:

- **`adminFinance`**: mirrors **`ENABLE_ADMIN_FINANCE`** (default on; set `false` to disable fixed costs, discount codes UI, cost metrics, alerts UI/payments finance blocks).
- **`prometheusMetrics`**: mirrors **`ENABLE_PROMETHEUS_METRICS`** (returned for future use; no dedicated admin UI yet).

On fetch failure the UI assumes finance off to avoid broken panels.

**AkoeNet:** el Scheduler no incluye paneles de administración de AkoeNet. La integración es webhooks salientes y API pública; la configuración por usuario está en **Ajustes → Bots → AkoeNet**.

### User administration (summary)

Per-user actions include: assign trial, generate licenses (monthly / quarterly / lifetime), change license type, change email, password-reset email, disable/enable account, delete (not self), extend trial (1–7 days, subject to `maxTrialExtensionsPerUser`). Row click opens a detail modal. Badges in the table summarize linked providers (Google, Twitch, Discord, email, X).

### Security notes for docs and env

- Do not paste real **Discord webhook URLs**, **Stripe keys**, **JWTs**, or **database passwords** into documentation or commits.
- Webhook URLs embed secrets in the path; treat them like passwords.

---

## Repository structure (high level)

### Root

```
streamer-scheduler/
├── backend/          # API, worker, scheduler, Sequelize models, routes, jobs
├── frontend/         # Create React App, features/* + pages, shared client
└── docs/             # This file, guides, legal, architecture notes
```

### Backend (`backend/src`)

| Area | Path | Notes |
|------|------|--------|
| Entrypoints | `apiServer.js`, `workerServer.js`, `schedulerServer.js` | Thin wrappers |
| Bootstrap | `bootstrap/api.js`, `worker.js`, `scheduler.js` | Wire services |
| HTTP app | `app.js` | Express, CORS, routes, metrics |
| Routes | `routes/` | REST + OAuth + webhooks + cron |
| Domain modules | `modules/*` | `users`, `content`, `integrations`, `payments`, `system`, `reminders`, `streamerPublic`, etc. |
| Legacy assembly | `models/index.js` | Associations + re-exports |
| Infra | `middleware/`, `utils/`, `validators/`, `config/` | Auth, DB, crypto, logger |
| Scripts | `scripts/` | migrations runner, smoke baseline, createAdmin, etc. |

### Frontend (`frontend/src`)

| Area | Path | Notes |
|------|------|--------|
| Routes | `routes/AppRoutes.js`, `routeGuards.js` | Public + authenticated routes |
| Feature APIs | `features/*/api.js` | Preferred HTTP layer from UI |
| Shared HTTP | `shared/api/client.js` | Base URL from `REACT_APP_API_URL` |
| Public URL helper | `shared/config/publicUrls.js` | Canonical frontend origin |
| Pages | `features/app/pages/*`, `features/marketing/*`, `pages/Overlay*.js` | Dashboard, settings, overlays |
| UI | `components/`, `contexts/`, `locales/` | i18n EN/ES |

### Documentation (`docs/`)

- Index: `docs/README.md` — start here; links to guides, integration, and this file
- **Product + architecture + env + admin:** `docs/CURRENT_FUNCTIONALITY_AND_STRUCTURE.md` (this document)
- Architecture history: `docs/architecture-boundaries.md`, `docs/migration-notes-deep-reorg.md`, `docs/migration-changelog.md`
- Legal: `docs/legal/`

### Guardrails

- Backend: `npm run check:architecture` — model import rules (`scripts/check-model-imports.js`)
- Backend: `npm run smoke:baseline` — structure smoke (`scripts/smokeStructureBaseline.js`)
- Frontend: `npm run check:architecture` — forbids legacy global `api` import patterns (`scripts/check-api-imports.js`)

---

## Environment variables

**Copy from `backend/.env.example` and `frontend/.env.example`.** Values below are **illustrative placeholders** only.

### Backend — core

```env
# Runtime
NODE_ENV=development
PORT=5000

# URLs (OAuth redirects, emails, Stripe return URLs, CORS)
FRONTEND_URL=http://localhost:3000
# Optional: comma-separated for multiple SPA origins
# FRONTEND_URLS=https://app.example.com,https://www.example.com
PUBLIC_FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# Auth
JWT_SECRET=change-me-use-long-random-string-in-production
JWT_EXPIRY=7d
TOKEN_ENCRYPTION_KEY=optional-separate-key-for-oauth-token-encryption
```

### Backend — database

```env
# PostgreSQL (production / Supabase). Omit for local SQLite.
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
DATABASE_SSL=true
DB_POOL_MAX=5
DB_POOL_ACQUIRE_MS=30000

# Local SQLite override path (optional; use your machine path, never commit it)
# SQLITE_STORAGE=/path/to/backend/database.sqlite
```

### Backend — OAuth and platforms

```env
# Google (login + YouTube OAuth uses same Google app)
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# Twitch (login, Helix, EventSub, schedule)
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
# Optional: force OAuth callback host (default BACKEND_URL)
# TWITCH_OAUTH_REDIRECT_BASE_URL=https://api.example.com

# Discord (user login + bot for channels/posts)
DISCORD_CLIENT_ID=1234567890123456789
DISCORD_CLIENT_SECRET=discord_oauth_secret_example
DISCORD_BOT_TOKEN=Bot_token_used_only_on_server

# X / Twitter OAuth2 (prefer TWITTER_* or X_* pairs)
TWITTER_OAUTH2_CLIENT_ID=your_x_client_id
TWITTER_OAUTH2_CLIENT_SECRET=your_x_client_secret
# Token refresh path may also read TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET

# YouTube redirect override (optional)
# YOUTUBE_REDIRECT_URI=https://api.example.com/api/youtube/callback

# Slack (Settings → Connect Slack)
SLACK_CLIENT_ID=1234567890123.1234567890123
SLACK_CLIENT_SECRET=slack_signing_secret_example
```

### Backend — Stripe

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
# STRIPE_TAX_ENABLED=false
```

### Backend — Supabase (server-side storage)

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### Backend — Redis (optional: Socket.IO adapter, queues)

```env
# REDIS_URL=redis://default:password@redis.example.com:6379
# Or dev-style:
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
WS_REDIS_ADAPTER=true
REDIS_MONTHLY_COST_EUR=0
```

### Backend — AkoeNet webhook (global fallback)

```env
# Per-user URL in DB overrides this when set
# AKOENET_SCHEDULER_WEBHOOK_URL=https://community.example.com/integrations/scheduler/webhooks/stream-scheduled
# SCHEDULER_WEBHOOK_SECRET=shared_secret_matching_akoenet
# SCHEDULER_ANNOUNCE_CHANNEL_ID=12345
```

### Backend — CORS for external apps (optional)

If a browser (e.g. AkoeNet SPA) calls this API **directly**, add its Origin(s). Server-side proxy from AkoeNet backend does **not** need this.

```env
# INTEGRATION_CORS_ORIGINS=https://akonet.example.com,http://localhost:5173
```

Discovery (no auth): `GET /api/integration/akoenet` — see `docs/AKOENET_CONTRACT.md`.

### Backend — Instagram Graph (optional server-side)

```env
# INSTAGRAM_BUSINESS_ACCOUNT_ID=17841400000000000
# INSTAGRAM_PAGE_ACCESS_TOKEN=long_lived_page_token
# FACEBOOK_GRAPH_API_VERSION=v25.0
# INSTAGRAM_INSIGHTS_METRICS=impressions,reach,engagement,saved
```

### Backend — email, logging, ops

```env
# Resend (https://resend.com) — set RESEND_API_KEY when EMAIL_ENABLED=true
EMAIL_ENABLED=false
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=StreamAutomator <no-reply@streamautomator.com>
ENABLE_LOGGING=true
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
ENABLE_ADMIN_FINANCE=true
ENABLE_PROMETHEUS_METRICS=false

# Cron HTTP protection (if you expose cron routes)
CRON_SECRET=long_random_shared_secret
# INTERNAL_CRON_SECRET=alias_of_above

# Alerts (optional Discord webhooks for ops — use env only; rotate if a URL leaks)
DISCORD_DEV_WEBHOOK=https://discord.com/api/webhooks/<id>/<token>
DISCORD_STATUS_WEBHOOK=https://discord.com/api/webhooks/<id>/<token>
```

### Backend — media / scheduler tuning

```env
SCHEDULER_INTERVAL_MS=60000
COMPRESS_VIDEO_TIMEOUT_MS=600000
USE_FFMPEG_NATIVE_ONLY=true
```

### Backend — one-off scripts (not for production server)

```env
# npm run script:create-admin style usage
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe123!

# resetPassword script
RESET_EMAIL=user@example.com
RESET_PASSWORD=NewPassword123!
```

### Frontend (`frontend/.env`)

All public vars **must** be prefixed with `REACT_APP_`.

```env
# API base (required for local dev against separate backend)
REACT_APP_API_URL=http://localhost:5000

# Optional: same as API or dedicated backend host for OAuth start URLs
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_TWITCH_OAUTH_BASE_URL=http://localhost:5000

# Canonical public site (production); used for shared links / redirects in client
# REACT_APP_FRONTEND_URL=https://app.example.com
# REACT_APP_PUBLIC_FRONTEND_URL=https://www.example.com

# Supabase (browser uploads)
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe publishable key (checkout in browser)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxx

# Optional UI
REACT_APP_SHOW_PWA_INSTALL=false
# REACT_APP_HEADER_BANNERS=[{"id":"welcome","text":"Welcome!","textEs":"Bienvenido","style":"info","dismissible":true}]

# Build-only
# DISABLE_ESLINT_PLUGIN=true
```

---

## Operational commands

### Backend (`backend/`)

| Command | Purpose |
|---------|---------|
| `npm run start:api` | API server |
| `npm run start:worker` | Worker |
| `npm run start:scheduler` | Scheduler process |
| `npm run migrate` | Run Sequelize migrations |
| `npm run migrate:status` | Migration status |
| `npm test` | Vitest |
| `npm run check:architecture` | Import guardrails |
| `npm run smoke:baseline` | Structure smoke |

### Frontend (`frontend/`)

| Command | Purpose |
|---------|---------|
| `npm start` | Dev server (port 3000 default) |
| `npm run build` | Production build |
| `npm test` | Tests |
| `npm run check:architecture` | Import guardrails |

---

## Notes for maintainers

- Prefer **feature APIs** (`features/*/api.js`) and `shared/api/client.js` on the frontend; do not reintroduce a monolithic `api.js`.
- Keep route handlers thin; domain logic belongs in `modules/*/application` and `services/`.
- In production, require strong **`JWT_SECRET`**, **`DATABASE_URL`**, and **`DATABASE_SSL=true`** (see `config/database.js`).
- Align **`FRONTEND_URL`** / **`BACKEND_URL`** with the real deployed hosts so OAuth and Stripe redirects succeed.

## Migration / cleanup status

Prior roadmap items (splitting APIs, module barrels, bootstrap entrypoints, CI architecture checks) are largely **done**; see `docs/migration-changelog.md` for batch history. Remaining work is incremental refactors, not blocking for daily development.

## Related documentation

- **Conexión con AkoeNet (resumen):** [`docs/AKOENET_CONNECTION.md`](./AKOENET_CONNECTION.md)
- **AkoeNet ↔ Streamer Scheduler (guía detallada, URLs, diagnóstico):** [`docs/AKOENET_SCHEDULER_INTEGRATION.md`](./AKOENET_SCHEDULER_INTEGRATION.md)
- **Contrato compartido (payload, variables):** [`docs/AKOENET_CONTRACT.md`](./AKOENET_CONTRACT.md)

---

*Last updated: March 2026 — aligns with Streamer Scheduler ~v2.3.0. Admin dashboard documentation lives in this file (unified with the former `ADMIN_DASHBOARD.md`).*
