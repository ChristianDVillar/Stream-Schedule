# Desactivar Revisiones Automáticas de Bots

## Cursor Bugbot

Para desactivar las revisiones automáticas de Cursor Bugbot en Pull Requests:

### Opción 1: Dashboard de Cursor (Recomendado)

1. Ve a tu dashboard de Cursor: https://cursor.com/dashboard
2. Navega a **Settings** → **Integrations** → **GitHub**
3. Busca la opción **"Automated PR Reviews"** o **"Bugbot Reviews"**
4. Desactiva la opción para este repositorio

### Opción 2: Configuración del Repositorio en GitHub

1. Ve a tu repositorio en GitHub: https://github.com/ChristianDVillar/Stream-Schedule
2. Ve a **Settings** → **Integrations** → **Installed GitHub Apps**
3. Busca **Cursor** o **Bugbot**
4. Configura para que no revise PRs automáticamente

### Opción 3: Comentario en PR

Si Bugbot ya comentó en un PR, puedes:
- Cerrar el comentario del bot
- Marcar el PR como "Draft" (Bugbot puede no revisar drafts en algunas configuraciones)

## Nota

La configuración principal de Bugbot está en el dashboard de Cursor, no en el repositorio de GitHub. Este archivo es solo documentación.
