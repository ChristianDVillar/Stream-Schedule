# Configuración de Stripe para Pagos

Este documento explica cómo configurar Stripe para procesar pagos de licencias en la aplicación.

## Requisitos Previos

1. Crear una cuenta en [Stripe](https://stripe.com)
2. Obtener las claves de API (Secret Key y Publishable Key)
3. Configurar el webhook endpoint

## Pasos de Configuración

### 1. Obtener las Claves de API de Stripe

1. Inicia sesión en tu [Dashboard de Stripe](https://dashboard.stripe.com)
2. Ve a **Developers** > **API keys**
3. Copia tu **Secret key** (comienza con `sk_test_` para modo test o `sk_live_` para producción)
4. Copia tu **Publishable key** (comienza con `pk_test_` o `pk_live_`)

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en la carpeta `backend/` con las siguientes variables:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
FRONTEND_URL=http://localhost:3000
```

**Nota:** Para producción, usa las claves `live` en lugar de `test`.

### 3. Configurar el Webhook de Stripe

1. En el Dashboard de Stripe, ve a **Developers** > **Webhooks**
2. Haz clic en **Add endpoint**
3. Ingresa la URL de tu webhook:
   - **Desarrollo local:** Usa [Stripe CLI](https://stripe.com/docs/stripe-cli) para hacer forwarding:
     ```bash
     stripe listen --forward-to localhost:5000/api/payments/webhook
     ```
   - **Producción:** `https://tu-dominio.com/api/payments/webhook`
4. Selecciona los eventos a escuchar:
   - `checkout.session.completed`
5. Copia el **Signing secret** (comienza con `whsec_`) y agrégala a tu `.env` como `STRIPE_WEBHOOK_SECRET`

### 4. Probar el Sistema de Pagos

#### Modo Test (Recomendado para desarrollo)

Stripe proporciona tarjetas de prueba:

- **Tarjeta exitosa:** `4242 4242 4242 4242`
- **Tarjeta rechazada:** `4000 0000 0000 0002`
- **Cualquier fecha futura:** `12/34`
- **Cualquier CVC:** `123`

#### Verificar que Funciona

1. Inicia el servidor backend
2. Inicia el frontend
3. Ve a Settings > Licenses & Billing
4. Haz clic en "Comprar" en cualquier plan
5. Deberías ser redirigido a Stripe Checkout
6. Usa una tarjeta de prueba para completar el pago
7. Después del pago, serás redirigido de vuelta a la aplicación
8. Tu licencia debería estar activada automáticamente

## Estructura de Planes

Los planes disponibles son:

- **Monthly:** $5.99/mes - 30 días de duración
- **Quarterly:** $13.98/trimestre ($4.66/mes) - 90 días de duración
- **Lifetime:** $99.00 - Sin expiración

## Seguridad

- **Nunca** expongas tu `STRIPE_SECRET_KEY` en el frontend
- **Siempre** valida los webhooks usando el `STRIPE_WEBHOOK_SECRET`
- Usa HTTPS en producción
- Mantén tus claves seguras y no las subas a repositorios públicos

## Troubleshooting

### Error: "Stripe is not configured"
- Verifica que `STRIPE_SECRET_KEY` esté configurado en tu `.env`
- Reinicia el servidor después de agregar las variables de entorno

### Error: "Webhook signature verification failed"
- Verifica que `STRIPE_WEBHOOK_SECRET` sea correcto
- Asegúrate de que el webhook esté configurado correctamente en Stripe Dashboard

### El pago se completa pero la licencia no se activa
- Verifica los logs del servidor para ver si el webhook se recibió
- Verifica que el evento `checkout.session.completed` esté configurado en Stripe
- Revisa que la URL del webhook sea correcta

## Recursos Adicionales

- [Documentación de Stripe](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
