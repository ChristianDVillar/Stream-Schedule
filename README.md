[Español](README.md) · [English](README.en.md)

---

# Streamer Scheduler

Una aplicación web para programar y gestionar contenido en múltiples plataformas sociales desde un solo lugar.

---

## Qué hace

Streamer Scheduler es una plataforma de gestión de contenido que permite a creadores de contenido y streamers:

- **Programar publicaciones** en múltiples plataformas (Twitch, Twitter/X, Instagram, Discord)
- **Gestionar contenido** con una interfaz de calendario visual
- **Subir multimedia** (imágenes y videos) con almacenamiento seguro
- **Soporte multiidioma** (español e inglés)

---

## Estructura del repositorio

```text
streamer-scheduler/
├── apps/
│   ├── api/          # Backend (Node.js / Express): API, worker, scheduler
│   └── web/          # Frontend (React / Create React App)
├── docs/
├── .env.example      # Plantilla (API + variables web); copiar a apps/api/.env y apps/web/.env
├── package.json      # Scripts que delegan en apps/* (`npm run install:all`, `dev:api`, `dev:web`, …)
└── README.md
```

En **Render** (u otro PaaS con raíz de servicio configurable), el servicio del API debe usar **Root Directory** `apps/api`.

---

## Características

### Características actuales

- ✅ **Programación multiplataforma** – Programa contenido para Twitch, Twitter/X, Instagram, Discord
- ✅ **Calendario visual** – Interfaz de arrastrar y soltar, colores por tipo, iconos de plataforma e indicador en directo
- ✅ **Página pública del streamer** – `/streamer/username` y embed `/embed/streamer/username` para compartir en bio, Discord o web
- ✅ **Redes sociales en página pública** – La página pública y el embed muestran links de plataformas conectadas (Twitch, X, Discord, YouTube, Instagram)
- ✅ **Bots (Nightbot)** – Comando `!todo` desde el chat de Twitch; API key en Configuración → Bots
- ✅ **Panel de Bits en dashboard** – Vista detallada con redirección a `/bits`, modo cronológico y total por usuario
- ✅ **Overlays en tiempo real** – Mejoras en actualización de ruleta y quote overlay para uso en OBS/Streamlabs
- ✅ **Landing dinámica con mocks** – Flujo visual con imágenes del producto en sección translatable
- ✅ **Sistema de licencias** – Planes Trial, Mensual, Trimestral y Permanente
- ✅ **Panel de administración** – Gestión completa de usuarios y licencias
- ✅ **Autenticación OAuth** – Inicio de sesión con Google y Twitch
- ✅ **Integración de pagos** – Integración con Stripe para compra de licencias
- ✅ **Subida de archivos** – Subida segura con límites trial/pro
- ✅ **Validación de inputs** – Validación completa con schemas Joi
- ✅ **Logging estructurado** – Sistema de logging basado en Winston

### Características planificadas

- 🔄 **Automatización de contenido** – Publicación automática en plataformas
- 🔄 **Más plataformas** – YouTube, TikTok (el esquema ya los contempla)
- 🔄 **Panel de analíticas** – Métricas de rendimiento e insights
- 🔄 **Plantillas de contenido** – Plantillas reutilizables
- 🔄 **Colaboración en equipo** – Gestión de equipos multi-usuario
- 🔄 **Programación avanzada** – Publicaciones recurrentes y operaciones masivas
- 🔄 **Biblioteca de contenido** – Biblioteca de medios con búsqueda y organización
- 🔄 **Acceso API** – API RESTful para integraciones de terceros

---

## Novedades recientes (v2.3.1)

- **Layout monorepo:** código en `apps/api` (backend) y `apps/web` (frontend); plantilla de entorno unificada en [`.env.example`](.env.example) en la raíz; `package.json` raíz con scripts de conveniencia.
- **Rutas y API:** `GET /api/content/export` y `/debug-scheduled` antes de `/:id`; export con autenticación; paginación en listado de notificaciones y conteo SQL de no leídos; límites opcionales en `GET /my-messages`.
- **CI y calidad:** GitHub Actions ejecuta build de producción y tests de `apps/web` y Vitest de `apps/api`.
- **Logging:** Winston para errores fatales y rutas de usuario; cuerpo del evento programado de Discord solo en debug en desarrollo; `devCatchLog` / `devCatchLogThrottled` en el frontend para `catch` no fatales.
- **Legal / marca:** `dakinisCopyrightNotice` centralizado con caché por año en cabeceras y health.

### Anteriormente en v2.3.0

- Reorganización profunda del repositorio por capas y dominios (frontend y backend), con migración incremental segura.
- Orquestación de recordatorios consolidada en `modules/reminders/application/jobs` (manteniendo `jobs/reminders` solo como compatibilidad) y reducción de lógica de negocio en rutas.
- Estructura feature-first en frontend (`shared/api`, `features/*/api`); el antiguo `frontend/src/api.js` global fue eliminado.
- Escalado realtime preparado con soporte opcional de Redis pub/sub para Socket.IO (fallback automático a modo in-process).
- Baseline de seguridad estructural con smoke check de entrypoints (`npm run smoke:baseline` en `apps/api`).
- Reubicación de documentación orientada a usuarios y legal en `docs/` (incluido `docs/legal`).

---

## Stack tecnológico

### Backend

- **Node.js** con Express.js
- **PostgreSQL** (Supabase) / SQLite para desarrollo
- **Sequelize** como ORM
- **JWT** para autenticación
- **Stripe** para pagos
- **Supabase Storage** para archivos multimedia
- **Winston** para logging
- **Joi** para validación

### Frontend

- **React** 18.2
- **React Router** para navegación
- **Tailwind CSS** para estilos
- **Axios** para la API
- **React Hot Toast** para notificaciones
- **Lucide React** para iconos
- **Supabase JS** para almacenamiento

---

## Seguridad

- 🔒 **Generación segura de contraseñas** – Uso de crypto.randomBytes para tokens y claves
- **Validación de inputs** – Previene XSS e inyección
- **Protección contra inyección SQL** – Consultas parametrizadas
- **Autenticación JWT** – Autenticación basada en tokens
- **Rate limiting** – Protección contra fuerza bruta
- **Logging estructurado** – Registro de eventos de seguridad

---

## Instalación

### Requisitos previos

- Node.js 18+
- npm o yarn
- Base de datos PostgreSQL (o SQLite para desarrollo)
- Cuenta en Supabase (almacenamiento)
- Cuenta en Stripe (pagos)

### Instalación rápida (desde la raíz del repo)

```bash
npm run install:all
cp .env.example apps/api/.env
cp .env.example apps/web/.env
# Edita apps/api/.env y apps/web/.env (p. ej. REACT_APP_* en la web)

npm run dev:api    # terminal 1 — API por defecto en el puerto del proyecto
npm run dev:web    # terminal 2 — React en http://localhost:3000
```

### Por carpeta

**API (`apps/api`):**

```bash
cd apps/api
npm install
cp ../../.env.example .env
npm start
```

**Web (`apps/web`):**

```bash
cd apps/web
npm install
cp ../../.env.example .env
npm start
```

---

## Variables de entorno

### Backend

Plantilla unificada en la raíz: [`.env.example`](.env.example) (secciones API y web; cópiala a `apps/api/.env` y `apps/web/.env`). En la API, el resto de variables (DB, Stripe, OAuth, Redis, etc.) las defines en tu `.env` según despliegue.

**Stripe webhook:** Usa únicamente `POST /api/payments/webhook`. En Stripe Dashboard → Webhooks, configura la URL `https://tu-dominio.com/api/payments/webhook` (o `http://localhost:5000/api/payments/webhook` en desarrollo).

### Frontend

- `REACT_APP_API_URL` – URL del backend
- `REACT_APP_SUPABASE_URL` – URL del proyecto Supabase
- `REACT_APP_SUPABASE_ANON_KEY` – Clave anónima de Supabase

### OAuth: "redirect_uri no válido"

Si ves **redirect_uri de OAuth2 no válido**, el URI de redirección no coincide con el configurado en el proveedor. Hay que añadir **exactamente** las mismas URLs en cada panel:

- **Supabase** (Google/Twitch desde el frontend): **Authentication** → **URL Configuration** → **Redirect URLs** y **Site URL**. Añade `http://localhost:3000/auth/callback` (local) y tu URL de producción + `/auth/callback`.
- **Discord**: **Developer Portal** → Tu aplicación → **OAuth2** → **Redirects**. Añade **ambas**:  
  `http://localhost:5000/api/user/auth/discord/callback` y  
  `http://localhost:5000/api/user/auth/discord/link/callback`  
  (y las equivalentes con tu `BACKEND_URL` en producción).

**Nota:** Los mensajes que aparecen en la consola al abrir la página de Discord (p. ej. "AnalyticsTrackImpressionContext", "¡Espera! Si alguien te dijo...") son de **discord.com**, no de esta aplicación; no se pueden eliminar desde aquí.

### OAuth con Google: "The OAuth client was not found" / Error 401 invalid_client

Este error lo devuelve **Google** cuando el **Client ID** que usa tu app no existe o no es válido en Google Cloud. Si el login con Google va por **Supabase** (tienes `REACT_APP_SUPABASE_URL` y `REACT_APP_SUPABASE_ANON_KEY`):

1. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):
   - Elige el proyecto correcto (o crea uno).
   - **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
   - Tipo: **Web application**.
   - **Authorized redirect URIs**: añade exactamente  
     `https://<TU-PROJECT-REF>.supabase.co/auth/v1/callback`  
     (el `<TU-PROJECT-REF>` está en la URL de tu proyecto Supabase, ej. `abcdefgh` en `https://abcdefgh.supabase.co`).
   - Guarda y copia el **Client ID** y **Client Secret**.

2. **Supabase Dashboard** → Tu proyecto → **Authentication** → **Providers** → **Google**:
   - Activa el proveedor Google.
   - Pega el **Client ID** y **Client Secret** de Google.
   - Guarda.

Si el Client ID en Supabase era de un cliente borrado o de otro proyecto en Google Cloud, créalo de nuevo como arriba y actualiza Supabase.

**Si no usas Supabase** para Google (no tienes las variables de Supabase en el frontend), el login usa el backend con Passport. En el **backend** `.env` define `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` de un OAuth client tipo "Web application" en Google Cloud, con redirect URI: `http://localhost:5000/api/user/auth/google/callback` (y la URL de producción si aplica).

### Producción: OAuth (Google / Twitch) en Render

Para que el login con Google o Twitch no redirija a localhost:

1. **Supabase** → Tu proyecto → **Authentication** → **URL Configuration**
   - **Site URL**: tu URL de producción (ej. `https://streamautomator.com`)
   - **Redirect URLs**: añade `https://streamautomator.com/auth/callback` (y mantén `http://localhost:3000/auth/callback` para desarrollo)
2. La app usa el origen actual para la redirección OAuth; no hace falta `REACT_APP_FRONTEND_URL` en producción.

**Conectar Twitch para programar eventos y bits:** el flujo usa el API (no Supabase). En el **servicio API** de Render (Dashboard → tu servicio backend → **Environment**) define:
- **FRONTEND_URL**: URL del frontend (ej. `https://streamautomator.com`). Si no está definida, tras autorizar en Twitch la redirección puede apuntar a localhost y provocar `bad_oauth_state`.
- **BACKEND_URL**: URL pública del API (ej. `https://stream-schedule-api.onrender.com`) para `redirect_uri` y webhooks. Opcional si el API ya conoce su propia URL.

**Conectar X (Twitter) desde producción:** si ves *"X (Twitter) is not configured"* al usar la app en Render:

1. **Render** → servicio **backend** (API) → **Environment**. Añade (valores desde [X Developer Portal](https://developer.x.com/)):
   - **TWITTER_OAUTH2_CLIENT_ID** (o X_OAUTH2_CLIENT_ID)
   - **TWITTER_OAUTH2_CLIENT_SECRET** (o X_OAUTH2_CLIENT_SECRET)
   Guarda y redeploy del backend.

2. **X Developer Portal** → tu app → **App info** → **Callback URI / Redirect URL**. Además de las de local y Supabase, añade **exactamente** estas (con tu URL del API en producción):
   - `https://stream-schedule-api.onrender.com/api/user/auth/twitter/callback`
   - `https://stream-schedule-api.onrender.com/api/user/auth/twitter/link/callback`
   Sin estas URLs de producción, el backend no puede completar el flujo OAuth en Render.

**Publicar en Discord (eventos y mensajes programados):** conectar Discord en Ajustes usa OAuth (`DISCORD_CLIENT_ID` y `DISCORD_CLIENT_SECRET`). Para que el backend **publique** en tus servidores (eventos programados, mensajes, etc.) hace falta además el **token del bot**:

- **Render** → servicio **backend** (API) → **Environment**. Añade:
  - **DISCORD_BOT_TOKEN**: token del bot de tu aplicación de Discord.
- **Discord Developer Portal** → [discord.com/developers](https://discord.com/developers/applications) → tu aplicación → **Bot** → **Reset Token** / **View Token**. Copia el token y pégalo como `DISCORD_BOT_TOKEN` en Render. No lo compartas ni lo subas al repositorio.
- Guarda las variables y haz **redeploy** del backend.

Si `DISCORD_BOT_TOKEN` no está definido en producción, verás *"Discord bot not configured"* en las publicaciones programadas a Discord (el contenido se marcará como fallido o en reintento).

---

## Licencia

Copyright © 2024-2026 Christian David Villar Colodro. Todos los derechos reservados.

Este software es propietario y confidencial. La copia, distribución o modificación no autorizada está prohibida.

Ver **[LICENSE](LICENSE)** para más detalles.

---

## Documentación

Todo el índice (guías ES/EN, FAQ, Discord, legal, scripts SQL, monitor/Redis) está en **[docs/README.md](docs/README.md)**. El README en inglés del proyecto es [README.en.md](README.en.md).

---

## Soporte

Para incidencias, preguntas o soporte, contacta al equipo de desarrollo.

---

**Versión:** 2.3.1  
**Última actualización:** Abril 2026
