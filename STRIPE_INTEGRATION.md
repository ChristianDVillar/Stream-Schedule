# Integración de Stripe - Streamer Scheduler

Documentación completa sobre cómo funciona la integración de pagos con Stripe en Streamer Scheduler.

---

## Tabla de Contenidos

1. [Configuración](#configuración)
2. [Flujo de Pagos Únicos](#flujo-de-pagos-únicos)
3. [Flujo de Suscripciones](#flujo-de-suscripciones)
4. [Webhooks](#webhooks)
5. [Endpoints de la API](#endpoints-de-la-api)
6. [Modelos de Datos](#modelos-de-datos)
7. [Planes y Precios](#planes-y-precios)
8. [Verificación Manual vs Automática](#verificación-manual-vs-automática)
9. [Manejo de Errores](#manejo-de-errores)

---

## Configuración

### Variables de Entorno Requeridas

```env
# Backend (.env)
STRIPE_SECRET_KEY=sk_test_...  # Clave secreta de Stripe (obligatoria)
STRIPE_WEBHOOK_SECRET=whsec_... # Secreto del webhook (opcional pero recomendado)
STRIPE_TAX_ENABLED=true         # Habilitar impuestos automáticos (default: true)
FRONTEND_URL=https://...        # URL del frontend para redirects
```

### Inicialización

Stripe se inicializa en `backend/src/routes/payments.js`:

```javascript
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;
```

Si `STRIPE_SECRET_KEY` no está configurado, todos los endpoints de pagos devuelven error 500.

---

## Flujo de Pagos Únicos

### 1. Crear Sesión de Checkout

**Endpoint:** `POST /api/payments/checkout`

**Request:**
```json
{
  "licenseType": "monthly" | "quarterly" | "lifetime"
}
```

**Proceso:**

1. **Validación:** Verifica que Stripe esté configurado y que `licenseType` sea válido.
2. **Verificar sesión existente:** Busca si hay un pago pendiente (`PENDING`) para el mismo usuario y tipo de licencia. Si existe una sesión de Stripe aún abierta (`status === 'open'`), la devuelve en lugar de crear una nueva.
3. **Crear registro de pago:** Crea un registro en la tabla `Payments` con estado `PENDING`.
4. **Crear sesión de Stripe:** Llama a `stripe.checkout.sessions.create()` con:
   - `mode: 'payment'` (pago único)
   - `line_items` con precio dinámico según el plan
   - `success_url` y `cancel_url` apuntando al frontend
   - `metadata` con `userId`, `paymentId`, `licenseType`
   - `automatic_tax` habilitado si `STRIPE_TAX_ENABLED !== 'false'`
5. **Guardar sessionId:** Actualiza el registro de pago con `stripeSessionId`.

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/...",
  "paymentId": 123,
  "warning": "Webhook not configured..." // Solo si falta STRIPE_WEBHOOK_SECRET
}
```

### 2. Usuario Completa el Pago

El usuario es redirigido a `session.url` (Stripe Checkout), completa el pago con tarjeta, y Stripe lo redirige de vuelta a `success_url` con `session_id` en query params.

### 3. Verificación del Pago

Hay dos formas de verificar el pago:

#### Opción A: Webhook Automático (Recomendado)

Si `STRIPE_WEBHOOK_SECRET` está configurado, Stripe envía un evento `checkout.session.completed` al endpoint `/api/payments/webhook`.

**Proceso del webhook:**

1. **Verificar firma:** Valida que el evento venga de Stripe usando `stripe.webhooks.constructEvent()`.
2. **Buscar pago:** Encuentra el registro de pago por `stripeSessionId`.
3. **Actualizar estado:** Cambia el estado a `COMPLETED`, guarda `stripePaymentIntentId` y `stripeCustomerId`.
4. **Asignar licencia:**
   - Genera `licenseKey` con `generateLicenseKey()`
   - Calcula `licenseExpiresAt` según `licenseType`
   - Actualiza el usuario con la licencia
   - Sincroniza `Entitlements` (permisos)
5. **Notificación:** Envía email de éxito (si está configurado).

#### Opción B: Verificación Manual

Si el webhook no está configurado, el frontend debe llamar manualmente después del redirect.

**Endpoint:** `POST /api/payments/verify-session`

**Request:**
```json
{
  "sessionId": "cs_test_..."
}
```

**Proceso:**

1. **Recuperar sesión:** Llama a `stripe.checkout.sessions.retrieve(sessionId)`.
2. **Verificar estado:** Si `payment_status === 'paid'`:
   - Busca el pago por `stripeSessionId`
   - Si ya está `COMPLETED`, devuelve la licencia actual
   - Si no, actualiza a `COMPLETED` y asigna la licencia (igual que el webhook)

**Response:**
```json
{
  "status": "paid",
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "licenseType": "monthly",
  "licenseExpiresAt": "2026-03-12T..."
}
```

---

## Flujo de Suscripciones

### 1. Crear Suscripción

**Endpoint:** `POST /api/payments/subscribe`

**Request:**
```json
{
  "licenseType": "monthly" | "quarterly"
}
```

**Proceso:**

1. **Validación:** Solo acepta `monthly` o `quarterly` (no `lifetime`).
2. **Verificar suscripción existente:** Si el usuario ya tiene `stripeSubscriptionId`, verifica que no esté activa (`active` o `trialing`). Si está activa, rechaza la petición.
3. **Obtener o crear Cliente Stripe:**
   - Si el usuario tiene `stripeCustomerId`, verifica que exista en Stripe.
   - Si no existe o es inválido, lo limpia y crea uno nuevo con `stripe.customers.create()`.
   - Guarda `stripeCustomerId` en el usuario.
4. **Crear sesión de suscripción:** Llama a `stripe.checkout.sessions.create()` con:
   - `mode: 'subscription'`
   - `line_items` con `recurring` configurado:
     - `monthly`: `interval: 'month'`, `interval_count: 1`
     - `quarterly`: `interval: 'month'`, `interval_count: 3`
   - `customer` (si existe) o `customer_email`
   - `metadata` con `userId` y `licenseType`

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/...",
  "type": "subscription"
}
```

### 2. Usuario Completa la Suscripción

Igual que pagos únicos: redirect a Stripe Checkout → pago → redirect a `success_url`.

### 3. Activación de Suscripción

**Webhook:** `checkout.session.completed` con `mode === 'subscription'`

**Proceso:**

1. **Recuperar suscripción:** `stripe.subscriptions.retrieve(session.subscription)`
2. **Actualizar usuario:**
   - `stripeCustomerId` = `subscription.customer`
   - `stripeSubscriptionId` = `subscription.id`
   - `subscriptionStatus` = `subscription.status`
   - Asigna licencia (igual que pago único)
3. **Crear registro de pago:** Crea un `Payment` con `isRecurring: true` y `stripeSubscriptionId`.

### 4. Pagos Recurrentes

**Webhook:** `invoice.paid`

Cuando Stripe cobra un pago recurrente:

1. **Buscar usuario:** Por `stripeSubscriptionId` del invoice.
2. **Crear registro de pago:** Nuevo `Payment` con `isRecurring: true`.
3. **Extender licencia:** Actualiza `licenseExpiresAt` según `licenseType`.
4. **Sincronizar entitlements:** Actualiza permisos.
5. **Notificación:** Envía email de éxito.

### 5. Cancelación de Suscripción

**Endpoint:** `POST /api/payments/subscription/cancel`

**Proceso:**

1. **Obtener suscripción:** `stripe.subscriptions.retrieve(subscriptionId)`
2. **Cancelar al final del período:** `stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })`
3. **Actualizar estado:** `user.subscriptionStatus = subscription.status`

**Nota:** La suscripción sigue activa hasta el final del período actual. El usuario mantiene acceso hasta entonces.

**Webhook:** `customer.subscription.deleted` (cuando realmente termina)

Cuando la suscripción se cancela completamente:

1. Limpia `stripeSubscriptionId` y `subscriptionStatus` del usuario.
2. La licencia sigue activa hasta `licenseExpiresAt` (no se revoca inmediatamente).

### 6. Fallos de Pago

**Webhook:** `invoice.payment_failed`

**Proceso:**

1. **Actualizar estado:** `user.subscriptionStatus = 'past_due'`
2. **Notificación:** Envía email al usuario informando del fallo.

**Nota:** La licencia sigue activa durante el período de gracia. Stripe reintentará el cobro automáticamente.

### 7. Reembolsos

**Webhook:** `charge.refunded`

**Proceso:**

1. **Buscar pago:** Por `stripePaymentIntentId` del charge.
2. **Verificar estado:** Solo procesa si el pago está `COMPLETED`.
3. **Actualizar pago:** Cambia estado a `REFUNDED`.
4. **Revocar licencia (condicional):**
   - Solo si `user.licenseType === payment.licenseType` (misma licencia que se reembolsó)
   - Solo si la licencia aún está activa (`licenseExpiresAt > now`)
   - Si se cumple: `licenseType = 'none'`, `licenseKey = null`, `licenseExpiresAt = null`

**Nota importante:** Si el usuario compró otra licencia después del pago reembolsado, la licencia actual **NO se revoca**. Solo se revoca si es exactamente la misma licencia que se pagó.

---

## Webhooks

### Endpoint

Se admiten **dos URLs** (misma lógica):

- `POST /api/payments/webhook`
- `POST /stripe/webhook` (por si en el Dashboard de Stripe tienes configurado `https://tu-dominio.com/stripe/webhook`)

**Importante:** Estos endpoints deben estar **antes** del middleware de parsing JSON en `app.js` porque Stripe envía el body como raw buffer para verificación de firma.

**Configuración del middleware en `backend/src/app.js`:**

```javascript
// Stripe webhook must be before JSON parsing middleware
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
```

Si el webhook se configura después de `express.json()`, la verificación de firma fallará porque el body ya fue parseado.

### Eventos Manejados

| Evento | Descripción |
|--------|-------------|
| `checkout.session.completed` | Pago único o suscripción completada |
| `customer.subscription.updated` | Suscripción actualizada (estado, período, etc.) |
| `customer.subscription.deleted` | Suscripción cancelada completamente |
| `invoice.paid` | Pago recurrente exitoso |
| `invoice.payment_failed` | Fallo en pago recurrente |
| `charge.refunded` | Reembolso procesado (revoca licencia si aplica) |

### Verificación de Firma

```javascript
const sig = req.headers['stripe-signature'];
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
```

Si la verificación falla, devuelve 400. Si `STRIPE_WEBHOOK_SECRET` no está configurado, devuelve 500 con mensaje informativo.

### Configuración del Webhook en Stripe Dashboard

1. **Stripe Dashboard** → **Developers** → **Webhooks**
2. **Add endpoint**
3. **URL:** `https://tu-backend.onrender.com/api/payments/webhook` o `https://tu-backend.onrender.com/stripe/webhook` (ambas funcionan)
4. **Events to send:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `charge.refunded`
5. **Copiar el "Signing secret"** → `STRIPE_WEBHOOK_SECRET` en variables de entorno

---

## Endpoints de la API

### Pagos Únicos

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/payments/checkout` | ✅ | Crear sesión de checkout para pago único |
| POST | `/api/payments/verify-session` | ✅ | Verificar manualmente el estado de un pago |
| POST | `/api/payments/create-checkout-session` | ✅ | Crear checkout por `lookup_key` de Stripe Price |

### Suscripciones

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/payments/subscribe` | ✅ | Crear sesión de checkout para suscripción |
| GET | `/api/payments/subscription` | ✅ | Obtener estado de la suscripción actual |
| POST | `/api/payments/subscription/cancel` | ✅ | Cancelar suscripción (al final del período) |

### Utilidades

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/api/payments/config-status` | ❌ | Estado de configuración de Stripe |
| GET | `/api/payments/history` | ✅ | Historial de pagos del usuario |
| GET | `/api/payments/admin/stats` | Admin | Estadísticas de pagos (admin) |
| POST | `/api/payments/webhook` | ❌ | Webhook de Stripe (verificación de firma) |

---

## Modelos de Datos

### Tabla `Payments`

```javascript
{
  id: INTEGER (PK),
  userId: INTEGER (FK → Users),
  licenseType: STRING, // 'monthly', 'quarterly', 'lifetime'
  amount: DECIMAL,
  currency: STRING, // 'USD'
  status: STRING, // 'pending', 'completed', 'failed', 'refunded', 'canceled'
  provider: STRING, // 'stripe'
  stripeSessionId: STRING, // ID de la sesión de checkout
  stripePaymentIntentId: STRING, // ID del payment intent (pagos únicos)
  stripeCustomerId: STRING, // ID del cliente Stripe
  stripeSubscriptionId: STRING, // ID de la suscripción (si aplica)
  isRecurring: BOOLEAN, // true para suscripciones
  paidAt: DATE,
  createdAt: DATE,
  updatedAt: DATE
}
```

### Tabla `Users` (campos relacionados)

```javascript
{
  // ... otros campos
  stripeCustomerId: STRING, // ID del cliente en Stripe
  stripeSubscriptionId: STRING, // ID de la suscripción activa
  subscriptionStatus: STRING, // 'active', 'canceled', 'past_due', etc.
  licenseKey: STRING,
  licenseType: STRING,
  licenseExpiresAt: DATE
}
```

---

## Planes y Precios

Definidos en `backend/src/routes/payments.js`:

```javascript
const PLANS = {
  monthly: { amount: 5.99, currency: 'USD', durationDays: 30 },
  quarterly: { amount: 13.98, currency: 'USD', durationDays: 90 },
  lifetime: { amount: 99.0, currency: 'USD', durationDays: null }
};
```

**Notas:**

- Los precios se convierten a centavos para Stripe: `Math.round(plan.amount * 100)`
- `lifetime` no soporta suscripciones (solo pago único)
- `monthly` y `quarterly` soportan suscripciones recurrentes

---

## Verificación Manual vs Automática

### Con Webhook Configurado (Automático)

✅ **Ventajas:**
- Procesamiento inmediato al completar el pago
- No requiere acción del usuario después del redirect
- Manejo automático de eventos (fallos, cancelaciones, reembolsos)

❌ **Requisitos:**
- `STRIPE_WEBHOOK_SECRET` debe estar configurado
- El webhook debe ser accesible públicamente (no funciona en localhost sin ngrok/tunneling)

### Sin Webhook (Manual)

✅ **Ventajas:**
- Funciona en desarrollo local sin configuración adicional
- Útil para testing

❌ **Desventajas:**
- El usuario debe hacer clic en "Verificar pago" después del redirect
- No se procesan automáticamente eventos como `invoice.paid` o `invoice.payment_failed`
- Requiere implementar polling o verificación manual en el frontend

**Recomendación:** Usar webhook en producción para mejor UX.

---

## Manejo de Errores

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Stripe is not configured` | Falta `STRIPE_SECRET_KEY` | Configurar variable de entorno |
| `Webhook secret not configured` | Falta `STRIPE_WEBHOOK_SECRET` | Configurar webhook en Stripe Dashboard y añadir secreto |
| `No active Stripe Price found` | `lookup_key` no existe en Stripe | Crear Price en Stripe Dashboard con ese `lookup_key` |
| `Invalid license type` | `licenseType` no válido | Usar: `monthly`, `quarterly`, `lifetime` |
| `You already have an active subscription` | Usuario ya tiene suscripción activa | Cancelar la existente primero |
| `Webhook Error: ...` | Firma del webhook inválida | Verificar que `STRIPE_WEBHOOK_SECRET` sea correcto y que el endpoint use `express.raw()` |

### Estados de Pago

| Estado | Descripción | Cuándo se asigna |
|--------|-------------|------------------|
| `PENDING` | Pago creado, esperando pago | Al crear checkout session |
| `COMPLETED` | Pago exitoso, licencia asignada | Webhook `checkout.session.completed` o verificación manual |
| `FAILED` | Pago falló | (No usado actualmente en el código) |
| `REFUNDED` | Pago reembolsado | Webhook `charge.refunded` |
| `CANCELED` | Pago cancelado | (No usado actualmente en el código) |

### Logging

Todos los errores se registran con `logger.error()` incluyendo:
- Mensaje de error
- `userId` (si aplica)
- `sessionId` o `subscriptionId`
- Stack trace (solo en desarrollo)

---

## Troubleshooting

### El webhook no se ejecuta

1. **Verificar configuración:**
   - `STRIPE_WEBHOOK_SECRET` debe estar configurado
   - La URL del webhook debe ser accesible públicamente (HTTPS en producción)
   - El endpoint debe usar `express.raw()` antes de `express.json()`

2. **Revisar logs:**
   - Buscar errores de "Webhook signature verification failed"
   - Verificar que el evento llegue al servidor (Stripe Dashboard → Webhooks → Ver detalles)

3. **Probar con Stripe CLI:**
   ```bash
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```

### El pago se completa pero no se asigna la licencia

1. **Si webhook configurado:**
   - Revisar logs del backend para ver si el webhook llegó
   - Verificar que `userId` en `metadata` sea correcto
   - Verificar que el pago exista en la BD con ese `stripeSessionId`

2. **Si no hay webhook:**
   - El frontend debe llamar `/verify-session` después del redirect
   - Verificar que `sessionId` se pase correctamente desde query params

### La suscripción no se renueva automáticamente

1. **Verificar webhook:**
   - `invoice.paid` debe estar configurado en Stripe Dashboard
   - Revisar logs para ver si el evento llega

2. **Verificar datos:**
   - `user.stripeSubscriptionId` debe estar guardado
   - El `subscriptionId` del invoice debe coincidir

3. **Probar manualmente:**
   - Usar Stripe Dashboard → Subscriptions → "Advance subscription" para simular el siguiente período

---

## Flujo Completo Visual

### Pago Único

```
Usuario → Frontend → POST /checkout → Backend crea Payment (PENDING)
                                      ↓
                              Stripe Checkout Session
                                      ↓
                              Usuario paga en Stripe
                                      ↓
                              Redirect a success_url
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    │                                   │
            Webhook configurado                  Sin webhook
                    │                                   │
        checkout.session.completed          Frontend llama
        → Asigna licencia                  /verify-session
        → Payment (COMPLETED)              → Asigna licencia
                                           → Payment (COMPLETED)
```

### Suscripción

```
Usuario → POST /subscribe → Backend crea/obtiene Customer
                            ↓
                    Stripe Checkout Session (subscription)
                            ↓
                    Usuario completa suscripción
                            ↓
                    checkout.session.completed (webhook)
                            ↓
                    Asigna licencia inicial
                    Guarda stripeSubscriptionId
                            ↓
                    [Cada mes/trimestre]
                            ↓
                    invoice.paid (webhook)
                            ↓
                    Extiende licencia
                    Crea Payment (recurring)
```

---

## Seguridad

### Verificación de Webhooks

- **Nunca procesar eventos sin verificar la firma:** Usar siempre `stripe.webhooks.constructEvent()`
- **El secreto del webhook es crítico:** Mantener `STRIPE_WEBHOOK_SECRET` seguro, nunca exponerlo en el frontend
- **HTTPS obligatorio en producción:** Stripe solo envía webhooks a URLs HTTPS

### Protección de Datos

- **Metadata segura:** Solo incluir IDs en `metadata`, nunca información sensible (contraseñas, tokens completos)
- **Logging:** No registrar información de tarjetas o datos sensibles en logs
- **Validación:** Siempre validar que `userId` en metadata coincida con el usuario autenticado (en endpoints que requieren auth)

---

## Mejores Prácticas

1. **Siempre configurar webhook en producción** para procesamiento automático.
2. **Usar `metadata` en las sesiones** para asociar pagos con usuarios (`userId`, `paymentId`).
3. **Manejar idempotencia:** Verificar si un pago ya está `COMPLETED` antes de asignar licencia nuevamente.
4. **Logging estructurado:** Registrar todos los eventos importantes para debugging.
5. **Validar firma del webhook:** Nunca procesar eventos sin verificar la firma.
6. **Manejar estados de suscripción:** `active`, `past_due`, `canceled`, `trialing`.
7. **Sincronizar Entitlements:** Después de asignar/extender licencia, llamar a `syncEntitlementsFromLicense()`.
8. **Configurar middleware correctamente:** Webhook endpoint debe usar `express.raw()` antes de `express.json()`.
9. **Manejar errores gracefully:** Siempre responder al webhook (`res.json({ received: true })`) incluso si hay errores internos.

---

## Testing

### Modo Test

Usa claves de test de Stripe (`sk_test_...`):

**Tarjetas de prueba:**
- **Éxito:** `4242 4242 4242 4242` (cualquier fecha futura, cualquier CVC)
- **Requiere autenticación:** `4000 0025 0000 3155`
- **Rechazada:** `4000 0000 0000 0002`
- **Fondos insuficientes:** `4000 0000 0000 9995`

**Ver más:** [Stripe Testing Cards](https://stripe.com/docs/testing#cards)

### Webhook Local

Para probar webhooks en desarrollo local:

1. **Instalar Stripe CLI:** [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)
2. **Login:** `stripe login`
3. **Escuchar eventos:** `stripe listen --forward-to localhost:5000/api/payments/webhook`
4. **Copiar secreto:** El CLI muestra `whsec_...` → usar como `STRIPE_WEBHOOK_SECRET` temporalmente
5. **Trigger eventos:**
   - `stripe trigger checkout.session.completed`
   - `stripe trigger invoice.paid`
   - `stripe trigger customer.subscription.deleted`

### Testing de Suscripciones

Para probar suscripciones recurrentes:

1. Usar tarjeta de test: `4242 4242 4242 4242`
2. En **Stripe Dashboard** → **Subscriptions**, puedes:
   - **Avanzar período:** Usar "Advance subscription" para simular el siguiente cobro
   - **Cancelar:** Cancelar manualmente para probar `customer.subscription.deleted`

---

## Referencias

- [Stripe Checkout Sessions](https://stripe.com/docs/payments/checkout)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

---

**Última actualización:** Febrero 2026
