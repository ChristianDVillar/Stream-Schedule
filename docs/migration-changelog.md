# Migration Changelog

## 2026-03 (Frontend legacy global `api.js` removal)

- Scope: frontend.
- Deleted `frontend/src/api.js` entirely; transport remains `shared/api/client.js`, domain calls via `features/*/api.js`.
- Guardrail `frontend/scripts/check-api-imports.js` now exits with failure if `src/api.js` reappears, in addition to blocking legacy import patterns.
- Validation run:
  - `npm run check:architecture`
  - `npm test -- --watchAll=false`

## 2026-03 (Realtime + reminders ownership batch)

- Scope: backend.
- Moved reminder orchestrator ownership fully under reminders module:
  - canonical: `backend/src/modules/reminders/application/jobs/reminderOrchestrator.js`
  - compatibility re-export kept in `backend/src/jobs/reminders/reminderOrchestrator.js`
- Updated consumers to use module-owned reminder orchestrator path (`routes/cron.js`, `bootstrap/scheduler.js`).
- Added Redis pub/sub scaling path for Socket.IO in `backend/src/services/websocketService.js` (auto-fallback to in-process adapter if Redis/adapter is unavailable).
- Added optional dependency: `@socket.io/redis-adapter`.
- Validation run:
  - `npm run check:architecture`
  - `npm run smoke:baseline`

## 2026-03 (Frontend legacy API bridge minimization)

- Scope: frontend.
- Reduced `frontend/src/api.js` to transport-only compatibility bridge (`apiClient`, `API_BASE_URL`), removing domain API re-exports.
- Hardened architecture guardrail (`frontend/scripts/check-api-imports.js`) to block legacy imports via:
  - relative `../api` and `../api.js`
  - absolute-like `/src/api` paths
- Validation run:
  - `npm run check:architecture`
  - `npm test -- --watchAll=false`

## 2026-03 (Service-to-module migration batch)

- Scope: backend.
- Moved domain services to module application layer:
  - `content` workflows in `modules/content/application/*`
  - `schedulerProducer` in `modules/content/application/schedulerProducer.js`
  - `scheduler` implementation moved to `modules/content/application/scheduler.js` (legacy service kept as compatibility shim)
  - `rouletteService` in `modules/content/application/rouletteService.js`
  - `twitchService` in `modules/integrations/application/twitchService.js`
  - `integrationTokenService` in `modules/integrations/application/integrationTokenService.js`
  - `platformPublisher` in `modules/integrations/application/platformPublisher.js`
  - `publicationWorker` in `modules/integrations/application/publicationWorker.js`
  - `slackWorkspaceService` in `modules/integrations/application/slackWorkspaceService.js`
  - `instagramGraphService` in `modules/integrations/application/instagramGraphService.js`
  - `platformConfigService` in `modules/system/application/platformConfigService.js`
  - `featureFlagService` in `modules/system/application/featureFlagService.js`
  - `entitlementService` in `modules/system/application/entitlementService.js`
  - `publicationMetricService` in `modules/system/application/publicationMetricService.js`
  - `alertService` in `modules/system/application/alertService.js`
  - `idempotencyService` in `modules/system/application/idempotencyService.js`
  - `rateLimitService` in `modules/system/application/rateLimitService.js`
- Updated route/service consumers to import module application services directly.
- Kept compatibility shims in `backend/src/services/` for incremental migration safety.
- Closed backend "domain logic in services" migration item; remaining `services/*` files are infrastructure/operational adapters (queues, websocket, cache, gateway sync) and startup-compatible shims.
- Added explicit bootstrap composition for process entrypoints:
  - `backend/src/bootstrap/api.js`
  - `backend/src/bootstrap/worker.js`
  - `backend/src/bootstrap/scheduler.js`
- Converted `apiServer.js`, `workerServer.js`, and `schedulerServer.js` into thin wrappers over `bootstrap/*`.
- Validation run:
  - `npm run check:architecture`
  - `npm run smoke:baseline`

## 2026-03 (Frontend route/pages consolidation batch)

- Scope: frontend.
- Moved route-level page imports to feature-first wrappers under `frontend/src/features/*/pages/*`.
- Consolidated routing imports to avoid mixed legacy `pages/*` and feature `features/*/pages/*` paths.
- Added focused wrapper API tests:
  - `frontend/src/features/content/api.test.js`
  - `frontend/src/features/publicStream/api.test.js`
  - `frontend/src/features/twitchBits/api.test.js`
- Updated architecture guardrail script to skip `*.test.js` files (prevents false positives on local `./api` test imports).
- Validation run:
  - `npm run check:architecture`
  - `npm test -- --watchAll=false`

## 2026-03 (Architecture hardening wave)

- Added architecture guardrails:
  - frontend: `npm run check:architecture` (forbidden direct `src/api` imports outside bridges)
  - backend: `npm run check:architecture` (forbidden direct `models/index.js` imports outside infrastructure)
- Added backend safety baseline smoke:
  - `npm run smoke:baseline`
- Migrated major frontend pages/components to feature API slices:
  - auth, messaging, content, uploads, account, payments, admin, scheduler, discord, integrations, public stream, twitch bits
- Migrated backend routes/services/middleware/scripts away from direct model imports into module infrastructure barrels.
- Introduced reminders domain/application split and kept jobs compatibility entrypoint.
- Standardized canonical public frontend domain handling for links/redirects with `streamautomator.com` fallback in production.

## Change log policy

- Add one short entry per architecture migration batch.
- Include:
  - scope (frontend/backend/cross-cutting)
  - guardrails added/updated
  - compatibility layers added/removed
  - validation commands run

