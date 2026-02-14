# Documentacion del proyecto

Indice de documentacion de **Streamer Scheduler** (proteccion, licencia y scripts).

## Legal y terminos

- **[COPYRIGHT_NOTICE.md](../COPYRIGHT_NOTICE.md)** – Aviso de copyright y contacto.
- **[TERMS_OF_SERVICE.md](../TERMS_OF_SERVICE.md)** – Terminos de servicio (EN/ES).
- **[LEGAL_PROTECTION.md](../LEGAL_PROTECTION.md)** – Guia de proteccion legal.
- **[PROTECTION_SUMMARY.md](../PROTECTION_SUMMARY.md)** – Resumen de protecciones implementadas.
- **[PROTECTION_CHECKLIST.md](../PROTECTION_CHECKLIST.md)** – Checklist pre-despliegue.

## Scripts SQL (Supabase)

Ejecutar en **Supabase Dashboard – SQL Editor**:

- **[SUPABASE_RLS_ALL_TABLES.sql](../SUPABASE_RLS_ALL_TABLES.sql)** – Habilitar RLS en todas las tablas publicas.
- **[SUPABASE_STORAGE_POLICIES.sql](../SUPABASE_STORAGE_POLICIES.sql)** – Politicas de los buckets `images` y `videos`.

Para la tabla `uploads` (tipo de `user_id`), ver comentarios en `backend/src/routes/uploads.js` y el script en `backend/migrations/fix-uploads-user-id-type.sql`.
