# Índice de documentación

Este archivo es el **índice de la carpeta docs/** (no el README del proyecto; el README principal está en la raíz: [README.md](../README.md)).

Documentación de **Streamer Scheduler** (protección, licencia, scripts).

## Información para usuarios

- **[GUIA-USUARIOS.md](GUIA-USUARIOS.md)** – Guía para usuarios finales (español): qué es la aplicación, registro, dashboard, programar contenido, perfil, conectar plataformas, licencias, idioma y tema.
- **[USER-GUIDE.md](USER-GUIDE.md)** – User guide (English): same content for end users.

## Monitor y producción

- **Health:** `GET /api/health/live` → 200 OK (liveness, p. ej. Render). `GET /api/health/ready` → DB + Redis; 200 si listo. `GET /api/health` → completo: `status`, `redis`, `db`, `dbResponseTimeMs`, `memoryUsageMb`, `queue`, `uptimeSeconds`.
- **Monitor externo (recomendado):** UptimeRobot o Better Stack; intervalo 5 min; alerta si falla 2 veces seguidas (si el servidor cae, la app no puede enviar alertas).
- **Webhooks Discord:** En producción no guardes URLs en texto plano. Usa variables de entorno `DISCORD_DEV_WEBHOOK` y `DISCORD_STATUS_WEBHOOK` (p. ej. en Render). Si expones una URL, elimina el webhook en Discord y crea uno nuevo.
- **Backups Supabase:** Verificar frecuencia y retención en el dashboard; programar al menos una restauración de prueba en staging para confirmar que se puede recuperar datos.

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