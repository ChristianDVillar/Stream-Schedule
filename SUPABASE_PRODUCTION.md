# Supabase en producción (Resend + URLs)

Guía paso a paso para dejar Supabase listo para **producción**: emails con Resend, URLs correctas y plantillas.

**URL de producción de ejemplo:** `https://stream-schedule-v1.onrender.com`  
*(Reemplaza por tu URL real de frontend en Render o tu dominio.)*

---

## FASE 1 — Crear y preparar Resend (producción)

### 1. Crear cuenta en Resend

- Ir a **https://resend.com**
- Registrarse (puede ser con Google).

### 2. Crear API Key

- En Resend: **API Keys** → **Create API Key**
- Copiar y guardar la clave (empieza por `RE_...`).
- **No subirla a GitHub** (solo en variables de entorno).

### 3. (Recomendado) Añadir dominio propio

Cuando tengas dominio (ej: `streamschedule.app`):

- En Resend: **Domains** → **Add Domain**
- Añadir el dominio (ej: `streamschedule.app`)
- Resend mostrará registros **DKIM**, **SPF** y **MX**
- Añadir esos registros en el DNS de tu proveedor
- Esperar a que Resend marque el dominio como verificado

### 4. Crear sender

- **Sender email:** `noreply@tudominio.com` (o `onboarding@resend.dev` si aún no tienes dominio)
- **Sender name:** `Stream Schedule`

---

## FASE 2 — Configurar SMTP de Resend en Supabase

1. **Supabase Dashboard** → **Authentication** → **Emails** → **SMTP Settings**
2. Activar **Enable custom SMTP**.

**Sender details**

| Campo | Valor (con dominio) | Valor (sin dominio) |
|-------|---------------------|----------------------|
| Sender email | `noreply@tudominio.com` | `onboarding@resend.dev` |
| Sender name | `Stream Schedule` | `Stream Schedule` |

**SMTP provider (Resend)**

| Campo | Valor |
|-------|--------|
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` |
| Password | Tu API Key de Resend (`RE_...`) |
| Minimum interval per user | `60` |

3. **Guardar** los cambios.

### Ajustes de Authentication (producción)

En **Authentication** → **Settings** (o **Providers** según versión):

**Activar:**

- Confirm sign up
- Reset password
- Change email address
- Reauthentication

**Desactivar (si usas solo OAuth para login):**

- Magic link

**Seguridad (recomendado):**

- Password changed
- Email address changed
- Identity linked
- Identity unlinked

---

## FASE 3 — URLs en Supabase (crítico)

Sin esto, login con Google/Twitch y “reset password” pueden fallar.

1. **Authentication** → **URL Configuration**

**Site URL**

- Producción: `https://stream-schedule-v1.onrender.com`  
  *(o tu URL real de frontend, sin barra final)*

**Redirect URLs** — añadir **todas** estas:

```
http://localhost:3000
http://localhost:3000/**
https://stream-schedule-v1.onrender.com
https://stream-schedule-v1.onrender.com/**
```

Si usas otro dominio (ej: `https://streamschedule.app`), añade también:

```
https://streamschedule.app
https://streamschedule.app/**
```

- Guardar.
- Si algo falla en login o reset, revisar que la URL a la que redirige Supabase esté en esta lista.

---

## FASE 4 — Plantillas de email (producción)

En **Authentication** → **Emails** → **Templates** puedes personalizar los correos.

### Confirm Sign Up

```html
<h2>Welcome to Stream Schedule</h2>
<p>Confirm your email to activate your account.</p>
<a href="{{ .ConfirmationURL }}">Confirm account</a>
```

### Reset Password

```html
<h2>Reset your password</h2>
<p>Click the button below to reset your password.</p>
<a href="{{ .ConfirmationURL }}"
   style="padding:12px 20px;background:#5865F2;color:#fff;text-decoration:none;border-radius:6px">
  Reset password
</a>
<p>If you didn't request this, ignore this email.</p>
```

*(Supabase usa `{{ .ConfirmationURL }}` en sus plantillas; no cambiar ese nombre.)*

---

## FASE 5 — Código frontend (producción)

### OAuth (Google / Twitch)

El frontend ya usa el **origen actual** (`window.location.origin`) para el redirect de OAuth, así que en producción redirigirá a tu URL de Render o dominio. No hace falta cambiar código si las Redirect URLs de Supabase están bien (Fase 3).

### Reset password con Supabase

Si en el futuro usas el flujo de Supabase para “olvidé mi contraseña” (Supabase envía el correo y el usuario llega a tu app por enlace), usa el helper del frontend para que el redirect funcione en local y en producción:

```js
import { getPasswordResetRedirectUrl } from '../api';
import { supabase } from '../utils/supabaseClient';

await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: getPasswordResetRedirectUrl()
});
```

**Nota:** Hoy la app usa el endpoint del backend `POST /user/forgot-password` (contraseña temporal generada en backend). Si quieres que Supabase envíe el enlace de “reset” por email, habría que usar `resetPasswordForEmail` en el frontend y tener una ruta/página `/reset-password` que reciba el token y llame a `supabase.auth.updateUser({ password })`.

### Cambio de contraseña (una vez logueado)

```js
await supabase.auth.updateUser({
  password: newPassword
})
```

---

## FASE 6 — Verificaciones finales

Checklist antes de dar por cerrada la configuración:

- [ ] SMTP activo en Supabase (Resend)
- [ ] Dominio verificado en Resend (si aplica)
- [ ] Site URL = URL de producción del frontend
- [ ] Redirect URLs incluyen `https://tu-frontend.onrender.com` y `https://tu-frontend.onrender.com/**`
- [ ] Emails de prueba llegan (revisar carpeta spam la primera vez)
- [ ] Reset password / confirmación de cuenta funcionan
- [ ] Login con Google / Twitch / Discord redirige bien a tu frontend

---

## Resumen rápido

| Tema | Qué hacer |
|------|-----------|
| Emails | Resend como SMTP en Supabase + dominio propio si puedes |
| Seguridad | Activar notificaciones (password changed, identity linked, etc.) |
| Rate limit | Mínimo 60 s entre emails por usuario |
| OAuth | No depender de Magic link; usar Redirect URLs exactas |
| Branding | Mismo sender (nombre y dominio) en todos los correos |

Con esto, Supabase queda listo para producción con emails fiables y OAuth funcionando desde tu URL de producción.
