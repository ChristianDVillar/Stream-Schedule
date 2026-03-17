# Streamer Scheduler — Funcionalidad y estructura actual

*Documento de referencia con la funcionalidad implementada y la estructura del proyecto.*  
*Última actualización: marzo 2026*

---

## 1. Descripción general

**Streamer Scheduler** es una aplicación para creadores y streamers que permite:

- Planificar streams y contenido en un calendario visual.
- Publicar anuncios en varias plataformas (Twitch, Discord, X, Instagram, YouTube).
- Compartir una página pública con el horario y recordatorios para viewers.
- Integrar bots de chat (Nightbot, Streamer.bot, Mix It Up, etc.) mediante una API y webhooks.

**Stack:** Backend Express.js + PostgreSQL (Supabase), frontend React, autenticación JWT y OAuth (Google, Twitch, Discord, X). Integración Slack (OAuth link + setup de workspace) para canales y grupos.

**Frase de producto (posicionamiento):**  
*Automate your streams. Schedule, announce and manage everything from one dashboard.*  
*(Alternativa: “The automation hub for streamers.”)*

---

## 2. Funcionalidad actual

### 2.1 Autenticación y usuario

- Login con email/contraseña, Google, Twitch, Discord, X (Twitter).
- Perfil de usuario: nombre, email, foto, enlace de merchandising, posición del botón de tienda.
- Meta de stream (!goal): tipo (followers/subs), objetivo numérico; se muestra el actual si Twitch está conectado.
- Webhook de Discord para anunciar “Stream started!” al llamar al webhook de inicio de stream.
- Cuentas conectadas (vincular/desvincular OAuth): Google, Twitch, Discord, X, YouTube, **Slack**.
- **Slack:** OAuth de vinculación (no login). Al conectar se guarda en `Integration` (provider: `slack`) con token de bot; desde Settings → Plataformas se puede ejecutar **Setup Streaming Workspace** para crear en el workspace los canales (#stream-announcements, #stream-chat, #stream-clips, #stream-mods) y grupos (@mods, @editors). Variables: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` (y opcionalmente `SLACK_SIGNING_SECRET`).
- Seguridad: cambio de contraseña, opciones de visibilidad en dashboard (Twitch subs, bits, donaciones).
- **Modo stream:** botón en el header que activa/desactiva el enmascaramiento de datos sensibles. Cuando está activo, en las pestañas Bots y Profile de Settings se ocultan API key, URLs, email, webhook de Discord, etc., para no compartir información al compartir pantalla. El estado se guarda en `localStorage`.

### 2.2 Calendario y programación

- Calendario visual (vista semana/día) con arrastrar y soltar.
- Contenido por tipo: stream, post, event, reel.
- Estados: draft, scheduled, queued, publishing, published, failed, canceled.
- Plataformas por publicación: Twitch, Discord, X, Instagram, YouTube. **Instagram** está deshabilitado por defecto hasta que se implemente OAuth y publicación (ver sección integraciones en `docs/PASOS_SIGUIENTES.md`).
- Filtros: estado, plataforma, rango de fechas, búsqueda.
- Duplicar contenido, cancelar publicación, exportar datos.
- Plantillas de contenido reutilizables.

### 2.3 Página pública del streamer

- **URL:** `/streamer/:username`
- Próximos streams, countdown al siguiente, indicador LIVE (Twitch).
- Botón “Notify me” para suscribirse por email a recordatorios.
- **Accesibilidad (a11y):** landmark `main`, enlace "Skip to main content", `aria-labelledby` en secciones, `role="region"` y `aria-label` en el embed.
- **Embed:** `/embed/streamer/:username` (iframe para Discord, paneles, webs).

### 2.4 Recordatorios para viewers

- Inscripción por email en la página pública.
- Job de envío: streams que empiezan en ~1 hora → email a suscritos.
- **Cola Redis/BullMQ (recomendado):** cola `stream-reminders`. El **schedulerServer** (o cron externo) llama a `enqueueStreamReminderJobs()` cada 15 min y encola un job por cada (contentId, streamReminderId); el **workerServer** procesa los jobs (envío de email y registro en ReminderSent). Variables: `REDIS_URL` (o `REDIS_HOST`/`REDIS_PORT`), `ENABLE_STREAM_REMINDER_WORKER` (producer en scheduler, por defecto true), `ENABLE_REMINDER_WORKER` (consumer en worker, por defecto true).
- **Fallback:** `ENABLE_STREAM_REMINDER_CRON=true` ejecuta el job cada 15 min en el proceso API; o `GET /api/cron/send-stream-reminders?secret=CRON_SECRET` (si Redis no está disponible, ejecuta en proceso; si está, solo encola jobs).

### 2.5 Bots e integraciones (webhooks)

- **Una API key** (Settings → Bots) para todos los bots. Autenticación: header `X-API-Key` o query `?key=API_KEY`.
- **Documentación API:** Swagger/OpenAPI en `GET /api-docs` (UI interactiva). Incluye webhooks (stream/start, quote/add, nextstream, goal, commands, etc.), ejemplos de uso para Nightbot, Streamer.bot y Mix It Up, y esquema de seguridad por API key.
- **Regenerar API key:** En Settings → Bots, botón "Regenerate" con confirmación (invalida la key anterior).
- **Interfaz user-friendly:** navegación rápida (API key, Overlays, Comandos, Página pública), tabla de comandos, URLs listas para copiar con la key, ejemplos para Nightbot (`$(urlfetch URL)`) y Streamer.bot.
- **Añadir contenido vía GET (Nightbot):**  
  `GET /api/webhooks/idea/add?text=...`, `note/add?text=...`, `quote/add?quote=...` (o `?text=...`), `clipidea/add?text=...` — todos aceptan también POST con body. Respuesta en texto plano.
- **POST (crear datos):**  
  `/api/webhooks/todo`, `/api/webhooks/events` (o `/schedule`), `/api/webhooks/stream/start`,  
  `/api/webhooks/idea`, `/api/webhooks/note`, `/api/webhooks/quote`, `/api/webhooks/clipidea`,  
  `/api/webhooks/voteidea`, `/api/webhooks/remindme`, `/api/webhooks/challenge`,  
  `/api/webhooks/timeline` (eventos del stream).  
  **voteidea, remindme, challenge** admiten también GET con query (`?text=...`, `?viewer=...`) para Nightbot.
- **GET (comandos de chat, texto plano):**  
  `nextstream`, `countdown`, `week` (alias `schedule`), `nextgame`, `when` (próximo stream por juego), `calendar` (alias myschedule),  
  `goal`, `myschedule`, `streamstats`, `streamcount`, `laststream`, `streak`, `uptimeweek`,  
  `quote/random`, `idea/random`, `idea/latest`, `clipidea/random`, `contentwheel`,  
  `voteidea/top`, `nextcollab`, `raidnext`, `commands` (!commands).
- **Overlays para OBS/Streamlabs:** Un solo componente genérico en `/overlay/:type?key=KEY` con tipos `nextstream`, `goal`, `week`, `quote`, `suggestions`. Lazy-loaded; se documentan en Settings → Bots con tamaños recomendados y pasos para añadir como Browser Source.
- **Rate limiting:** Límite por IP en `/api/webhooks` (300 req/15 min) para evitar abuso.
- **Logging:** Middleware centralizado que registra método, ruta, status y duración de cada petición a webhooks.
- **Público (sin key):**  
  `POST /api/streamer/:username/suggest` — sugerencias de viewers (!suggest).
- Al llamar a `/api/webhooks/stream/start`, si el usuario tiene configurado el webhook de Discord, se envía un mensaje al canal.

### 2.6 Stream Ideas, sugerencias y timeline

- **Stream Ideas** (`/stream-ideas`): ideas, notas, frases e ideas de clip guardadas con !idea, !note, !quote, !clipidea; pestañas por tipo. **Ordenación por popularidad:** en la pestaña Ideas se puede elegir "Más recientes" o "Más votos (esta semana)" (`GET /api/stream-items?type=idea&sort=votes` agrupa por texto y cuenta votos de !voteidea).
- **Sugerencias** (`/suggestions`): lista de sugerencias de viewers (!suggest); el streamer puede borrarlas.
- **Timeline** (`/stream-timeline`): eventos del stream registrados vía `POST /api/webhooks/timeline` (stream_start, donation, clip, etc.); filtro por últimas 6h / 12h / 24h / 7 días.

### 2.7 Horario semanal y onboarding (Dashboard)

- Bloque “This week's schedule” con texto generado (día, hora, título).
- Acciones: **Copiar**, **Tweet** (intent de Twitter), **Descargar imagen** (PNG vía html2canvas).
- **Checklist de onboarding:** card "Getting started" con pasos (Conectar Twitch, Programar primer stream, Conectar Discord, Compartir página). Descartable (estado en `localStorage`); no bloquea ninguna funcionalidad. Enlaces a Settings y Schedule.
- **API de onboarding:** `GET /api/user/onboarding-status` devuelve progreso (twitchConnected, firstStreamCreated, discordConnected, overlayActivated, steps, score 0–100). `POST /api/user/auto-create-first-stream` crea un stream de ejemplo (p. ej. viernes 20:00, “Just Chatting”) si el usuario tiene Twitch conectado y aún no tiene streams; el checklist muestra botón “Create example stream” y porcentaje de progreso.

### 2.8 Todos, medios, mensajes

- Lista de todos (creación/edición/borrado); integrable desde chat con la API key.
- Subida de medios (imágenes/vídeos).
- Mensajes (soporte/notificaciones in-app).

### 2.9 Pagos y planes

- Stripe: suscripciones, webhook de eventos.
- Planes (trial, Starter, Pro, etc.) y gestión de licencias.
- Página de precios (`/pricing`).

### 2.10 Admin

- Dashboard admin, usuarios, soporte, notificaciones, plataformas, pagos, alertas (si está habilitado).
- Health check, métricas Prometheus (opcional).

### 2.11 Internacionalización

- Inglés y español (locales en `frontend/src/locales`).

---

## 3. Estructura del proyecto

### 3.1 Backend (`backend/`)

```
backend/
├── src/
│   ├── app.js                 # Express, rutas, cron in-process
│   ├── config/
│   │   └── database.js        # Sequelize (PostgreSQL/Supabase)
│   ├── constants/             # contentStatus, platforms, etc.
│   ├── middleware/            # auth, rateLimit, csrf
│   ├── models/                # Sequelize
│   │   ├── index.js           # Definiciones y asociaciones
│   │   ├── User.js
│   │   ├── Content.js
│   │   ├── Todo.js
│   │   ├── Integration.js
│   │   ├── StreamReminder.js
│   │   ├── StreamSuggestion.js
│   │   ├── StreamItem.js
│   │   ├── StreamTimelineEvent.js
│   │   ├── ReminderSent.js
│   │   ├── Message.js, Notification.js, Payment.js, ...
│   │   └── ...
│   ├── routes/
│   │   ├── user.js            # /api/user (auth, profile, OAuth, admin)
│   │   ├── content.js         # /api/content
│   │   ├── streamer.js        # /api/streamer (público: events, remind, suggest)
│   │   ├── webhooks/          # /api/webhooks (módulo: index.js monta rutas, shared.js helpers)
│   │   │   ├── index.js       # Rutas bots (todo, events, stream/start, items, GET commands, goal, timeline)
│   │   │   └── shared.js      # getApiKey, getUserByApiKey, getUpcomingEvents, formatEventForChat, etc.
│   │   ├── streamItems.js     # /api/stream-items (?type=idea|note|quote|clipidea, ?sort=recent|votes)
│   │   ├── suggestions.js     # /api/suggestions
│   │   ├── timeline.js        # /api/timeline
│   │   ├── cron.js            # /api/cron/send-stream-reminders + runStreamReminders()
│   │   ├── discord.js, youtube.js, payments.js, templates.js, todos.js, ...
│   │   └── admin/
│   ├── services/              # contentService, twitchService, slackWorkspaceService (canales/grupos Slack), notifications, etc.
│   ├── utils/                 # logger, notifications (email), crypto, metrics, discordAnnounce (webhook stream started)
│   ├── docs/                  # OpenAPI (webhooks.openapi.js) para Swagger
│   └── migrations/            # Sequelize CLI
├── package.json
├── .env.example               # SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, etc.
└── .env
```

**Rutas API principales:**

| Prefijo | Descripción |
|--------|-------------|
| `/api/user` | Login, perfil, OAuth (Google, Twitch, Discord, X, Slack link), connected-accounts, onboarding-status, auto-create-first-stream, disconnect-*, Slack setup-workspace, admin |
| `/api/content` | CRUD contenido programado |
| `/api/streamer` | Página pública: events, remind, suggest |
| `/api/webhooks` | Bots: todo, events, stream/start; idea/note/quote/clipidea (+ idea/add, note/add, quote/add, clipidea/add GET/POST); voteidea, remindme, challenge (GET+POST); timeline; nextstream, countdown, week, schedule, nextgame, when, calendar, goal, myschedule, streamstats, streamcount, laststream, streak, uptimeweek, quote/random, idea/random, idea/latest, clipidea/random, contentwheel, voteidea/top, nextcollab, raidnext, commands |
| `/api/stream-items` | Ideas, notas, frases, clip ideas (auth) |
| `/api/suggestions` | Sugerencias de viewers (auth) |
| `/api/timeline` | Eventos del stream (auth) |
| `/api/cron` | send-stream-reminders (secret) |
| `/api/todos`, `/api/templates`, `/api/upload`, `/api/discord`, `/api/youtube`, `/api/payments`, `/api/notifications`, `/api/messages` | Resto de funcionalidad |

### 3.2 Frontend (`frontend/`)

```
frontend/
├── public/
├── src/
│   ├── App.js                 # Layout, sidebar, rutas
│   ├── api.js                 # Cliente API (axios), funciones por dominio
│   ├── routes/
│   │   ├── AppRoutes.js       # Definición de rutas
│   │   └── routeGuards.js     # PrivateRoute, AdminRoute, UserRoute
│   ├── pages/
│   │   ├── Landing.js         # Landing pública
│   │   ├── Login.js, AuthCallback.js
│   │   ├── Dashboard.js       # Calendario, horario semanal, Twitch/Discord stats
│   │   ├── Schedule.js        # Crear/editar contenido
│   │   ├── Profile.js
│   │   ├── Settings/          # Tabs: Profile, Bots, Platforms, Notifications, Security, Billing, etc.
│   │   ├── TodoList.js
│   │   ├── StreamIdeasPage.js
│   │   ├── SuggestionsPage.js
│   │   ├── StreamTimelinePage.js
│   │   ├── PublicStreamPage.js
│   │   ├── PublicStreamEmbed.js
│   │   ├── Overlay.js         # Overlay genérico para OBS (tipos nextstream, goal, week, quote, suggestions)
│   │   ├── Templates.js, MediaUpload.js, MessagesPage.js
│   │   ├── Pricing.js, Privacy.js, Terms.js, FAQ.js
│   │   └── AdminDashboard.js
│   ├── components/
│   │   ├── LandingCalendarPreview.js   # Mini-calendario demo en landing
│   │   ├── AppFooter.js, TrialWarning.js, SearchAdvanced.js, ...
│   │   └── ...
│   ├── contexts/               # LanguageContext, StreamModeContext, etc.
│   ├── locales/               # en.json, es.json
│   ├── utils/
│   └── constants/
├── package.json
└── .env
```

**Rutas de la SPA:**

| Ruta | Página | Acceso |
|------|--------|--------|
| `/` | Landing o redirección | Público |
| `/login`, `/auth/callback` | Login, OAuth | Público |
| `/pricing`, `/privacy`, `/terms`, `/faq` | Legal / info | Público |
| `/streamer/:username` | Página pública del streamer | Público |
| `/embed/streamer/:username` | Embed del horario | Público |
| `/overlay/:type` (nextstream, goal, week, quote, suggestions) | Overlay genérico para OBS/Streamlabs (Browser Source, `?key=KEY`) | Público |
| `/dashboard` | Dashboard (calendario, horario semanal) | Usuario |
| `/schedule` | Programar contenido | Usuario |
| `/profile` | Perfil | Usuario |
| `/settings` | Ajustes (tabs) | Usuario |
| `/todos` | Lista de todos | Usuario |
| `/stream-ideas` | Ideas de stream | Usuario |
| `/suggestions` | Sugerencias de viewers | Usuario |
| `/stream-timeline` | Timeline del stream | Usuario |
| `/templates`, `/media`, `/messages` | Plantillas, medios, mensajes | Usuario |
| `/admin` | Panel admin | Admin |

### 3.3 Documentación y configuración

```
docs/
├── PASOS_SIGUIENTES.md    # Roadmap, prioridades, integraciones pendientes
├── FUNCIONALIDAD_Y_ESTRUCTURA.md  # Este documento (funcionalidad, estructura, landing/pricing, checkout)
└── ...
```

---

## 4. Variables de entorno relevantes

- **Backend:** `DATABASE_URL`, `FRONTEND_URL`, `BACKEND_URL`, `JWT_SECRET`, `CRON_SECRET` (o `INTERNAL_CRON_SECRET`), `REDIS_URL` (o `REDIS_HOST`/`REDIS_PORT`) para colas BullMQ, `ENABLE_STREAM_REMINDER_CRON` (cron in-process, fallback), `ENABLE_STREAM_REMINDER_WORKER` (producer en scheduler), `ENABLE_REMINDER_WORKER` (consumer en worker), `EMAIL_ENABLED`, `STRIPE_*`, OAuth para Twitch/Discord/X/Google, etc.
- **Slack:** `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` (obligatorios para conectar Slack). Opcionales: `SLACK_SIGNING_SECRET`, `SLACK_VERIFICATION_TOKEN` (para Events API / slash en el futuro). Redirect URL en la app de Slack: `BACKEND_URL/api/user/auth/slack/link/callback`.
- **Frontend:** `REACT_APP_API_URL` (base URL del API).
- **Supabase (RLS):** Si usas PostgreSQL en Supabase, el dashboard puede mostrar *"RLS Disabled in Public"*. Para corregirlo, ejecuta una vez en **Supabase → SQL Editor** el script **`SUPABASE_RLS_ALL_TABLES.sql`** (raíz del repo). Habilita RLS en todas las tablas públicas; el backend sigue usando `service_role` o `DATABASE_URL` y no se ve afectado.

---

## 5. Resumen de modelos de datos (principales)

| Modelo | Uso |
|--------|-----|
| User | Usuario: auth, perfil, meta de stream, webhook Discord, API key Nightbot |
| Content | Contenido programado (streams, posts, etc.) |
| Todo | Tareas (desde chat o app) |
| Integration | OAuth por plataforma (Twitch, Discord, YouTube, **Slack**). Slack guarda token de bot y metadata (teamId, teamName, channels, groups tras Setup Workspace). |
| StreamReminder | Emails de viewers para recordatorios |
| ReminderSent | Control de envío (no duplicar por stream) |
| StreamSuggestion | Sugerencias de viewers (!suggest) |
| StreamItem | Ideas, notas, frases, clip ideas (!idea, !note, !quote, !clipidea) |
| StreamTimelineEvent | Eventos del stream (timeline) |
| ContentTemplate | Plantillas de contenido |
| Message, Notification | Mensajes y notificaciones in-app |
| Payment | Pagos / Stripe |

---

*Para roadmap, prioridades, integraciones pendientes y próximos pasos, ver `PASOS_SIGUIENTES.md`.*

---

## 6. Recomendaciones antes de escalar

- **Recordatorios:** Con **Redis/BullMQ** (recomendado): ejecutar **schedulerServer** (producer cada 15 min) y **workerServer** (consumer); el endpoint `GET /api/cron/send-stream-reminders?secret=CRON_SECRET` puede usarse como cron externo y solo encola jobs. Sin Redis: cron externo que llame a ese endpoint (ejecuta en proceso) o `ENABLE_STREAM_REMINDER_CRON=true` en el API.
- **Documentación API:** Usar `/api-docs` (Swagger) para integrar bots y terceros; ampliar con más endpoints según necesidad.
- **Mensaje de producto:** Comunicar el producto como *programar streams + anuncios automáticos*; el resto de funciones (timeline, ideas, sugerencias, etc.) como extras.
- **Onboarding:** El checklist visual en Dashboard (Getting started) refuerza el flujo: Conectar Twitch → Programar primer stream → Conectar Discord → Compartir página. Aumenta conversión.
- **Analytics para el streamer:** Métricas como streams este mes, duración media, mejor día para streamear pueden enganchar más a los creadores (futuro).

---

## 7. Landing y Pricing

### 7.1 Landing page (`/`)

- **Objetivo:** Presentar el producto como automatización para streamers (calendario + anuncios + overlays), llevar a Sign up / Get started.
- **Estructura:** Hero con título tipo “Automate your streams…”, barra de logos (Twitch, YouTube, Discord, Instagram, X), sección Product motion (pasos animados), previews (Dashboard, página pública, overlays, extras stream), “Built for streamers”, integraciones, CTA final.
- **UX:** Colores alineados con Dashboard (`text-accent`, `bg-accent`, `bg-gray-50`/`bg-gray-100`), scroll vertical, mocks que comunican horario semanal, página pública + “Notify me”, overlays “Powered by Streamer Scheduler”.

### 7.2 Pricing page (`/pricing`)

- **Objetivo:** Explicar planes y valor (qué gano pagando; qué pasa si soy streamer pequeño).
- **Estructura:** Hero de precios, tarjetas de planes (nombre, precio, descripción, lista de características: calendario multi-plataforma, página pública + “Notify me”, bots/webhooks/overlays, Slack workspace, Stream Ideas/sugerencias/timeline/todos/medios), sección de valor para streamers pequeños, opcionalmente FAQ y contacto.
- **UX:** Misma paleta que landing y dashboard; botón por tarjeta → checkout (Stripe) o signup; explicación de checkout (suscripción, renovación, cancelación en Settings → Billing).

### 7.3 Relación con el resto de la app

- Landing y Pricing son públicas; no requieren autenticación. Todo lo mostrado está respaldado por la funcionalidad descrita en las secciones 2 y 3 (calendario, página pública, webhooks, overlays, integraciones, ideas/sugerencias/timeline/todos, pagos).

---

## 8. Checkout (Stripe)

### 8.1 Backend (`backend/src/routes/payments.js`)

| Ruta | Descripción |
|------|-------------|
| `POST /payments/create-checkout-session` | Sesión por **lookup_key** (Stripe Price). Auth: requireAuth. Body: createCheckoutSessionSchema. Respuesta: `{ sessionId, url, mode }`. |
| `POST /payments/checkout` | Sesión por **licenseType** (planes de la app → lookup_key). Body: `{ licenseType }`. Crea Payment (PENDING), sesión Stripe, guarda `stripeSessionId`. Respuesta: `{ sessionId, url, paymentId, ... }`. |
| `POST /payments/verify-session` | Verifica pago tras redirect (Body: `{ sessionId }`). Comprueba metadata.userId y devuelve estado (p. ej. `paid`). |
| `POST /payments/customer-portal` | Sesión del Stripe Customer Portal (gestión suscripción, método de pago, facturas). Requiere usuario con `stripeCustomerId`. |

- **Tax:** Si `STRIPE_TAX_ENABLED` no es `false`, sesiones usan `billing_address_collection: 'auto'` y `customer_update: { address: 'auto' }` para evitar `customer_tax_location_invalid`.
- **Cliente Stripe:** En pago único se usa `getOrCreateCustomer(user)`; en webhook `checkout.session.completed` se guarda `session.customer` en User si no tenía `stripeCustomerId`.

### 8.2 Validadores (`backend/src/validators/paymentSchemas.js`)

- **checkoutSchema:** `licenseType` (monthly, quarterly, creator, pro_monthly, lifetime, temporary).
- **createCheckoutSessionSchema:** `lookup_key` (required), `success_url`, `cancel_url` (opcionales).
- **verifySessionSchema:** `sessionId` (required).

### 8.3 Frontend (API y Settings)

- **API (`frontend/src/api.js`):** `createCheckout({ licenseType, token })`, `createCheckoutSession(...)`, `verifyPaymentSession({ sessionId, token })`, `createCustomerPortal(token)`.
- **Settings:** Compra vía `createCheckout` o `createSubscription`; si hay `url` se redirige a Stripe. Tras volver, query `payment=success`/`subscription=success` y `session_id` → `verifyPaymentSession` → si `paid`, actualizar estado y limpiar URL. “Manage Billing” abre Customer Portal (requiere `stripeCustomerId`).
- **Redirects:** Success: `${frontendUrl}/settings?payment=success&session_id={CHECKOUT_SESSION_ID}` (o `subscription=success`). Cancel: `...?payment=cancelled` (o `subscription=cancelled`).
