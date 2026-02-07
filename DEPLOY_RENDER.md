# Despliegue en Render

## CORS (frontend en otro dominio)

Si el frontend está en Render (por ejemplo `https://stream-schedule-v1.onrender.com`) y la API en otro servicio (`https://stream-schedule-api.onrender.com`), el navegador bloqueará las peticiones si la API no permite el origen del frontend.

**En el servicio de la API (backend)** → **Environment** → añade:

- **`FRONTEND_URL`** = `https://stream-schedule-v1.onrender.com` (la URL exacta de tu frontend, sin barra final)

Para permitir varios orígenes (por ejemplo frontend de producción + preview):

- **`FRONTEND_URLS`** = `https://stream-schedule-v1.onrender.com,https://otro-dominio.onrender.com`

Sin `FRONTEND_URL` (o `FRONTEND_URLS`) en producción, la API usa `http://localhost:3000` y verás errores de CORS.

---

## Base de datos: ejecutar migraciones

Si en producción ves errores como **`column "googleId" does not exist`** o **`column "twitchId" does not exist`**, la base de datos no tiene aplicadas todas las migraciones.

### Opción recomendada: Release Command

En el servicio **Backend** de Render:

1. **Dashboard** → tu servicio **Web Service** (backend).
2. **Settings** → **Build & Deploy** → **Release Command**.
3. Pon: `npm run migrate`
4. Guarda. En cada deploy, Render ejecutará las migraciones antes de levantar la nueva instancia.

Asegúrate de que en **Environment** tengas `DATABASE_URL` (y opcionalmente `DATABASE_SSL=true` para Supabase).

### Ejecutar migraciones una sola vez (Shell)

Si prefieres no usar Release Command:

1. **Dashboard** → tu servicio → **Shell** (o conectarte por SSH si está disponible).
2. En el directorio del backend: `npm run migrate`
3. Comprueba que no haya errores y vuelve a desplegar si hace falta.

---

## OAuth (Google / Twitch / Discord)

- Las rutas de link de Discord (`/api/user/auth/discord/link` y `.../link/callback`) están registradas en el router de user; si alguna vez devolvía 404, con el código actual deberían responder bien.
- Para que login con Google/Twitch funcione, la tabla `Users` debe tener las columnas `googleId`, `twitchId`, `discordId` (migración `20260203000000-add-linked-oauth-ids.js`). Por eso es importante tener las migraciones aplicadas en la base de producción.

---

## Supabase (emails y OAuth en producción)

Para que los correos (confirmación, reset de contraseña) y el login con Google/Twitch funcionen en producción:

1. **Configurar Supabase + Resend**  
   Sigue la guía **[SUPABASE_PRODUCTION.md](./SUPABASE_PRODUCTION.md)** (Resend como SMTP, URLs, plantillas).

2. **URLs que debes tener en Supabase**  
   En **Authentication** → **URL Configuration**:
   - **Site URL:** tu frontend en producción, ej. `https://stream-schedule-v1.onrender.com`
   - **Redirect URLs:** añade al menos:
     - `https://stream-schedule-v1.onrender.com`
     - `https://stream-schedule-v1.onrender.com/**`
     - `http://localhost:3000` y `http://localhost:3000/**` para desarrollo

Si estas URLs no están bien configuradas, el login con Google/Twitch puede redirigir a localhost o devolver errores.
