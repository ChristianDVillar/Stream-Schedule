# Análisis de cambios realizados

Resumen de las modificaciones aplicadas al proyecto (Stripe live, notificaciones, admin UX, navegación y versión).

---

## 1. Documentación Stripe (modo Live)

- **Archivo:** `STRIPE_PASO_A_PASO_LIVE.md` (raíz del repo).
- **Contenido:** Pasos para usar Stripe en modo live: activar cuenta, claves Live (`sk_live_*`, `pk_live_*`), webhook en modo Live, variables de entorno (Backend/Frontend), no dejar claves de test en producción.

---

## 2. Sistema de notificaciones (admin → usuarios)

### Backend

- **Migración:** `backend/migrations/20260212000000-create-notifications.js`
  - Tabla `Notifications`: id, userId (null = broadcast), title, content, createdBy, timestamps.
  - Tabla `NotificationReads`: id, notificationId, userId, readAt (marca de leído por usuario).
- **Modelos:** `Notification.js`, `NotificationRead.js` en `backend/src/models/`, registrados y asociados en `index.js`.
- **Rutas:** `backend/src/routes/notifications.js`
  - `POST /api/notifications` (admin): crear notificación (title, content, broadcast o userId).
  - `GET /api/notifications`: listar notificaciones del usuario (propias + broadcast).
  - `GET /api/notifications/unread-count`: contar no leídas.
  - `PATCH /api/notifications/:id/read`: marcar como leída.
- **App:** `app.use('/api/notifications', notificationsRoutes)` en `app.js`.

### Frontend – API y páginas

- **api.js:** `getNotifications`, `getNotificationsUnreadCount`, `markNotificationRead`, `sendNotification`.
- **AdminDashboard – sección Notificaciones:** formulario “Enviar notificación a usuarios” (título, contenido, “Enviar a todos”).
- **Página /messages:** `MessagesPage.js`: listado de notificaciones + “Respuestas de soporte” (MyMessages).
- **Header (solo no admin):** icono de mensajes (MessageSquare) que abre dropdown con:
  - **Respuestas:** conversaciones con respuestas de soporte (azul).
  - **Notificaciones:** avisos del admin (ámbar), con estado leído/no leído.
- **Sidebar:** enlace “Mensajes” a `/messages` (i18n: common.messages).

---

## 3. Admin Dashboard – UX y navegación

### Menú lateral integrado en el sidebar principal

- Los ítems del panel admin están en el **mismo `<nav>`** que Dashboard, Settings y Profile (en `App.js`).
- Para **admin:** primer ítem “Dashboard” → `/admin` (resumen del panel). Luego: Overview, Users, Support, Notifications, Payments (`/admin?section=...`). Sin ítem duplicado “Admin dashboard”.
- Para **usuario:** Dashboard → `/dashboard`, Schedule, Templates, Media, Mensajes, Settings, Profile.

### Contenido por secciones (`?section=`)

- **Overview:** bienvenida, estadísticas, recordatorio de contraseñas, configuración de licencias, licencias por renovar, ganancias mensuales.
- **Users:** crear usuario, licencias asignadas, licencias por renovar, tabla de usuarios con acciones.
- **Support:** consultas a soporte (mensajes) con filtros, lista y modal de respuesta.
- **Notifications:** formulario para enviar notificaciones a usuarios.
- **Payments:** listado de pagos con filtros y export CSV/JSON.

### i18n (inglés y español)

- Claves nuevas en `admin.*` (menú, licencias, pagos, notificaciones, soporte, modales, etc.) en `frontend/src/locales/en.json` y `es.json`.
- Textos del admin y del sidebar (p. ej. “Mensajes”) pasan a usar `t()`.

### Eliminación de duplicados

- **Dashboard vs AdminDashboard:** antes “Dashboard” y “Admin dashboard” llevaban a lo mismo para admin. Ahora:
  - “Dashboard” para admin → `/admin` (panel admin).
  - Eliminado el ítem “Admin dashboard” del sidebar.
  - En `Dashboard.js` se quitó la rama que renderizaba `AdminDashboard` cuando el usuario era admin; `Dashboard` es solo vista de usuario (calendario, contenido). Los admins no pueden acceder a `/dashboard` (UserRoute los bloquea).

---

## 4. Footer y versión

- **Archivo de versión:** `frontend/src/version.js` exporta `APP_VERSION = '2.1.0'` (alineado con backend).
- **Footer (App.js):** muestra “© 2025 Christian · Develop · v2.1.0” (usa `APP_VERSION`), con estilos para modo claro/oscuro y borde.
- **package.json (frontend):** `version` actualizado a `2.1.0` para coincidir.

Al publicar una nueva versión, actualizar:

- `frontend/src/version.js` (APP_VERSION)
- `frontend/package.json` (version)
- `backend/src/app.js` y `backend/src/routes/health.js` (version en respuestas) si se desea mantener la misma versión en API.

---

## Archivos principales tocados

| Área              | Archivos |
|-------------------|----------|
| Stripe            | `STRIPE_PASO_A_PASO_LIVE.md` |
| Notificaciones BE | `migrations/20260212000000-create-notifications.js`, `models/Notification.js`, `models/NotificationRead.js`, `models/index.js`, `routes/notifications.js`, `app.js` |
| Notificaciones FE | `api.js`, `AdminDashboard.js`, `MessagesPage.js`, `MessagesAndNotificationsDropdown.js`, `App.js` (Header, rutas, sidebar) |
| Admin UX / i18n    | `AdminDashboard.js`, `locales/en.json`, `locales/es.json` |
| Navegación        | `App.js` (Sidebar), `Dashboard.js` (eliminado render de AdminDashboard para admin) |
| Versión / footer   | `frontend/src/version.js`, `frontend/src/App.js`, `frontend/package.json` |
