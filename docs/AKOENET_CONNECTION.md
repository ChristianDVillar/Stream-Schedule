# Conexión con AkoeNet

Resumen de cómo **Streamer Scheduler** (este repositorio) se conecta con **AkoeNet** (aplicación aparte). Para el detalle operativo, URLs y diagnóstico usa [AKOENET_SCHEDULER_INTEGRATION.md](./AKOENET_SCHEDULER_INTEGRATION.md). Para payloads, rutas y variables alineadas entre ambos repos: [AKOENET_CONTRACT.md](./AKOENET_CONTRACT.md).

---

## Qué es cada sistema

| Sistema | Rol |
|---------|-----|
| **Streamer Scheduler** | Calendario, publicación a redes, API pública de eventos, webhooks salientes. |
| **AkoeNet** | Comunidad; recibe avisos de streams programados y puede consultar el calendario del Scheduler. |

---

## Flujos de conexión

### 1. AkoeNet lee el calendario (Scheduler → JSON)

- El **backend** del Scheduler expone endpoints **públicos** (sin JWT del Scheduler):
  - `GET /api/streamer/{username}/events` (y alias `/upcoming`).
- `{username}` es el **slug** en Scheduler (`Users.username`) o, si está configurado Helix, puede resolverse por **login de Twitch** vinculado.
- AkoeNet debe apuntar al **host de la API**, no a la SPA: ver sección 1 de la [guía de integración](./AKOENET_SCHEDULER_INTEGRATION.md).

### 2. Scheduler avisa a AkoeNet cuando hay un evento (webhook)

- Al programar o actualizar un evento, el Scheduler puede **POST** al webhook de AkoeNet (`stream-scheduled`).
- Autenticación: cabecera **`x-scheduler-webhook-secret`** (mismo valor acordado en ambos lados).
- Configuración en Scheduler: **Ajustes → Bots → AkoeNet** (URL y secreto por usuario), o variables globales en el backend (`AKOENET_SCHEDULER_WEBHOOK_URL`, `SCHEDULER_WEBHOOK_SECRET`, etc.). Detalle de campos del cuerpo: [contrato](./AKOENET_CONTRACT.md#3-webhook-scheduler--akonet).

### 3. Descubrimiento (sin credenciales)

- `GET /api/integration/akoenet` (o `/api/integration`) devuelve metadatos del servicio y rutas útiles para integradores.
- El JSON incluye **`admin_dashboard_url`**: URL completa del panel admin (SPA en el **frontend**, p. ej. `https://streamautomator.com/admin`). **No** enlaces a `https://api.../admin` salvo que quieras confiar en la redirección 302 del API (requiere `FRONTEND_URL` / `PUBLIC_FRONTEND_URL` en el backend del Scheduler).

### 4. CORS (solo si hace falta)

- Si el **navegador** (SPA de AkoeNet) llama directamente al API del Scheduler, configura **`INTEGRATION_CORS_ORIGINS`** en el backend del Scheduler.
- Si solo el **backend** de AkoeNet hace `fetch` al Scheduler, normalmente **no** necesitas CORS en el Scheduler.

---

## Variables que suelen tocarse (Scheduler)

Placeholders; valores reales solo en `.env` local o en el proveedor de hosting (nunca en git).

| Variable | Uso |
|----------|-----|
| `AKOENET_SCHEDULER_WEBHOOK_URL` | URL del webhook en AkoeNet si no está en la UI por usuario. |
| `SCHEDULER_WEBHOOK_SECRET` | Secreto compartido con AkoeNet para el POST saliente. |
| `SCHEDULER_ANNOUNCE_CHANNEL_ID` | Opcional: `channel_id` en el payload hacia AkoeNet. |
| `INTEGRATION_CORS_ORIGINS` | Orígenes del front de AkoeNet si llaman al API desde el navegador. |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | Resolución por login Twitch y campo `twitch_login` en el webhook. |

La administración de AkoeNet (salud, métricas, etc.) vive **solo en el proyecto AkoeNet**, no en el panel admin del Scheduler.

En AkoeNet suelen configurarse `SCHEDULER_API_BASE_URL`, `SCHEDULER_UPCOMING_PATH`, `SCHEDULER_WEBHOOK_SECRET` y el mapeo slug/Twitch según su código.

---

## Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| [AKOENET_SCHEDULER_INTEGRATION.md](./AKOENET_SCHEDULER_INTEGRATION.md) | Guía paso a paso, errores frecuentes, checklist. |
| [AKOENET_CONTRACT.md](./AKOENET_CONTRACT.md) | Contrato técnico (rutas, JSON, variables). |
| [CURRENT_FUNCTIONALITY_AND_STRUCTURE.md](./CURRENT_FUNCTIONALITY_AND_STRUCTURE.md) | Arquitectura global del Scheduler y env. |

---

*Streamer Scheduler — referencia rápida de conexión con AkoeNet.*
