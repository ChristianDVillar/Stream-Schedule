# Deep Reorg Migration Notes

## Implemented in this migration pass
- Added startup/route smoke baseline script: `backend/src/scripts/smokeStructureBaseline.js`.
- Added backend script entry: `npm run smoke:baseline`.
- Split frontend API access for migrated areas:
  - `frontend/src/shared/api/client.js`
  - `frontend/src/features/publicStream/api.js`
  - `frontend/src/features/twitchBits/api.js`
- Updated consumers to use feature API entry points:
  - `PublicStreamPage`, `PublicStreamEmbed`, `TwitchBitsPage`, `Dashboard`.
- Added feature page compatibility route target:
  - `frontend/src/features/twitchBits/pages/TwitchBitsPage.js`.
- Extracted reminder job orchestration from route layer:
  - `backend/src/jobs/reminders/reminderOrchestrator.js`.
- Updated scheduler startup to consume jobs module directly.
- Added transitional module-local model barrels:
  - `backend/src/modules/reminders/infrastructure/models.js`
  - `backend/src/modules/streamerPublic/infrastructure/models.js`
- Added transitional DB platform barrel:
  - `backend/src/platform/db/index.js`

## Validation done
- Structural smoke check: passed (`npm run smoke:baseline`).
- IDE lint diagnostics for modified files: no new errors.

## Next recommended follow-up
- Migrate remaining frontend pages to `features/*/api.js` and move route pages under feature folders.
- Continue decomposing `backend/src/models/index.js` by moving concrete model definitions into module infrastructure directories.
- Remove compatibility barrels once legacy imports are fully migrated.

