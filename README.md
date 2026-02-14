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

### Producción: OAuth (Google / Twitch) en Render

Para que el login con Google o Twitch no redirija a localhost:

1. **Supabase** → Tu proyecto → **Authentication** → **URL Configuration**
   - **Site URL**: tu URL de producción (ej. `https://stream-schedule-v1.onrender.com`)
   - **Redirect URLs**: añade `https://tu-dominio.onrender.com/auth/callback` (y mantén `http://localhost:3000/auth/callback` para desarrollo)
2. La app usa el origen actual para la redirección OAuth; no hace falta `REACT_APP_FRONTEND_URL` en producción.

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
