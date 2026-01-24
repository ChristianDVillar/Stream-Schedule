# Guía de Conexión a Supabase

## Problema: No se conecta a la base de datos de Supabase

## ⚠️ IMPORTANTE: Obtener la contraseña real de Supabase

La contraseña de Supabase **NO es la misma** que la contraseña de tu cuenta de administrador. Debes obtenerla desde el dashboard de Supabase:

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Settings → Database
3. En la sección "Connection string", verás la contraseña real
4. **Copia esa contraseña** (no la que usas para login)

### Solución 1: Verificar que DATABASE_URL esté configurado

1. Abre `backend/.env`
2. Asegúrate de que estas líneas NO estén comentadas (sin `#` al inicio):

```env
DATABASE_URL=postgresql://postgres.omdosutakaefpowscagp:%21OMunculo_42%21@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
DATABASE_SSL=true
```

### Solución 2: Codificar caracteres especiales en la contraseña

Si tu contraseña tiene caracteres especiales, debes codificarlos en la URL:

- `!` → `%21`
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`

**Ejemplo:**
- Contraseña: `!Omunculo_42!`
- Codificada: `%21Omunculo_42%21`

### Solución 3: Usar el Pooler de Supabase (Recomendado)

Supabase ofrece dos tipos de conexión:

1. **Directa** (IPv6): `db.xxx.supabase.co`
2. **Pooler** (Recomendado): `aws-1-eu-west-1.pooler.supabase.com`

El pooler es mejor para aplicaciones Node.js porque:
- Maneja mejor las conexiones concurrentes
- Evita problemas de límite de conexiones
- Es más estable

### Solución 4: Verificar la configuración SSL

Para Supabase, **SIEMPRE** necesitas SSL:

```env
DATABASE_SSL=true
```

### Formato completo del .env

```env
# Database Configuration
DATABASE_URL=postgresql://postgres.omdosutakaefpowscagp:%21OMunculo_42%21@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
DATABASE_SSL=true
```

### Probar la conexión

Ejecuta el script de diagnóstico:

```bash
cd backend
node src/scripts/testDatabaseConnection.js
```

Este script te dirá exactamente qué está mal con la conexión.

### Errores comunes y soluciones

#### Error: "SSL required"
- **Solución**: Agrega `DATABASE_SSL=true` a tu `.env`

#### Error: "password authentication failed"
- **Solución**: Verifica que la contraseña esté correctamente codificada en la URL
- Usa el script de diagnóstico para verificar

#### Error: "timeout" o "ECONNREFUSED"
- **Solución**: Verifica que el hostname sea correcto
- Asegúrate de usar el pooler: `pooler.supabase.com`
- Verifica que tu proyecto de Supabase esté activo

#### Error: "DATABASE_URL is not set"
- **Solución**: Asegúrate de que la línea `DATABASE_URL=...` NO esté comentada (sin `#`)

### Obtener la URL de conexión desde Supabase

1. Ve a tu proyecto en Supabase Dashboard
2. Settings → Database
3. En "Connection string", selecciona "URI"
4. Copia la URL y reemplaza `[YOUR-PASSWORD]` con tu contraseña codificada
5. Si usas pooler, selecciona "Session mode" o "Transaction mode"

### Notas importantes

- **NUNCA** commitees el archivo `.env` con credenciales reales
- El archivo `.env` está en `.gitignore` por seguridad
- Para producción (Render), configura las variables de entorno en el dashboard de Render
