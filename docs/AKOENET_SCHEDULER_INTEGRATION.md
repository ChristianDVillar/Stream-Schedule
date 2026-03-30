# Integración AkoeNet ↔ Streamer Scheduler

**Contrato detallado (payloads y checklist compartido):** [`AKOENET_CONTRACT.md`](./AKOENET_CONTRACT.md)  
**Qué editar en el repo AkoeNet (checklist):** [`AKOENET_CHANGES_FOR_AKOENET_REPO.md`](./AKOENET_CHANGES_FOR_AKOENET_REPO.md)

Este documento aclara **cómo conectar correctamente** dos aplicaciones distintas:

| Proyecto | Rol | Stack resumido (este repo = Scheduler) |
|----------|-----|----------------------------------------|
| **AkoeNet** | Comunidad (chat, voz, webhooks entrantes) | React + **Vite**, backend propio (`index.js`, etc.) — *no está en este repositorio* |
| **Streamer Scheduler** | Planificación y API pública de calendario | React (**Create React App**, vars `REACT_APP_*`) + Node/Express — **este monorepo** |

Las confusiones más habituales vienen de **mezclar hostnames**, **rutas de SPA vs API** o **variables que solo existen en un lado**.

---

## 1. URLs: SPA vs API (origen del error «Endpoint not found»)

En **Streamer Scheduler**:

- La **página pública** del streamer suele vivir en el **frontend**, por ejemplo:  
  `https://TU_FRONTEND/streamer/mislug`  
  (HTML de la app React.)

- La **API JSON** vive en el **backend**, siempre bajo prefijo **`/api/`**:  
  `GET https://TU_BACKEND/api/streamer/mislug/events`  
  `GET https://TU_BACKEND/api/streamer/mislug/upcoming` (alias del mismo JSON)  
  `GET https://TU_BACKEND/api/public/streamer/mislug/upcoming` (legacy)

Si configuras en AkoeNet:

```text
SCHEDULER_API_BASE_URL=https://api.ejemplo.com
SCHEDULER_UPCOMING_PATH=/api/streamer/{username}/events
```

entonces la petición final debe ser:

```text
https://api.ejemplo.com/api/streamer/mislug/events
```

**No** es lo mismo que abrir `https://api.ejemplo.com/streamer/mislug` en el navegador: muchos despliegues del **solo backend** no sirven la SPA en `/streamer/...`, por eso aparece 404 o «not found». Usa **`/api/streamer/.../events`** para JSON.

**Comprobar que el backend es el Scheduler correcto (sin JWT):**

```bash
curl -sS "https://TU_BACKEND/api/integration/akoenet"
```

**Prueba mínima de calendario (sin JWT):**

```bash
curl -sS -i "https://TU_BACKEND/api/streamer/TU_SLUG/events"
```

Respuesta esperada: `200` y cuerpo JSON con `events` / `upcoming`, `username`, etc. Si el slug no existe: `404` con `{"error":"Streamer not found"}`.

---

## 2. Autenticación: qué lleva token y qué no

| Llamada | ¿JWT / Bearer? |
|---------|----------------|
| **AkoeNet** `GET /integrations/scheduler/upcoming` | **Sí** — es tu API; exige sesión AkoeNet. |
| **Scheduler** `GET /api/streamer/:username/events` | **No** — endpoint **público** (sin `Authorization`). |
| **Scheduler** `POST` hacia AkoeNet `.../stream-scheduled` | **No JWT** — usa cabecera **`x-scheduler-webhook-secret`** compartida. |

Corrección importante: en tablas de documentación, **no** marques el GET público del Scheduler como «requiere Bearer». El proxy de AkoeNet puede enviar `SCHEDULER_API_TOKEN` al Scheduler **solo si tú lo configuraste** en AkoeNet; el backend del Scheduler, tal como está diseñado, **no exige** ese token para `/api/streamer/...`.

Si recibes **401** al llamar al Scheduler, revisa que la URL no apunte a otra ruta protegida o a un proxy que exija auth.

---

## 3. Webhook Scheduler → AkoeNet (anuncios)

- **Ruta en AkoeNet:** `POST /integrations/scheduler/webhooks/stream-scheduled`
- **Cabecera:** `x-scheduler-webhook-secret: <mismo valor que `SCHEDULER_WEBHOOK_SECRET` en AkoeNet y/o secreto guardado en Scheduler por usuario>`

**Payload (Scheduler):**

- `streamer`: **slug del Scheduler** = `Users.username` (no el login de Twitch por defecto).
- `title`, `starts_at` (ISO 8601), `url`, `platform`
- **`twitch_login`**: opcional, si hay integración Twitch activa (Helix).
- **`channel_id`**: opcional; se envía si en Scheduler está definido:
  - por usuario: ajustes **AkoeNet** en la app (`akoenetAnnounceChannelId`), o
  - por entorno: `SCHEDULER_ANNOUNCE_CHANNEL_ID` en el **backend del Scheduler**.

AkoeNet puede usar `channel_id` del JSON o el valor por defecto de su `.env` si no viene en el payload.

---

## 4. Resolución de nombres (Twitch vs slug)

**En AkoeNet** (tu lógica `resolveSchedulerStreamerSlug`):

- El usuario puede guardar **`scheduler_streamer_username`** cuando el slug público en Scheduler ≠ login de Twitch.
- El proxy debe construir la URL al Scheduler con el **slug resuelto** (p. ej. `Test`), no necesariamente con el login Twitch.

**En Scheduler** (API pública):

1. Coincidencia por **`Users.username`** (slug).
2. Si no hay fila, se puede resolver por **login de Twitch** vía Helix **`GET /users?login=...`** y **`Users.twitchId`**, si existen `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` y cuenta Twitch vinculada.

Así, AkoeNet puede llamar con el **login Twitch** o el **slug** en muchos casos; si solo uno de los dos existe en Scheduler, usa el campo correcto o el mapeo en AkoeNet.

---

## 5. Variables de entorno alineadas

### AkoeNet (backend)

- `SCHEDULER_API_BASE_URL` — Origen del **backend** del Scheduler (sin path final de eventos), p. ej. `https://api.streamautomator.com`
- `SCHEDULER_UPCOMING_PATH` — Solo path, p. ej. `/api/streamer/{username}/events`
- `SCHEDULER_WEBHOOK_SECRET` — Mismo secreto que valida AkoeNet en el webhook y el que envía Scheduler (o el guardado por usuario en Scheduler).
- `SCHEDULER_ANNOUNCE_CHANNEL_ID` — Default en AkoeNet si el payload no trae `channel_id` (convención AkoeNet).

### Streamer Scheduler (backend)

- `AKOENET_SCHEDULER_WEBHOOK_URL` — Fallback global si el usuario no configuró URL en UI.
- `SCHEDULER_WEBHOOK_SECRET` — Fallback del secreto compartido con AkoeNet.
- `SCHEDULER_ANNOUNCE_CHANNEL_ID` — Opcional: inyecta `channel_id` en el **payload saliente** hacia AkoeNet.
- `FRONTEND_URL` — Usado para construir enlaces en el payload (`url`) hacia la página `/streamer/...` cuando no hay URL de evento explícita.
- `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` — Necesarios para resolución por login Twitch y para `twitch_login` en el webhook.

**Nota:** `SCHEDULER_API_BASE_URL` **no** se define en el proyecto Scheduler como cliente; es variable del **AkoeNet** que llama al Scheduler.

---

## 6. Checklist rápido de diagnóstico

1. **`curl` directo al Scheduler** (sin token) a `/api/streamer/SLUG/events` → ¿200 JSON?
2. **Slug** en Scheduler (`Users.username`) = el que usas en la URL (o Twitch vinculado y login correcto).
3. En AkoeNet, **`scheduler_streamer_username`** apunta a ese slug si difiere del login Twitch.
4. **`SCHEDULER_API_BASE_URL`** es el host del **API**, no solo el sitio web de la SPA si están separados.
5. Webhook: misma **`SCHEDULER_WEBHOOK_SECRET`** en ambos lados; URL del webhook alcanzable desde el Scheduler (firewall / HTTPS).

---

## 7. Errores frecuentes (resumen)

| Síntoma | Causa típica |
|---------|----------------|
| 404 en `/streamer/X` sobre el host **API** | Se confundió la ruta **SPA** con la ruta **API**; usar `/api/streamer/X/events`. |
| 404 JSON `Streamer not found` | Slug incorrecto o usuario sin Twitch vinculado cuando se usa login Twitch. |
| 502 desde AkoeNet | Proxy no alcanza el Scheduler (URL, TLS, timeout) o respuesta no JSON. |
| Webhook no publica | URL o secreto distintos; o `channel_id` / usuario anunciador mal configurado en AkoeNet. |

---

*Última revisión: alineado con Streamer Scheduler v2.3.x — rutas en `backend/src/routes/streamer.js` y webhook en `backend/src/services/akoeNetWebhookService.js`.*
