# Configuración del Webhook de Stripe

## Opción 1: Usar Stripe CLI (Recomendado para Desarrollo Local)

### Instalación de Stripe CLI

**Windows:**
```powershell
# Descargar desde: https://github.com/stripe/stripe-cli/releases
# O usar Scoop:
scoop install stripe
```

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Descargar desde: https://github.com/stripe/stripe-cli/releases
```

### Configurar Stripe CLI

1. Inicia sesión en Stripe CLI:
```bash
stripe login
```

2. En otra terminal, inicia el servidor backend:
```bash
cd backend
npm start
```

3. En otra terminal, inicia el forwarding del webhook:
```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```

4. Stripe CLI te dará un `webhook signing secret` que comienza con `whsec_`. 
   Copia ese valor y actualiza tu archivo `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_tu_secret_aqui
```

5. Reinicia el servidor backend para que cargue la nueva variable de entorno.

## Opción 2: Configurar Webhook en Stripe Dashboard (Para Producción)

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com) > **Developers** > **Webhooks**
2. Haz clic en **Add endpoint**
3. Ingresa la URL de tu webhook:
   - **Producción:** `https://tu-dominio.com/api/payments/webhook`
   - **Desarrollo con ngrok:** `https://tu-url-ngrok.ngrok.io/api/payments/webhook`
4. Selecciona el evento: `checkout.session.completed`
5. Copia el **Signing secret** (comienza con `whsec_`) y agrégala a tu `.env`

## Verificar que Funciona

1. Realiza un pago de prueba usando la tarjeta: `4242 4242 4242 4242`
2. Verifica en los logs del servidor que el webhook se recibió
3. Verifica que la licencia se activó automáticamente en la base de datos

## Troubleshooting

### El webhook no se recibe
- Verifica que el servidor esté corriendo en el puerto correcto
- Verifica que la URL del webhook sea correcta
- Revisa los logs de Stripe CLI o del Dashboard

### Error de verificación de firma
- Asegúrate de que `STRIPE_WEBHOOK_SECRET` sea el correcto
- Reinicia el servidor después de actualizar el `.env`
