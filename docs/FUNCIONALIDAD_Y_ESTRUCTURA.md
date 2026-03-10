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

**Stack:** Backend Express.js + PostgreSQL (Supabase), frontend React, autenticación JWT y OAuth (Google, Twitch, Discord, X).

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
- Cuentas conectadas (vincular/desvincular OAuth).
- Seguridad: cambio de contraseña, opciones de visibilidad en dashboard (Twitch subs, bits, donaciones).
- **Modo stream:** botón en el header que activa/desactiva el enmascaramiento de datos sensibles. Cuando está activo, en las pestañas Bots y Profile de Settings se ocultan API key, URLs, email, username y webhook de Discord para evitar compartir información al compartir pantalla durante un stream. El estado se guarda en `localStorage`.

### 2.2 Calendario y programación

- Calendario visual (vista semana/día) con arrastrar y soltar.
- Contenido por tipo: stream, post, event, reel.
- Estados: draft, scheduled, queued, publishing, published, failed, canceled.
- Plataformas por publicación: Twitch, Discord, X, Instagram, YouTube.
- Filtros: estado, plataforma, rango de fechas, búsqueda.
- Duplicar contenido, cancelar publicación, exportar datos.
- Plantillas de contenido reutilizables.

### 2.3 Página pública del streamer

- **URL:** `/streamer/:username`
- Próximos streams, countdown al siguiente, indicador LIVE (Twitch).
- Botón “Notify me” para suscribirse por email a recordatorios.
- **Embed:** `/embed/streamer/:username` (iframe para Discord, paneles, webs).

### 2.4 Recordatorios para viewers

- Inscripción por email en la página pública.
- Job de envío: streams que empiezan en ~1 hora → email a suscritos.
- **Cron:** variable `ENABLE_STREAM_REMINDER_CRON=true` ejecuta el job cada 15 min en proceso; o `GET /api/cron/send-stream-reminders?secret=CRON_SECRET` desde un cron externo.

### 2.5 Bots e integraciones (webhooks)

- **Una API key** (Settings → Bots) para todos los bots.
- **Interfaz user-friendly:** tabla rápida de comandos, URLs copy-paste ready con la key, ejemplos para Nightbot (`$(urlfetch URL)`) y Streamer.bot.
- **POST (crear datos):**  
  `/api/webhooks/todo`, `/api/webhooks/events` (o `/schedule`), `/api/webhooks/stream/start`,  
  `/api/webhooks/idea`, `/api/webhooks/note`, `/api/webhooks/quote`, `/api/webhooks/clipidea`,  
  `/api/webhooks/timeline` (eventos del stream).
- **GET (comandos de chat, texto plano):**  
  `/api/webhooks/nextstream`, `/api/webhooks/countdown`, `/api/webhooks/week` (alias: `/schedule`),  
  `/api/webhooks/goal`, `/api/webhooks/myschedule`, `/api/webhooks/streamstats`,  
  `/api/webhooks/quote/random`, `/api/webhooks/idea/random`, `/api/webhooks/commands` (!commands).
- **Público (sin key):**  
  `POST /api/streamer/:username/suggest` — sugerencias de viewers (!suggest).
- Al llamar a `/api/webhooks/stream/start`, si el usuario tiene configurado el webhook de Discord, se envía un mensaje al canal.

### 2.6 Stream Ideas, sugerencias y timeline

- **Stream Ideas** (`/stream-ideas`): ideas, notas, frases e ideas de clip guardadas con !idea, !note, !quote, !clipidea; pestañas por tipo.
- **Sugerencias** (`/suggestions`): lista de sugerencias de viewers (!suggest); el streamer puede borrarlas.
- **Timeline** (`/stream-timeline`): eventos del stream registrados vía `POST /api/webhooks/timeline` (stream_start, donation, clip, etc.); filtro por últimas 6h / 12h / 24h / 7 días.

### 2.7 Horario semanal (Dashboard)

- Bloque “This week's schedule” con texto generado (día, hora, título).
- Acciones: **Copiar**, **Tweet** (intent de Twitter), **Descargar imagen** (PNG vía html2canvas).

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
│   │   ├── webhooks.js        # /api/webhooks (bots: todo, events, stream/start, idea, goal, countdown, etc.)
│   │   ├── streamItems.js     # /api/stream-items
│   │   ├── suggestions.js     # /api/suggestions
│   │   ├── timeline.js        # /api/timeline
│   │   ├── cron.js            # /api/cron/send-stream-reminders + runStreamReminders()
│   │   ├── discord.js, youtube.js, payments.js, templates.js, todos.js, ...
│   │   └── admin/
│   ├── services/              # contentService, twitchService, scheduler, notifications, etc.
│   ├── utils/                 # logger, notifications (email), crypto, metrics
│   └── migrations/            # Sequelize CLI
├── package.json
└── .env
```

**Rutas API principales:**

| Prefijo | Descripción |
|--------|-------------|
| `/api/user` | Login, perfil, OAuth, admin |
| `/api/content` | CRUD contenido programado |
| `/api/streamer` | Página pública: events, remind, suggest |
| `/api/webhooks` | Bots: todo, events, stream/start, idea, note, quote, clipidea, timeline, nextstream, countdown, week, goal, myschedule, streamstats, quote/random, idea/random |
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
├── ROADMAP_MERCADO.md           # Roadmap y posicionamiento
├── FUNCIONALIDAD_Y_ESTRUCTURA.md # Este documento
├── PITCH_VENTA_INVERSION.md     # Guion para pitch de venta o inversión
└── ...
```

---

## 4. Variables de entorno relevantes

- **Backend:** `DATABASE_URL`, `FRONTEND_URL`, `BACKEND_URL`, `JWT_SECRET`, `CRON_SECRET` (o `INTERNAL_CRON_SECRET`), `ENABLE_STREAM_REMINDER_CRON` (cron in-process), `EMAIL_ENABLED`, `STRIPE_*`, OAuth para Twitch/Discord/X, etc.
- **Frontend:** `REACT_APP_API_URL` (base URL del API).

---

## 5. Resumen de modelos de datos (principales)

| Modelo | Uso |
|--------|-----|
| User | Usuario: auth, perfil, meta de stream, webhook Discord, API key Nightbot |
| Content | Contenido programado (streams, posts, etc.) |
| Todo | Tareas (desde chat o app) |
| Integration | OAuth por plataforma (Twitch, Discord, etc.) |
| StreamReminder | Emails de viewers para recordatorios |
| ReminderSent | Control de envío (no duplicar por stream) |
| StreamSuggestion | Sugerencias de viewers (!suggest) |
| StreamItem | Ideas, notas, frases, clip ideas (!idea, !note, !quote, !clipidea) |
| StreamTimelineEvent | Eventos del stream (timeline) |
| ContentTemplate | Plantillas de contenido |
| Message, Notification | Mensajes y notificaciones in-app |
| Payment | Pagos / Stripe |

---

*Para el roadmap de producto y próximas funcionalidades, ver `ROADMAP_MERCADO.md`.*

---

## 6. Recomendaciones antes de escalar

- **Cron de recordatorios:** En producción es preferible usar un cron externo (Render Cron, Vercel Cron, Railway, etc.) que llame a `GET /api/cron/send-stream-reminders?secret=CRON_SECRET` cada 10–15 min, en lugar de depender solo de `ENABLE_STREAM_REMINDER_CRON` en proceso (si el servidor reinicia, se puede perder una ejecución).
- **Mensaje de producto:** Comunicar el producto como *programar streams + anuncios automáticos*; el resto de funciones (timeline, ideas, sugerencias, etc.) como extras.
- **Onboarding:** Guiar al usuario: 1) Conectar Twitch, 2) Programar primer stream, 3) Conectar Discord, 4) Compartir página de horario. Aumenta conversión.
- **Analytics para el streamer:** Métricas como streams este mes, duración media, mejor día para streamear pueden enganchar más a los creadores (futuro).
