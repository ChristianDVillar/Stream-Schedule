# Quick Fix para Error 404 en Render

## Error
```
GET https://stream-schedule.onrender.com/login 404 (Not Found)
```

## Solución Rápida

### 1. Verificar Start Command del Frontend en Render

En Render Dashboard → Frontend Service → Settings:

**Start Command debe ser:**
```bash
npx serve -s build -l 10000
```

**⚠️ CRÍTICO:** El flag `-s` es obligatorio. Sin él, las rutas de React Router no funcionan.

### 2. Verificar Environment Variable

En Render Dashboard → Frontend Service → Environment Variables:

```env
REACT_APP_API_URL=https://stream-schedule-api.onrender.com
```

**⚠️ IMPORTANTE:**
- Debe empezar con `REACT_APP_`
- Debe apuntar a la URL del **backend** (no del frontend)
- Si tu backend tiene otro nombre, ajusta la URL

### 3. Rebuild el Frontend

Después de cambiar el Start Command o Environment Variables:
1. Ve a Render Dashboard → Frontend Service
2. Click en "Manual Deploy" → "Deploy latest commit"
3. Espera a que termine el build

### 4. Verificar que el Backend Responda

Prueba el health check:
```bash
curl https://stream-schedule-api.onrender.com/api/health
```

Debe responder: `{"status":"ok",...}`

## Verificación Final

1. Abre `https://stream-schedule-frontend.onrender.com`
2. Abre DevTools → Network
3. Navega a `/login`
4. Verifica que:
   - La página carga sin 404
   - Las requests API van a `https://stream-schedule-api.onrender.com/api/...`
   - NO van a `localhost:5000`

## Si el Problema Persiste

### Opción A: Frontend y Backend en Servicios Separados (Recomendado)

**Backend Service:**
- Name: `stream-schedule-api`
- Root Directory: `backend`
- Build: `npm install`
- Start: `node src/app.js`

**Frontend Service:**
- Name: `stream-schedule-frontend`
- Root Directory: `frontend`
- Build: `npm install && npm run build`
- Start: `npx serve -s build -l 10000`
- Env: `REACT_APP_API_URL=https://stream-schedule-api.onrender.com`

### Opción B: Mismo Servicio

Si frontend y backend están en el mismo servicio, el backend debe servir el frontend:

Agrega al final de `backend/src/app.js` (después de las rutas API):

```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend build in production
if (nodeEnv === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  });
}
```

## Checklist

- [ ] Start Command: `npx serve -s build -l 10000` (con `-s`)
- [ ] `REACT_APP_API_URL` configurada correctamente
- [ ] Frontend rebuild después de cambios
- [ ] Backend health check funciona
- [ ] No hay requests a `localhost:5000` en producción
