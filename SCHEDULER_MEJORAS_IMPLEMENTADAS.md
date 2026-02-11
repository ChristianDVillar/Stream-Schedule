# Scheduler Mejorado - Cambios Implementados

## ✅ Correcciones Realizadas

### 1. Error de Inicialización Corregido
**Problema:** `Cannot access 'User' before initialization` en línea 24 de `models/index.js`

**Solución:** Movidas las relaciones de `Integration` y `Entitlement` al final del archivo, después de que todos los modelos estén definidos.

---

## 🚀 Mejoras Implementadas en el Scheduler

### 1. Estados Granulares de Publicación

El scheduler ahora usa estados más detallados:

- **SCHEDULED**: Contenido programado, esperando su hora
- **QUEUED**: En cola para publicación (rate limit o feature flag)
- **PUBLISHING**: Actualmente siendo publicado
- **PUBLISHED**: Publicado exitosamente
- **FAILED**: Falló después de todos los reintentos
- **RETRYING**: Reintentando después de un fallo
- **CANCELED**: Cancelado por el usuario

**Beneficios:**
- Mejor visibilidad del estado de publicación
- Logs más informativos
- UX mejorada para usuarios

---

### 2. Idempotencia en Publicaciones

**Implementación:**
- Verificación de idempotencia antes de publicar
- Clave: `contentId-platform-scheduledForTimestamp`
- Previene duplicados en reintentos

**Flujo:**
```javascript
1. Check idempotency → ¿Ya publicado?
2. Si es duplicado → Skip
3. Si no → Marcar como intentado → Publicar
```

---

### 3. Rate Limiting por Plataforma

**Límites implementados:**
- Twitter: 300 posts / 3 horas
- Discord: 50 posts / hora
- Instagram: 25 posts / hora
- YouTube: 6 posts / 24 horas

**Comportamiento:**
- Si se excede el límite → Encola para más tarde (QUEUED)
- No falla inmediatamente, espera a que se libere el límite
- Soporte Redis (preferido) o memoria (fallback)

---

### 4. Integración con Modelo Integration

**Cambio importante:**
- Prioriza tokens de tabla `Integrations` (cifrados)
- Fallback a `User` para compatibilidad hacia atrás
- Separación clara entre Auth e Integrations

**Código:**
```javascript
// Busca primero en Integration
let integration = await Integration.findOne({
  where: { userId, provider: platform, status: 'active' }
});

// Fallback a User si no existe
if (!integration) {
  // Usar tokens de User (backward compatibility)
}
```

---

### 5. Feature Flags

**Integración:**
- Verifica `automation_enabled` antes de publicar
- Si está deshabilitado → Encola (QUEUED)
- Permite desactivar publicación sin deploy

---

### 6. Reintentos Automáticos

**Lógica:**
- Máximo 3 reintentos por publicación
- Estado `RETRYING` entre reintentos
- Espera 5 minutos entre reintentos
- Después de 3 fallos → `FAILED`

**Campos nuevos:**
- `retryCount`: Contador de reintentos
- `lastRetryAt`: Timestamp del último reintento

---

### 7. Procesamiento por Lotes

**Mejora de performance:**
- Procesa hasta 50 items por tick
- Concurrencia de 5 publicaciones simultáneas
- `Promise.allSettled` para manejo de errores

---

### 8. Soporte para Colas (Preparado)

**Estructura lista para BullMQ:**
- Función `enqueuePublication()` disponible
- Si rate limit excedido → Encola automáticamente
- Worker separado puede procesar cola después

---

## 📊 Flujo de Publicación Mejorado

```
1. Scheduler encuentra contenido due
   ↓
2. Verifica feature flag (automation_enabled)
   ↓
3. Para cada plataforma:
   a. Check idempotency
   b. Check rate limit
   c. Si OK → Marcar PUBLISHING
   d. Obtener token (Integration → User fallback)
   e. Publicar
   f. Si éxito → Record publication
   g. Si fallo → Retry logic
   ↓
4. Actualizar estado final:
   - Todo OK → PUBLISHED
   - Algunos fallaron pero retry → RETRYING
   - Rate limit → QUEUED
   - Todo falló → FAILED
```

---

## 🔄 Compatibilidad Hacia Atrás

El scheduler mantiene compatibilidad con:
- ✅ Tokens almacenados en `User` (backward compatibility)
- ✅ Estados antiguos (`SCHEDULED`, `PUBLISHED`, `FAILED`)
- ✅ Código existente que no usa nuevas features

---

## 📝 Cambios en Archivos

### Modificados:
- `backend/src/models/index.js` - Relaciones movidas al final
- `backend/src/services/scheduler.js` - Completamente refactorizado
- `backend/src/services/contentService.js` - `getDueContent()` actualizado

### Nuevos servicios utilizados:
- `idempotencyService.js` - Prevención de duplicados
- `rateLimitService.js` - Límites por plataforma
- `featureFlagService.js` - Feature flags
- `queueService.js` - Colas (preparado)

---

## 🧪 Testing Recomendado

1. **Publicación normal:**
   - Crear contenido programado
   - Verificar transición: SCHEDULED → QUEUED → PUBLISHING → PUBLISHED

2. **Rate limiting:**
   - Publicar múltiples contenidos rápidamente
   - Verificar que algunos se encolan (QUEUED)

3. **Reintentos:**
   - Simular fallo de publicación
   - Verificar que pasa a RETRYING
   - Verificar reintentos automáticos

4. **Idempotencia:**
   - Intentar publicar mismo contenido dos veces
   - Verificar que segunda vez se skippea

---

## ⚙️ Configuración Requerida

```env
# Cifrado de tokens (requerido)
TOKEN_ENCRYPTION_KEY=your-secure-key-here

# Redis (opcional pero recomendado para rate limiting)
REDIS_URL=redis://localhost:6379
# O
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

---

## 🎯 Próximos Pasos

1. ✅ Migraciones ejecutadas
2. ✅ Scheduler actualizado
3. ⏳ Migrar tokens existentes a tabla `Integrations`
4. ⏳ Actualizar código que lee tokens para usar `Integration`
5. ⏳ Configurar Redis para producción
6. ⏳ Implementar worker separado para colas (opcional)

---

**Estado:** ✅ Implementado y listo para usar

**Última actualización:** Febrero 2026
