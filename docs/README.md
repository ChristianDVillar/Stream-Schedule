# Índice de documentación

Este archivo es el **índice de la carpeta docs/** (no el README del proyecto; el README principal está en la raíz: [README.md](../README.md)).

Documentación de **Streamer Scheduler** (protección, licencia, scripts).

## Estructura y funcionalidad

- **[ESTRUCTURA_Y_FUNCIONALIDAD.md](ESTRUCTURA_Y_FUNCIONALIDAD.md)** – Estructura de carpetas/archivos del proyecto y descripción de la funcionalidad (backend, frontend, rutas API, servicios, modelos, páginas y flujos principales).

## Información para usuarios

- **[GUIA-USUARIOS.md](GUIA-USUARIOS.md)** – Guía para usuarios finales (español): qué es la aplicación, registro, dashboard, programar contenido, to-do, media, plantillas, perfil, configuración, conectar plataformas, licencias, idioma y tema.
- **[USER-GUIDE.md](USER-GUIDE.md)** – User guide (English): same content for end users.
- **[FAQ_ES.md](FAQ_ES.md)** – Preguntas frecuentes en español.
- **[FAQ_EN.md](FAQ_EN.md)** – Frequently asked questions in English.

## Monitor y producción

- **Health:** `GET /api/health/live` → 200 OK (liveness, p. ej. Render). `GET /api/health/ready` → DB + Redis; 200 si listo. `GET /api/health` → completo: `status`, `redis`, `db`, `dbResponseTimeMs`, `memoryUsageMb`, `queue`, `uptimeSeconds`.
- **Monitor externo (recomendado):** UptimeRobot o Better Stack; intervalo 5 min; alerta si falla 2 veces seguidas (si el servidor cae, la app no puede enviar alertas).
- **Webhooks Discord:** En producción no guardes URLs en texto plano. Usa variables de entorno `DISCORD_DEV_WEBHOOK` y `DISCORD_STATUS_WEBHOOK` (p. ej. en Render). Si expones una URL, elimina el webhook en Discord y crea uno nuevo.
- **Backups Supabase:** Verificar frecuencia y retención en el dashboard; programar al menos una restauración de prueba en staging para confirmar que se puede recuperar datos.

## Redis / Upstash

- **Límite plan gratuito:** Upstash free tier suele tener **500.000 requests/mes**. Si aparece `ERR max requests limit exceeded`, se ha superado ese límite.
- **Qué hace la app:** Usa Redis para la cola de publicaciones (BullMQ), health checks, rate limiting y bloqueos. Cada operación de cola, ping o estadísticas consume requests.
- **Reducción de uso (ya aplicada en código):**
  - El scheduler que encola trabajos corre cada **60 segundos** por defecto (configurable con `SCHEDULER_INTERVAL_MS` en env). Aumentar a `120000` (2 min) reduce aún más el uso.
  - Las estadísticas de cola en `/api/health` y `/api/health/queue` se **cachean 30 segundos** para no golpear Redis en cada petición.
- **Si sigues superando el límite:** (1) Aumentar `SCHEDULER_INTERVAL_MS` (p. ej. `120000` o `180000` en Render). (2) Reducir frecuencia del monitor externo que llame a `/api/health`. (3) Pasar a plan de pago en Upstash (pay-as-you-go o plan fijo). Ver [Upstash – max requests limit](https://upstash.com/docs/redis/troubleshooting/max_requests_limit).

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
- **[SUPABASE_FIX_DUPLICATE_INDEXES.sql](../SUPABASE_FIX_DUPLICATE_INDEXES.sql)** – Eliminar indices duplicados (AuditLogs, Users, Integrations) que reporta Supabase.

Para la tabla `uploads` (tipo de `user_id`), ver comentarios en `backend/src/routes/uploads.js` y el script en `backend/migrations/fix-uploads-user-id-type.sql`.

## Supabase Auth (opcional)

- **Proteccion de contraseñas filtradas:** Supabase puede comprobar contraseñas contra HaveIBeenPwned.org. Para activarla: **Supabase Dashboard** → **Authentication** → **Policies** (o **Settings**) → activar **“Leaked password protection”** (o equivalente en la seccion de seguridad). Asi se reduce el uso de contraseñas comprometidas.