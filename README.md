# Streamer Scheduler

A web application to schedule and manage content across multiple social platforms from a single place.

Una aplicacion web para programar y gestionar contenido en multiples plataformas sociales desde un solo lugar.

---

## What it does / Que hace

Streamer Scheduler is a comprehensive content management platform that allows content creators and streamers to:

Streamer Scheduler es una plataforma completa de gestion de contenido que permite a creadores de contenido y streamers:

- **Schedule posts** across multiple platforms (Twitch, Twitter/X, Instagram, Discord, YouTube, TikTok)
- **Programar publicaciones** en multiples plataformas (Twitch, Twitter/X, Instagram, Discord, YouTube, TikTok)
- **Manage content** with a visual calendar interface
- **Gestionar contenido** con una interfaz de calendario visual
- **Upload media** (images and videos) with secure storage
- **Subir multimedia** (imagenes y videos) con almacenamiento seguro
- **Track performance** and manage multiple accounts
- **Rastrear rendimiento** y gestionar multiples cuentas
- **Multi-language support** (Spanish and English)
- **Soporte multiidioma** (Espanol e Ingles)

---

## Features / Caracteristicas

### Current Features / Caracteristicas Actuales

- ✅ **Multi-platform scheduling** - Schedule content for Twitch, Twitter/X, Instagram, Discord
- ✅ **Programacion multiplataforma** - Programa contenido para Twitch, Twitter/X, Instagram, Discord
- ✅ **Visual calendar** - Drag and drop interface for easy content management
- ✅ **Calendario visual** - Interfaz de arrastrar y soltar para facil gestion de contenido
- ✅ **License system** - Trial, Monthly, Quarterly, and Lifetime plans
- ✅ **Sistema de licencias** - Planes Trial, Mensual, Trimestral y Permanente
- ✅ **Admin dashboard** - Complete user and license management
- ✅ **Panel de administracion** - Gestion completa de usuarios y licencias
- ✅ **OAuth authentication** - Login with Google and Twitch
- ✅ **Autenticacion OAuth** - Inicio de sesion con Google y Twitch
- ✅ **Payment integration** - Stripe integration for license purchases
- ✅ **Integracion de pagos** - Integracion con Stripe para compra de licencias
- ✅ **Media uploads** - Secure file uploads with trial/pro limits
- ✅ **Subida de archivos** - Subida segura de archivos con limites trial/pro
- ✅ **Input validation** - Comprehensive validation with Joi schemas
- ✅ **Validacion de inputs** - Validacion completa con schemas Joi
- ✅ **Structured logging** - Winston-based logging system
- ✅ **Logging estructurado** - Sistema de logging basado en Winston

### Planned Features / Caracteristicas Planificadas

- 🔄 **Content automation** - Automatic posting to platforms
- 🔄 **Automatizacion de contenido** - Publicacion automatica en plataformas
- 🔄 **Analytics dashboard** - Performance metrics and insights
- 🔄 **Panel de analiticas** - Metricas de rendimiento e insights
- 🔄 **Content templates** - Reusable content templates
- 🔄 **Plantillas de contenido** - Plantillas de contenido reutilizables
- 🔄 **Team collaboration** - Multi-user team management
- 🔄 **Colaboracion en equipo** - Gestion de equipos multi-usuario
- 🔄 **Advanced scheduling** - Recurring posts and bulk operations
- 🔄 **Programacion avanzada** - Publicaciones recurrentes y operaciones masivas
- 🔄 **Content library** - Media library with search and organization
- 🔄 **Biblioteca de contenido** - Biblioteca de medios con busqueda y organizacion
- 🔄 **API access** - RESTful API for third-party integrations
- 🔄 **Acceso API** - API RESTful para integraciones de terceros

---

## Technology Stack / Stack Tecnologico

### Backend
- **Node.js** with Express.js
- **PostgreSQL** (Supabase) / SQLite for development
- **Sequelize** ORM for database management
- **JWT** for authentication
- **Stripe** for payment processing
- **Supabase Storage** for media files
- **Winston** for structured logging
- **Joi** for input validation

### Frontend
- **React** 18.2
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Axios** for API communication
- **React Hot Toast** for notifications
- **Lucide React** for icons
- **Supabase JS** for storage operations

---

## Security Features / Caracteristicas de Seguridad

- 🔒 **Secure password generation** - Uses crypto.randomBytes for all tokens and keys
- 🔒 **Generacion segura de contraseñas** - Usa crypto.randomBytes para todos los tokens y claves
- **Input validation** - Comprehensive validation prevents XSS and injection attacks
- **Validacion de inputs** - Validacion completa previene ataques XSS e inyeccion
- **SQL injection protection** - Parameterized queries throughout
- **Proteccion contra inyeccion SQL** - Consultas parametrizadas en todo el codigo
- **JWT authentication** - Secure token-based authentication
- **Autenticacion JWT** - Autenticacion segura basada en tokens
- **Rate limiting** - Protection against brute force attacks
- **Limitacion de velocidad** - Proteccion contra ataques de fuerza bruta
- **Structured logging** - Security event logging
- **Logging estructurado** - Registro de eventos de seguridad

---

## Installation / Instalacion

### Prerequisites / Requisitos Previos

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (or SQLite for development)
- Supabase account (for storage)
- Stripe account (for payments)

### Backend Setup / Configuracion del Backend

```bash
cd backend
npm install
cp env.example .env
# Edit .env with your configuration
npm start
```

### Frontend Setup / Configuracion del Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm start
```

---

## Environment Variables / Variables de Entorno

### Backend

See `backend/env.example` for all required variables.

Ver `backend/env.example` para todas las variables requeridas.

### Frontend

- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_SUPABASE_URL` - Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` - Supabase anonymous key

---

## License / Licencia

Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.

Este software es propietario y confidencial. La copia, distribucion o modificacion no autorizada esta estrictamente prohibida.

See `LICENSE` file for details.

Ver archivo `LICENSE` para detalles.

---

## Documentation / Documentacion

- `SECURITY_AUDIT.md` - Security audit and recommendations
- `SECURITY_FIXES_APPLIED.md` - Applied security fixes
- `COPYRIGHT_NOTICE.md` - Copyright information
- `TERMS_OF_SERVICE.md` - Terms of service
- `LEGAL_PROTECTION.md` - Legal protection information

---

## Support / Soporte

For issues, questions, or support, please contact the development team.

Para problemas, preguntas o soporte, por favor contacte al equipo de desarrollo.

---

**Version:** 2.1.0  
**Last Updated:** January 2026  
**Ultima Actualizacion:** Enero 2026
