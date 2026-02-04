# Implementaciones pendientes o incompletas

Revisión del proyecto para identificar lo que falta o está creado pero no integrado.

---

## 1. Frontend – Estado global de auth (AuthProvider)

- **Estado:** Creado en `frontend/src/store/authStore.js` (AuthProvider, useAuth) pero **no integrado**.
- **Actual:** `App.js` usa `useState` + `getStoredAuth()` para user/token.
- **Pendiente:** Envolver la app con `<AuthProvider>` y sustituir estado local por `useAuth()` en `App.js` y en rutas que reciben `user`/`token` por props.

---

## 2. Frontend – Componentes no usados

- **SearchAdvanced** (`frontend/src/components/SearchAdvanced.js`): creado, **no importado** en ninguna página. El Dashboard tiene búsqueda y filtros propios pero no usa este componente.
- **ContentPreview** (`frontend/src/components/ContentPreview.js`): creado, **no importado**. Podría usarse en Schedule o Dashboard para previsualizar contenido por plataforma.
- **OnboardingTour** (`frontend/src/components/OnboardingTour.js`): creado (react-joyride), **no importado**. Schedule.js tiene pasos de tour en estado pero no usa este componente.
- **LazyLoader** (`frontend/src/components/LazyLoader.js`): creado, **no importado**. Podría usarse para rutas con `React.lazy()`.

---

## 3. Frontend – Plantillas de contenido

- **Backend:** `/api/templates` y modelo `ContentTemplate` implementados.
- **Frontend:** `frontend/src/api-templates.js` con getTemplates, createTemplate, etc.
- **Pendiente:** No hay página ni sección en la UI para listar/crear/editar plantillas ni para “crear contenido desde plantilla” en Schedule.

---

## 4. Backend – Email / notificaciones

- **Archivo:** `backend/src/utils/notifications.js`.
- **Estado:** Placeholder: solo log, no envía emails.
- **TODOs en código:**
  - `backend/src/routes/user.js`: “TODO: Send password via secure channel”; “TODO: In production, send email with reset link or temporary password” (flujo de olvidar contraseña).
- **Pendiente:** Integrar un servicio real (SendGrid, AWS SES, etc.) si se quieren emails de restablecimiento de contraseña y avisos de licencia.

---

## 5. Backend – CSRF y frontend

- **Estado:** CSRF deshabilitado en `/api/content` y `/api/templates` porque el frontend no envía token.
- **Pendiente:** Para reactivar CSRF:
  - Frontend: llamar a `GET /api/csrf-token` al cargar (o al entrar a Settings/Schedule) y enviar el valor en el header `X-CSRF-Token` en POST/PUT/DELETE a content y templates.
  - Backend: volver a aplicar `csrfProtection` a esas rutas.

---

## 6. Backend – Twitch API real

- **Estado:** `twitchService.js` existe; estadísticas de dashboard siguen con datos placeholder si no hay token de usuario con scopes.
- **Pendiente:** Usar tokens de Twitch del usuario (OAuth) para llamar a Helix (suscripciones, bits, etc.) y rellenar datos reales en `/api/user/twitch-dashboard-stats`.

---

## 7. Documentación de mejoras

- **IMPROVEMENTS_IMPLEMENTED.md:** Está desactualizado (por ejemplo, indica CSRF y plantillas como pendientes cuando parte ya está hecha; no refleja que CSRF está desactivado en content/templates).
- **Pendiente:** Actualizar el doc para reflejar estado real (AuthProvider no integrado, componentes no usados, plantillas sin UI, email placeholder, CSRF desactivado por falta de token en frontend).

---

## Resumen de prioridad

| Prioridad | Item | Esfuerzo |
|-----------|------|----------|
| Alta | Integrar AuthProvider en App.js | Bajo |
| Alta | Usar SearchAdvanced en Dashboard (opcional) | Bajo |
| Media | UI de plantillas (lista/crear/editar y “crear desde plantilla”) | Medio |
| Media | Frontend: obtener y enviar CSRF token para content/templates | Bajo |
| Baja | Conectar OnboardingTour en Schedule | Bajo |
| Baja | Usar ContentPreview en Schedule/Dashboard | Bajo |
| Baja | Email real (forgot password, avisos licencia) | Medio (depende de servicio) |
| Baja | Twitch API real con tokens de usuario | Medio |

Si quieres, el siguiente paso puede ser: integrar AuthProvider en App y, opcionalmente, usar SearchAdvanced en Dashboard y añadir enlace/UI básica a plantillas en Settings o Schedule.
