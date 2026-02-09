# Configuración de Twitter/X OAuth para Publicación

## ⚠️ IMPORTANTE: Configuración en Twitter Dev Tools

Para que la publicación en Twitter funcione correctamente, debes configurar los **App permissions** en Twitter Dev Tools.

### Paso 1: Configurar App Permissions

1. Ve a [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Selecciona tu aplicación
3. Ve a **Settings** → **User authentication settings**
4. En la sección **App permissions**, selecciona:
   - ✅ **Read and write** (NO solo "Read")
   
   Esto permite que la aplicación publique tweets en nombre del usuario.

### Paso 2: Configurar Redirect URIs

En la misma página de **User authentication settings**, asegúrate de tener configurados los **Callback URLs**:

**Para desarrollo local:**
```
http://localhost:5000/api/user/auth/twitter/callback
http://localhost:5000/api/user/auth/twitter/link/callback
```

**Para producción (reemplaza con tu BACKEND_URL):**
```
https://tu-backend.onrender.com/api/user/auth/twitter/callback
https://tu-backend.onrender.com/api/user/auth/twitter/link/callback
```

### Paso 3: OAuth 2.0 Settings

- **Type of App**: Selecciona "Web App, Automated App or Bot"
- **App permissions**: **Read and write** (como se mencionó arriba)
- **Callback URI / Redirect URL**: Los URLs mencionados arriba
- **Website URL**: Tu URL de frontend (ej: `https://tu-frontend.onrender.com`)

### Paso 4: Obtener Credenciales

Después de guardar la configuración:

1. Ve a **Keys and tokens**
2. Copia:
   - **Client ID** → `TWITTER_OAUTH2_CLIENT_ID` en `.env`
   - **Client Secret** → `TWITTER_OAUTH2_CLIENT_SECRET` en `.env`

### Paso 5: Variables de Entorno

Asegúrate de tener estas variables en `backend/.env`:

```env
TWITTER_OAUTH2_CLIENT_ID=tu_client_id_aqui
TWITTER_OAUTH2_CLIENT_SECRET=tu_client_secret_aqui
BACKEND_URL=https://tu-backend.onrender.com  # o http://localhost:5000 para desarrollo
```

## Scopes Utilizados

La aplicación solicita estos scopes:
- `tweet.read` - Leer tweets
- `tweet.write` - Publicar tweets (requiere "Read and write" permissions)
- `users.read` - Leer información del usuario
- `offline.access` - Para refresh tokens

**Nota:** No solicitamos `users.email` porque:
1. Twitter no siempre proporciona email
2. Usamos emails placeholder (`twitter-{id}@placeholder.local`)
3. Evita el requisito de URLs de privacy policy y terms of service

## Solución de Problemas

### Error: "Forbidden" o "Insufficient permissions"

**Causa:** Los App permissions están configurados como "Read" en lugar de "Read and write".

**Solución:**
1. Ve a Twitter Dev Tools → Tu app → Settings → User authentication settings
2. Cambia **App permissions** a **Read and write**
3. Guarda los cambios
4. El usuario debe volver a autorizar la aplicación (desconectar y volver a conectar Twitter en Settings)

### Error: "redirect_uri mismatch"

**Causa:** El callback URL no está registrado en Twitter Dev Tools.

**Solución:**
1. Verifica que los callback URLs estén exactamente como aparecen arriba
2. Asegúrate de que `BACKEND_URL` en `.env` coincida con el dominio usado en los callbacks
3. Los URLs deben coincidir exactamente (incluyendo `http://` vs `https://`)

### Error: "Invalid client"

**Causa:** Las credenciales (`TWITTER_OAUTH2_CLIENT_ID` o `TWITTER_OAUTH2_CLIENT_SECRET`) son incorrectas.

**Solución:**
1. Verifica que las credenciales en `.env` sean correctas
2. Asegúrate de copiar el **Client ID** y **Client Secret** desde "Keys and tokens" (no desde "Consumer Keys")

## Verificación

Para verificar que todo está configurado correctamente:

1. Ve a Settings en la aplicación
2. Conecta tu cuenta de Twitter
3. Crea un post programado con Twitter seleccionado
4. Espera a que se publique (o ejecuta manualmente el scheduler)
5. Verifica que el tweet se haya publicado en tu cuenta de Twitter

Si hay errores, revisa los logs del backend para ver el mensaje de error específico de la API de Twitter.
