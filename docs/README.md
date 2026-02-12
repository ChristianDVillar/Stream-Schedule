# Documentación del proyecto

Índice de la documentación de **Streamer Scheduler**. Los archivos están en la raíz del repositorio.

## Legal y términos

- **[COPYRIGHT_NOTICE.md](../COPYRIGHT_NOTICE.md)** – Aviso de copyright y contacto.
- **[TERMS_OF_SERVICE.md](../TERMS_OF_SERVICE.md)** – Términos de servicio (EN/ES).
- **[LEGAL_PROTECTION.md](../LEGAL_PROTECTION.md)** – Guía de protección legal.
- **[PROTECTION_SUMMARY.md](../PROTECTION_SUMMARY.md)** – Resumen de protecciones implementadas.
- **[PROTECTION_CHECKLIST.md](../PROTECTION_CHECKLIST.md)** – Checklist pre-despliegue.

## Despliegue y configuración

- **[DEPLOY_RENDER.md](../DEPLOY_RENDER.md)** – Despliegue en Render (CORS, migraciones, variables).
- **[SUPABASE_PRODUCTION.md](../SUPABASE_PRODUCTION.md)** – Configuración de Supabase en producción y Resend.
- **[TWITTER_SETUP.md](../TWITTER_SETUP.md)** – Configuración de Twitter/X OAuth para publicación.

## Arquitectura y sistema

- **[SISTEMA_Y_TECNOLOGIAS.md](../SISTEMA_Y_TECNOLOGIAS.md)** – Visión general, arquitectura, flujos y tecnologías.
- **[SCHEDULER_MEJORAS_IMPLEMENTADAS.md](../SCHEDULER_MEJORAS_IMPLEMENTADAS.md)** – Mejoras del scheduler (estados, idempotencia, colas).

## Scripts SQL (Supabase)

Ejecutar en **Supabase Dashboard → SQL Editor**:

- **[SUPABASE_RLS_ALL_TABLES.sql](../SUPABASE_RLS_ALL_TABLES.sql)** – Habilitar RLS en todas las tablas públicas.
- **[SUPABASE_STORAGE_POLICIES.sql](../SUPABASE_STORAGE_POLICIES.sql)** – Políticas de los buckets `images` y `videos`.

Para la tabla `uploads` en Supabase (tipo de `user_id`), ver comentarios en `backend/src/routes/uploads.js` y el script en `backend/migrations/fix-uploads-user-id-type.sql`.
