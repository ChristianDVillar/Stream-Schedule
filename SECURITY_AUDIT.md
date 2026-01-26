# 🔒 Auditoría de Seguridad y Redundancias

**Fecha:** 26 de Enero, 2026  
**Última Actualización:** 26 de Enero, 2026  
**Proyecto:** Streamer Scheduler  
**Alcance:** Análisis completo de seguridad y redundancias

## ✅ CORRECCIONES APLICADAS

Las siguientes correcciones críticas ya han sido implementadas:

1. ✅ **Contraseñas eliminadas de documentación** - Todas las contraseñas reales han sido reemplazadas con placeholders
2. ✅ **Math.random() reemplazado** - Todas las instancias ahora usan `crypto.randomBytes()` a través de `cryptoUtils.js`
3. ✅ **SQL Injection corregido** - `runMigrations.js` ahora usa parámetros preparados
4. ✅ **Contraseña hardcodeada eliminada** - "changeme123" reemplazada con generación segura
5. ✅ **Scripts de administración actualizados** - Ahora requieren variables de entorno obligatorias
6. ✅ **Datos sensibles eliminados** - URLs y credenciales removidas de archivos de documentación

---

## 🚨 PROBLEMAS CRÍTICOS DE SEGURIDAD

### 1. **EXPOSICIÓN DE CREDENCIALES EN DOCUMENTACIÓN** ⚠️ CRÍTICO

**Ubicación:**
- ~~`backend/SUPABASE_CONNECTION_GUIDE.md`~~ (eliminado)
- ~~`RENDER_DEPLOY_GUIDE.md`~~ (eliminado)

**Problema:**
```markdown
DATABASE_URL=postgresql://postgres.omdosutakaefpowscagp:%21OMunculo_42%21@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

**Riesgo:** La contraseña de la base de datos está expuesta en archivos de documentación que pueden estar en el repositorio.

**Solución:**
- ❌ **URGENTE:** Eliminar todas las contraseñas reales de los archivos de documentación
- Usar placeholders: `postgresql://postgres.xxx:%21PASSWORD%21@...`
- Agregar estos archivos a `.gitignore` si contienen información sensible
- Usar variables de entorno en todos los ejemplos

---

### 2. **GENERACIÓN INSEGURA DE LICENCIAS Y TOKENS** ⚠️ ALTO

**Ubicación:**
- `backend/src/routes/user.js` (múltiples líneas)
- `backend/src/routes/payments.js` (líneas 127, 205)

**Problema:**
```javascript
const licenseKey = Math.random().toString(36).substr(2, 16).toUpperCase();
const tempPassword = `temp${Math.random().toString(36).substr(2, 8)}`;
```

**Riesgo:**
- `Math.random()` NO es criptográficamente seguro
- Vulnerable a predicción y colisiones
- Tokens temporales pueden ser adivinados

**Solución:**
```javascript
import crypto from 'crypto';

// Para license keys
const licenseKey = crypto.randomBytes(16).toString('hex').toUpperCase();

// Para passwords temporales
const tempPassword = crypto.randomBytes(8).toString('hex');
```

---

### 3. **SQL INJECTION VULNERABILITY** ⚠️ CRÍTICO

**Ubicación:**
- `backend/src/scripts/runMigrations.js` (línea 140-141)

**Problema:**
```javascript
const escapedFilename = filename.replace(/'/g, "''");
await sequelize.query(
  `INSERT INTO ${tableName} (name) VALUES ('${escapedFilename}')`
);
```

**Riesgo:**
- Escapado manual insuficiente
- Vulnerable a SQL injection si el filename contiene caracteres especiales
- No usa parámetros preparados

**Solución:**
```javascript
await sequelize.query(
  `INSERT INTO ${tableName} (name) VALUES ($1)`,
  { bind: [filename] }
);
// O mejor aún, usar Sequelize directamente:
await SequelizeMeta.create({ name: filename });
```

---

### 4. **EXPOSICIÓN DE CONTRASEÑAS TEMPORALES EN PRODUCCIÓN** ⚠️ ALTO

**Ubicación:**
- `backend/src/routes/user.js` (línea 531)

**Problema:**
```javascript
res.json({ 
  message: 'Password reset successful...',
  tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined
});
```

**Riesgo:**
- Aunque está condicionado, si `NODE_ENV` no está configurado correctamente, se expone
- La contraseña temporal se envía en la respuesta HTTP
- No hay expiración ni invalidación de tokens

**Solución:**
- ❌ **NUNCA** enviar contraseñas en respuestas HTTP
- Usar tokens de reset con expiración (JWT o tokens únicos)
- Enviar email con link de reset (no la contraseña)
- Invalidar tokens después de uso

---

### 5. **CONTRASEÑA HARDCODEADA EN RESET** ⚠️ CRÍTICO

**Ubicación:**
- `backend/src/routes/user.js` (línea 493)

**Problema:**
```javascript
const hash = await bcrypt.hash('changeme123', 10);
user.passwordHash = hash;
```

**Riesgo:**
- Contraseña predecible y conocida
- Cualquiera puede resetear contraseñas de usuarios a "changeme123"
- No hay notificación al usuario

**Solución:**
- Generar contraseña aleatoria segura
- Forzar cambio en primer login
- Notificar al usuario por email
- Registrar el evento en logs de auditoría

---

### 6. **FALTA DE VALIDACIÓN DE INPUT EN RUTAS CRÍTICAS** ⚠️ MEDIO

**Ubicación:**
- `backend/src/routes/content.js` (línea 33-48)
- `backend/src/routes/user.js` (múltiples endpoints)

**Problema:**
```javascript
router.post('/', async (req, res) => {
  const scheduledFor = new Date(req.body.scheduledFor);
  // No valida si scheduledFor es válido
  // No valida longitud de campos
  // No sanitiza HTML/XSS
});
```

**Riesgo:**
- XSS si el contenido se renderiza sin sanitizar
- Inyección de datos inválidos
- DoS con datos muy grandes

**Solución:**
- Validar y sanitizar todos los inputs
- Usar librerías como `validator` o `joi`
- Limitar longitud de campos
- Sanitizar HTML con `DOMPurify` en frontend

---

### 7. **EXPOSICIÓN DE DETALLES DE ERROR EN PRODUCCIÓN** ⚠️ MEDIO

**Ubicación:**
- `backend/src/routes/uploads.js` (línea 136)
- Múltiples archivos

**Problema:**
```javascript
details: process.env.NODE_ENV === 'development' ? err.message : undefined
```

**Riesgo:**
- Si `NODE_ENV` no está configurado, se exponen detalles
- Stack traces pueden revelar estructura del código
- Información útil para atacantes

**Solución:**
- Usar logging centralizado (Winston, Pino)
- Nunca exponer detalles en respuestas HTTP
- Logs detallados solo en archivos de log (no en consola)

---

### 8. **FALTA DE RATE LIMITING EN ENDPOINTS CRÍTICOS** ⚠️ MEDIO

**Ubicación:**
- `backend/src/app.js` (línea 35-38)

**Problema:**
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300  // 300 requests por 15 minutos para TODOS los endpoints
});
```

**Riesgo:**
- Límite global muy permisivo
- Endpoints críticos (login, register, password reset) no tienen protección específica
- Vulnerable a brute force attacks

**Solución:**
- Rate limiting específico por endpoint:
  - Login: 5 intentos por 15 minutos por IP
  - Register: 3 por hora por IP
  - Password reset: 3 por hora por email
  - Upload: según tipo de usuario

---

### 9. **AUTENTICACIÓN ASÍNCRONA INSEGURA** ⚠️ MEDIO

**Ubicación:**
- `backend/src/middleware/auth.js` (línea 28-41)

**Problema:**
```javascript
User.findByPk(payload.id)
  .then(user => {
    req.user = user;
    next();
  })
```

**Riesgo:**
- Si la promesa falla, `req.user` puede quedar como `null` pero la request continúa
- Race conditions posibles
- No hay manejo consistente de errores

**Solución:**
- Usar `async/await` con try-catch
- Asegurar que `next()` solo se llama después de validar usuario
- Mejorar manejo de errores

---

### 10. **FALTA DE VALIDACIÓN DE UUID EN UPLOADS** ⚠️ MEDIO

**Ubicación:**
- `backend/src/routes/uploads.js` (línea 39-50)

**Problema:**
```javascript
const authenticatedUserId = req.user.id.toString();
const providedUserId = user_id ? user_id.toString() : null;
```

**Riesgo:**
- No valida que `user_id` sea un UUID válido
- Conversión a string puede fallar silenciosamente
- Comparación de strings puede ser vulnerable

**Solución:**
- Validar formato UUID
- Usar comparación estricta de tipos
- Validar que el usuario existe antes de procesar

---

## 🔄 REDUNDANCIAS Y CÓDIGO DUPLICADO

### 1. **Configuración de Sequelize Duplicada**

**Ubicaciones:**
- `backend/src/models/index.js` (líneas 32-60)
- `backend/src/scripts/testDatabaseConnection.js` (líneas 59-83)
- `backend/src/scripts/runMigrations.js` (líneas 34-58)
- `backend/src/scripts/validatePerformance.js` (similar)

**Problema:** Misma lógica de configuración repetida en múltiples archivos.

**Solución:**
- Crear `backend/src/config/database.js` con configuración centralizada
- Importar en todos los scripts

---

### 2. **Generación de Licencias Duplicada**

**Ubicaciones:**
- `backend/src/routes/user.js` (líneas 193, 203, 311, 359, 424, 466)
- `backend/src/routes/payments.js` (líneas 127, 205)

**Problema:** Misma lógica de generación repetida 8 veces.

**Solución:**
```javascript
// backend/src/utils/licenseUtils.js
export function generateLicenseKey(prefix = '') {
  const key = crypto.randomBytes(12).toString('hex').toUpperCase();
  return prefix ? `${prefix}-${key}` : key;
}
```

---

### 3. **Construcción de Respuesta de Autenticación Duplicada**

**Ubicación:**
- `backend/src/routes/user.js` (líneas 20-48, 210-220, 272-281)

**Problema:** Misma lógica de generar token y respuesta repetida.

**Solución:**
- Ya existe `generateAuthResponse` pero no se usa en todos los lugares
- Refactorizar para usar consistentemente

---

### 4. **Validación de License Type Duplicada**

**Ubicación:**
- Múltiples lugares usan `normalizeLicenseType` y `resolveLicenseExpiry`

**Estado:** ✅ Ya está centralizado en `licenseUtils.js` - bien hecho

---

### 5. **Console.log/error en Múltiples Lugares**

**Ubicación:** 190+ instancias de `console.log/error/warn`

**Problema:**
- No hay logging estructurado
- Difícil de filtrar y monitorear en producción
- Información sensible puede quedar en logs

**Solución:**
- Implementar logger centralizado (Winston o Pino)
- Niveles de log apropiados
- Formato JSON para producción
- Rotación de logs

---

## 🛡️ MEJORAS DE SEGURIDAD RECOMENDADAS

### 1. **Implementar Helmet Correctamente**
✅ Ya está en `app.js` - verificar configuración

### 2. **CORS Más Restrictivo**
**Ubicación:** `backend/src/app.js` (línea 42)

**Problema:**
```javascript
app.use(cors({ origin: true, credentials: true }));
```

**Solución:**
```javascript
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true 
}));
```

### 3. **Validación de Input con Joi/Validator**
- Instalar `joi` o `express-validator`
- Validar todos los endpoints
- Sanitizar inputs

### 4. **HTTPS Obligatorio en Producción**
- Verificar que Render/Producción use HTTPS
- Redirigir HTTP a HTTPS
- HSTS headers

### 5. **Secrets Management**
- ❌ Nunca hardcodear secrets
- Usar variables de entorno
- Considerar AWS Secrets Manager o similar para producción

### 6. **Auditoría y Logging**
- Log todas las acciones administrativas
- Log intentos de login fallidos
- Log cambios de permisos
- Retención de logs apropiada

### 7. **Content Security Policy (CSP)**
- Agregar headers CSP
- Prevenir XSS
- Restringir recursos externos

### 8. **Validación de Archivos en Uploads**
- Validar tipo MIME real (no solo extensión)
- Validar tamaño máximo
- Escanear malware (opcional pero recomendado)
- Limitar tipos de archivo permitidos

---

## 📋 CHECKLIST DE ACCIONES URGENTES

### 🔴 CRÍTICO (Hacer AHORA)
- [ ] Eliminar contraseñas de documentación
- [ ] Reemplazar `Math.random()` con `crypto.randomBytes()`
- [ ] Arreglar SQL injection en runMigrations.js
- [ ] Eliminar contraseña hardcodeada "changeme123"
- [ ] No exponer contraseñas temporales en respuestas

### 🟠 ALTO (Esta semana)
- [ ] Implementar rate limiting específico por endpoint
- [ ] Validar y sanitizar todos los inputs
- [ ] Mejorar manejo de errores (no exponer detalles)
- [ ] Centralizar configuración de base de datos
- [ ] Implementar logging estructurado

### 🟡 MEDIO (Este mes)
- [ ] Refactorizar generación de license keys
- [ ] Mejorar autenticación asíncrona
- [ ] Validar UUIDs correctamente
- [ ] CORS más restrictivo
- [ ] Validación de archivos en uploads

### 🟢 BAJO (Mejoras continuas)
- [ ] Implementar CSP headers
- [ ] Auditoría de acciones
- [ ] Rotación de secrets
- [ ] Tests de seguridad
- [ ] Documentación de seguridad

---

## 📚 RECURSOS

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Nota:** Este documento debe ser revisado regularmente y actualizado después de cada cambio significativo en el código.
