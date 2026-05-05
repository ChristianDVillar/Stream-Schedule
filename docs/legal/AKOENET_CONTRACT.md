# Contrato de integración AkoeNet ↔ Streamer Scheduler

Documento **compartido**: úsalo en ambos repositorios para alinear variables, rutas y payloads.

## Roles

| Sistema | Responsabilidad |
|---------|-----------------|
| **Streamer Scheduler** (este repo) | API pública de calendario; envía webhooks POST cuando se programa un evento. |
| **AkoeNet** (otro repo) | Recibe webhooks; proxy `GET` autenticado hacia el Scheduler para widgets/comandos. |

---

## 1) Descubrimiento (Scheduler)

Sin autenticación:

- `GET {BACKEND}/api/integration/akoenet`  
- `GET {BACKEND}/api/integration` (mismo JSON)

Devuelve `service`, `version`, rutas públicas, campos del webhook y enlaces a `/api/health/*`.

**Comprobación rápida desde AkoeNet o CI:**

```bash
curl -sS "${SCHEDULER_API_BASE_URL}/api/integration/akoenet"
```

---

## 2) API pública de eventos (Scheduler)

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/api/streamer/{username}/events` | Ninguna |
| GET | `/api/streamer/{username}/upcoming` | Ninguna (mismo JSON) |
| GET | `/api/public/streamer/{username}/upcoming` | Ninguna (legacy) |

- `{username}`: slug (`Users.username`) **o** login de Twitch si la cuenta tiene Twitch vinculado y el backend tiene `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`.

**Base URL:** origen del **backend** del Scheduler (no confundir con la SPA). Ejemplo:

```text
SCHEDULER_API_BASE_URL=https://api.tu-dominio.com
SCHEDULER_UPCOMING_PATH=/api/streamer/{username}/events
```

---

## 3) Webhook Scheduler → AkoeNet

| Campo | Valor |
|-------|--------|
| Método | `POST` |
| Ruta en AkoeNet | `/integrations/scheduler/webhooks/stream-scheduled` (tu implementación) |
| Cabecera | `x-scheduler-webhook-secret: <secreto compartido>` |
| Content-Type | `application/json` |

**Cuerpo JSON (Scheduler):**

| Campo | Descripción |
|-------|-------------|
| `webhook_event` | `schedule` — calendario (streams/eventos); `twitch_clip` — clip automático de Twitch (si el usuario activa la opción en Ajustes). |
| `scheduler_content_type` | Solo si `webhook_event` es `schedule`: `event` o `stream`. |
| `streamer` | Slug público en Scheduler (`Users.username`). |
| `scheduler_slug` | Igual que `streamer` (explícito para mapeos). |
| `twitch_login` | Opcional, si hay Twitch conectado. |
| `title` | Título del evento o del clip. |
| `starts_at` | ISO 8601 (UTC). Solo en `schedule`. |
| `url` | Enlace al stream, página pública o URL del clip. |
| `platform` | p. ej. `twitch`, `youtube`; en clips suele ser `twitch`. |
| `thumbnail_url` | Opcional; solo en `twitch_clip`. |
| `creator_name` | Opcional; solo en `twitch_clip`. |
| `channel_id` | Opcional; solo si el usuario o `SCHEDULER_ANNOUNCE_CHANNEL_ID` lo definen en Scheduler. |

**Secreto compartido:** misma cadena en:

- AkoeNet: `SCHEDULER_WEBHOOK_SECRET` (validación entrante).
- Scheduler: `SCHEDULER_WEBHOOK_SECRET` o secreto por usuario en Ajustes → Bots → AkoeNet.

---

## 4) Variables por lado

### Streamer Scheduler (`apps/api/.env`)

```env
# Saliente hacia AkoeNet (fallback si el usuario no rellena URL en la UI)
# AKOENET_SCHEDULER_WEBHOOK_URL=https://tu-akonet.com/integrations/scheduler/webhooks/stream-scheduled
# SCHEDULER_WEBHOOK_SECRET=mismo_secreto_que_akonet
# SCHEDULER_ANNOUNCE_CHANNEL_ID=12345

# Opcional: CORS si el navegador llama al API del Scheduler (no hace falta si solo el backend de AkoeNet hace fetch)
# INTEGRATION_CORS_ORIGINS=https://tu-akonet.com,http://localhost:5173

# Helix: resolución por login Twitch + webhook twitch_login
# TWITCH_CLIENT_ID=...
# TWITCH_CLIENT_SECRET=...
```

### AkoeNet (`backend/.env` — referencia)

```env
SCHEDULER_API_BASE_URL=https://api.tu-scheduler.com
SCHEDULER_UPCOMING_PATH=/api/streamer/{username}/events
SCHEDULER_WEBHOOK_SECRET=mismo_secreto_que_scheduler
# Opcional:
# SCHEDULER_API_TOKEN=...
# SCHEDULER_API_EXTRA_HEADER=...
# SCHEDULER_API_EXTRA_VALUE=...
# SCHEDULER_DEFAULT_STREAMER_USERNAME=slug_por_defecto
```

---

## 5) Qué implementar en AkoeNet (checklist)

1. Proxy `GET /integrations/scheduler/upcoming` que construya la URL:  
   `SCHEDULER_API_BASE_URL` + sustituir `{username}` en `SCHEDULER_UPCOMING_PATH`.
2. Validar webhook entrante con `x-scheduler-webhook-secret`.
3. Preferir `scheduler_slug` o `streamer` para llamadas posteriores al API público; usar `twitch_login` solo si tu lógica lo necesita.
4. Tras despliegue, comprobar `curl ${SCHEDULER_API_BASE_URL}/api/integration/akoenet` y un `GET .../api/streamer/{slug}/events`.

---

*Mantén este archivo sincronizado con `docs/AKOENET_SCHEDULER_INTEGRATION.md` en el repo del Scheduler.*
