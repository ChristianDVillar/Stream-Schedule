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

## Características

### Características actuales

- ✅ **Programación multiplataforma** – Programa contenido para Twitch, Twitter/X, Instagram, Discord
- ✅ **Calendario visual** – Interfaz de arrastrar y soltar para gestionar contenido
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

### Configuración del backend

```bash
cd backend
npm install
cp env.example .env
# Edita .env con tu configuración
npm start
```

### Configuración del frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edita .env con la URL de tu API
npm start
```

---

## Variables de entorno

### Backend

Ver `backend/env.example` para todas las variables requeridas.

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

Lista completa de redirect URIs por proveedor: ver comentarios en **`backend/env.example`** (sección "OAUTH2 REDIRECT URIs").

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
   - **Site URL**: tu URL de producción (ej. `https://stream-schedule-v1.onrender.com`)
   - **Redirect URLs**: añade `https://tu-dominio.onrender.com/auth/callback` (y mantén `http://localhost:3000/auth/callback` para desarrollo)
2. La app usa el origen actual para la redirección OAuth; no hace falta `REACT_APP_FRONTEND_URL` en producción.

**Conectar Twitch para programar eventos y bits:** el flujo usa el API (no Supabase). En el **servicio API** de Render (Dashboard → tu servicio backend → **Environment**) define:
- **FRONTEND_URL**: URL del frontend (ej. `https://stream-schedule-v1.onrender.com`). Si no está definida, tras autorizar en Twitch la redirección va a `http://localhost:3000` y verás `bad_oauth_state` en localhost.
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

---

## Licencia

Copyright © 2024-2026 Christian David Villar Colodro. Todos los derechos reservados.

Este software es propietario y confidencial. La copia, distribución o modificación no autorizada está prohibida.

Ver archivo `LICENSE` para más detalles.

---

## Documentación

Índice completo: **[docs/README.md](docs/README.md)** (protección legal, términos y scripts SQL).

Documentación en la raíz del repo:

| Archivo | Descripción |
|--------|-------------|
| [COPYRIGHT_NOTICE.md](COPYRIGHT_NOTICE.md) | Aviso de copyright y contacto. |
| [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md) | Términos de servicio (EN/ES). |
| [LEGAL_PROTECTION.md](LEGAL_PROTECTION.md) | Guía de protección legal. |
| [PROTECTION_SUMMARY.md](PROTECTION_SUMMARY.md) | Resumen de protecciones implementadas. |
| [PROTECTION_CHECKLIST.md](PROTECTION_CHECKLIST.md) | Checklist pre-despliegue. |

Scripts SQL para Supabase (ejecutar en el SQL Editor del proyecto):

- `SUPABASE_RLS_ALL_TABLES.sql` – Habilitar RLS en tablas públicas.
- `SUPABASE_STORAGE_POLICIES.sql` – Políticas del bucket de almacenamiento.

---

## Soporte

Para incidencias, preguntas o soporte, contacta al equipo de desarrollo.

---

**Versión:** 2.1.0  
**Última actualización:** Enero 2026
