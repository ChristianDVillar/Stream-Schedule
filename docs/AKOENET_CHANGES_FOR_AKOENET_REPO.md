# Cambios recomendados en el repositorio AkoeNet

Este archivo vive en **Streamer Scheduler** como referencia. La implementación correspondiente en **AkoeNet** está en `D:\AkoNet` (webhook `scheduler_slug` / `twitch_login`, discovery, health `deps.scheduler`, UI admin).

## 1. Contrato y documentación

- Copia o enlaza [`AKOENET_CONTRACT.md`](./AKOENET_CONTRACT.md) en la documentación de AkoeNet (mismo contenido o un enlace al repo del Scheduler).

## 2. Webhook entrante (`POST .../stream-scheduled`)

- Validar `x-scheduler-webhook-secret` (ya lo haces).
- Aceptar el campo **`scheduler_slug`** en el JSON (además de `streamer`); ambos son el slug público; usa cualquiera para resolver usuario o canal.
- Opcional: si implementas prioridad, preferir `scheduler_slug` para llamadas a `GET /api/streamer/{slug}/events`.

## 3. Cliente HTTP al Scheduler (`scheduler-client.js` o equivalente)

- Base: `SCHEDULER_API_BASE_URL` debe ser solo el origen del API (sin `/api/...` duplicado al componer).
- Path por defecto: `/api/streamer/{username}/events` con `{username}` sustituido **después** de `resolveSchedulerStreamerSlug()`.
- **Health check opcional** antes de proxy o en panel admin:  
  `GET ${SCHEDULER_API_BASE_URL}/api/integration/akoenet` — si falla, el Scheduler está caído o la URL base es incorrecta.

## 4. CORS (solo si el navegador llama al Scheduler)

- Si **solo** el backend de AkoeNet hace `fetch` al Scheduler, **no** necesitas CORS en el Scheduler.
- Si el **frontend** (Vite) llama al Scheduler en otro origen, añade ese origen en el Scheduler:  
  `INTEGRATION_CORS_ORIGINS=https://tu-akonet.com,http://localhost:5173`

## 5. Variables `.env` AkoeNet

Alinear con [`AKOENET_CONTRACT.md`](./AKOENET_CONTRACT.md) sección «AkoeNet»:

- `SCHEDULER_WEBHOOK_SECRET` = mismo valor que en Scheduler (`SCHEDULER_WEBHOOK_SECRET` o secreto por usuario en Scheduler).
- `SCHEDULER_API_BASE_URL` + `SCHEDULER_UPCOMING_PATH` coherentes con el discovery `GET /api/integration/akoenet`.

## 6. Pruebas manuales

```bash
curl -sS "${SCHEDULER_API_BASE_URL}/api/integration/akoenet"
curl -sS "${SCHEDULER_API_BASE_URL}/api/streamer/TU_SLUG/events"
```

Sustituye `SCHEDULER_API_BASE_URL` y `TU_SLUG` por valores reales.
