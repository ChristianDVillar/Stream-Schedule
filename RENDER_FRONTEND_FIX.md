# Fix para Error 404 en Render Frontend

## Problema

Error: `GET https://stream-schedule.onrender.com/login 404 (Not Found)`

## Causa

El frontend está intentando hacer una petición GET a `/login` directamente al backend, pero:
1. El backend solo tiene rutas API (`/api/*`)
2. El frontend es una SPA (Single Page Application) que debe ser servida por `serve -s build`
3. Las rutas del frontend (`/login`, `/dashboard`, etc.) son manejadas por React Router, no por el backend

## Solución

### 1. Verificar Configuración en Render

#### Frontend Service en Render:

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npx serve -s build -l 10000
```

**⚠️ IMPORTANTE:** El flag `-s` es **CRÍTICO**. Sin él, las rutas de React Router no funcionarán.

### 2. Verificar Environment Variable

En Render → Frontend Service → Environment Variables:

```env
REACT_APP_API_URL=https://stream-schedule-api.onrender.com
```

**⚠️ IMPORTANTE:** 
- Debe empezar con `REACT_APP_`
- Debe apuntar a la URL del **backend**, no del frontend
- Si backend y frontend están en el mismo servicio, usa la misma URL

### 3. Verificar que el Frontend Use las Rutas API Correctas

El frontend ya está configurado correctamente en `frontend/src/api.js`:
- Usa `REACT_APP_API_URL` o fallback a `localhost:5000`
- Todas las llamadas API usan `/api/*`

### 4. Backend Health Check

El backend ahora tiene:
- `GET /api/health` - Health check endpoint
- `GET /` - Información del API

### 5. Verificar que No Haya Conflicto de URLs

Si frontend y backend están en el mismo servicio de Render:
- El backend debe servir el frontend build para rutas que no sean `/api/*`
- O separar en dos servicios diferentes (recomendado)

## Configuración Recomendada

### Opción 1: Servicios Separados (Recomendado)

**Backend Service:**
- Name: `stream-schedule-api`
- Root Directory: `backend`
- Build: `npm install`
- Start: `node src/app.js`
- Env: `REACT_APP_API_URL` NO se necesita aquí

**Frontend Service:**
- Name: `stream-schedule-frontend`
- Root Directory: `frontend`
- Build: `npm install && npm run build`
- Start: `npx serve -s build -l 10000`
- Env: `REACT_APP_API_URL=https://stream-schedule-api.onrender.com`

### Opción 2: Mismo Servicio (No Recomendado)

Si están en el mismo servicio, el backend debe servir el frontend:

```javascript
// En backend/src/app.js, después de las rutas API:
if (nodeEnv === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  });
}
```

## Verificación

1. **Backend Health Check:**
   ```bash
   curl https://stream-schedule-api.onrender.com/api/health
   ```
   Debe responder: `{"status":"ok",...}`

2. **Frontend:**
   - Abre `https://stream-schedule-frontend.onrender.com`
   - Abre DevTools → Network
   - Verifica que las requests vayan a:
     ```
     https://stream-schedule-api.onrender.com/api/...
     ```
   - NO deben ir a `localhost:5000`

3. **Rutas del Frontend:**
   - Navega a `/login`, `/dashboard`, etc.
   - Deben funcionar sin 404
   - Si refrescas la página, debe seguir funcionando (gracias a `serve -s`)

## Troubleshooting

### Error: "Cannot GET /login"

**Causa:** El servidor está intentando servir `/login` como archivo estático.

**Solución:** 
- Verifica que el Start Command use `npx serve -s build -l 10000`
- El flag `-s` es obligatorio para SPAs

### Error: Requests van a localhost

**Causa:** `REACT_APP_API_URL` no está configurada en Render.

**Solución:**
- Agrega `REACT_APP_API_URL` en Environment Variables
- Rebuild el frontend después de agregar la variable

### Error: CORS

**Causa:** El backend no permite el origen del frontend.

**Solución:**
- Verifica `FRONTEND_URL` en el backend
- Verifica CORS config en `backend/src/app.js`

## Checklist

- [ ] Frontend Build Command: `npm install && npm run build`
- [ ] Frontend Start Command: `npx serve -s build -l 10000` (con `-s`)
- [ ] `REACT_APP_API_URL` configurada en Render
- [ ] Backend tiene `/api/health` endpoint
- [ ] Backend `FRONTEND_URL` apunta al frontend
- [ ] CORS configurado correctamente
- [ ] Servicios separados (recomendado) o mismo servicio con static files
