# Stripe: pasar de Test a Live (pagos reales)

Pasos para activar Stripe en modo **Live** y dejar de usar el modo test.

---

## 1. Activar la cuenta en Stripe

1. Entra en [dashboard.stripe.com](https://dashboard.stripe.com).
2. Completa **Activate your account**: datos del negocio, identidad y cuenta bancaria para recibir pagos.
3. Stripe revisa la cuenta; cuando este activa podras usar claves **Live**.

---

## 2. Usar claves Live

En el **Dashboard de Stripe**:

- **Developers** → **API keys**.
- En **Standard keys** usa las de **Live** (no Test):
  - **Publishable key**: empieza por `pk_live_...`
  - **Secret key**: empieza por `sk_live_...`

En **Render** (servicio del backend), en **Environment**:

| Variable | Valor en produccion |
|----------|---------------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` |

Si el frontend usa clave publica para Stripe.js:

| Variable | Valor en produccion |
|----------|---------------------|
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |

---

## 3. Webhook en modo Live

1. En Stripe: **Developers** → **Webhooks**.
2. Cambia el modo a **Live** (selector arriba).
3. **Add endpoint**:
   - **URL**: `https://stream-schedule-api.onrender.com/api/payments/webhook`  
     (o `https://stream-schedule-api.onrender.com/stripe/webhook` si lo tienes asi).
   - **Eventos**: al menos `checkout.session.completed`. Si usas suscripciones: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Para reembolsos: `charge.refunded`.
4. Crea el endpoint y copia el **Signing secret** (empieza por `whsec_...`).
5. En Render, en el mismo servicio del backend:
   - `STRIPE_WEBHOOK_SECRET` = ese **Signing secret** del endpoint **Live**.

Asi el webhook procesa pagos reales y las licencias se aplican automaticamente.

---

## 4. Comprobar que no queden claves Test

En produccion **no** debe haber:

- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET` correspondiente a un webhook en modo **Test**.

Sustituye ambos por los valores **Live**.

---

## 5. Resumen

| Donde | Variable | Valor en produccion |
|-------|----------|---------------------|
| Backend (Render) | `STRIPE_SECRET_KEY` | `sk_live_...` |
| Backend (Render) | `STRIPE_WEBHOOK_SECRET` | `whsec_...` del webhook **Live** |
| Frontend (si aplica) | `REACT_APP_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |

Despues, redeploy del backend (y del frontend si cambiaste su env) para que carguen las nuevas variables. A partir de ahi Stripe estara activo y no se usara test.
