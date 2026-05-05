# Documentación (índice)

Índice de la carpeta **docs/** del monorepo **Streamer Scheduler**. README del producto: [README.md](../README.md) (ES) · [README.en.md](../README.en.md) (EN).

## Información para usuarios

- **[GUIA-USUARIOS.md](GUIA-USUARIOS.md)** – Guía en español para usuarios finales.
- **[USER-GUIDE.md](USER-GUIDE.md)** – User guide en inglés.
- **[FAQ_ES.md](FAQ_ES.md)** – Preguntas frecuentes (español).
- **[FAQ_EN.md](FAQ_EN.md)** – FAQ (English).

## Integraciones (usuarios)

- **[DISCORD-BOT-PERMISSIONS.md](DISCORD-BOT-PERMISSIONS.md)** – Permisos del bot de Discord para publicar en canales y eventos.

## Legal

- **[COPYRIGHT_NOTICE.md](legal/COPYRIGHT_NOTICE.md)** – Aviso de copyright.
- **[TERMS_OF_SERVICE.md](legal/TERMS_OF_SERVICE.md)** – Términos de servicio (EN/ES).
- **[LEGAL_PROTECTION.md](legal/LEGAL_PROTECTION.md)** – Guía de protección legal.
- **[PROTECTION_SUMMARY.md](legal/PROTECTION_SUMMARY.md)** – Resumen de protecciones.
- **[PROTECTION_CHECKLIST.md](legal/PROTECTION_CHECKLIST.md)** – Checklist pre‑despliegue.
- **[AKOENET_CONTRACT.md](legal/AKOENET_CONTRACT.md)** – Contrato técnico compartido (payloads, variables).

## Scripts SQL (Supabase)

Ejecutar en **Supabase Dashboard → SQL Editor**:

- **[SUPABASE_RLS_ALL_TABLES.sql](../SUPABASE_RLS_ALL_TABLES.sql)** – RLS en tablas públicas.
- **[SUPABASE_STORAGE_POLICIES.sql](../SUPABASE_STORAGE_POLICIES.sql)** – Políticas de buckets `images` y `videos`.
- **[SUPABASE_FIX_DUPLICATE_INDEXES.sql](../SUPABASE_FIX_DUPLICATE_INDEXES.sql)** – Índices duplicados reportados por Supabase.

Para la tabla `uploads` (tipo de `user_id`), ver `apps/api/src/routes/uploads.js` y `apps/api/migrations/fix-uploads-user-id-type.sql`.
