# Architecture Boundaries

## Frontend
- `shared/` contains cross-feature utilities and low-level API client wrappers.
- `features/*/api.js` is the preferred API access point for feature pages/components.
- Route-level components should progressively migrate from `src/pages/*` into `features/*/pages/*`.

## Backend
- `routes/` should only handle HTTP concerns (validation/auth/response mapping).
- Reminder orchestration now lives in `jobs/reminders/reminderOrchestrator.js`.
- `platform/db/` provides transitional DB access points (`sequelize`) for entrypoints.
- Module-local model barrels under `modules/*/infrastructure/models.js` are temporary compatibility layers during model decomposition.

## Guardrails
- New business rules should go into services/jobs, not route files.
- New feature APIs in frontend should avoid importing the global `api.js` directly from route-level pages.
- Keep transitional barrels until all consumers are migrated, then remove legacy imports in one cleanup pass.

