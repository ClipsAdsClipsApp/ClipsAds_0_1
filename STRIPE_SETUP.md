# Verificación de Funcionalidad de Suscripción Stripe

## ✅ Componentes Implementados

### 1. **Endpoint de Suscripción** (`src/routes/api/stripe/subscription.ts`)
- ✅ Rutas POST para checkout y webhooks
- ✅ Autenticación con Firebase
- ✅ Configuración de planes Business y Enterprise
- ✅ Soporte para facturación mensual y anual
- ✅ Manejo de webhooks para eventos de suscripción
- ✅ Checkout con reserva por usuario e idempotencia

**Planes configurados:**
- Business mensual: 9,99 EUR/mes
- Business anual: 99,99 EUR/año
- Enterprise mensual: 29,99 EUR/mes
- Enterprise anual: 299,90 EUR/año

### 2. **Componente UI de Suscripción** (`src/components/subscription-plans.tsx`)
- ✅ Grid de 4 tarjetas de planes
- ✅ Visualización de precios y características
- ✅ Botones de "Comenzar ahora" con estado de carga
- ✅ Integración con Firebase Auth
- ✅ Redirección a Stripe Checkout
- ✅ Modales de éxito y cancelación

**Características mostradas:**
- Plan Business: 10 clips por periodo mensual, panel y métricas de empresa, segmentación y acciones completas.
- Plan Enterprise: clips ilimitados y las mismas opciones.

### 3. **Página de Pricing** (`src/routes/pricing.tsx`)
- ✅ Ruta en `/pricing`
- ✅ Integración con URL parameters para estados
- ✅ Visualización de modales de éxito/cancelación

## 🔧 Correcciones Realizadas

### Problema: Duplicate POST Handlers
**Estado anterior:** Dos funciones POST definidas en el mismo endpoint
```typescript
handlers: {
  POST: async () => { /* checkout */ },
  POST: async () => { /* webhook */ }  // ❌ Error: sobrescribe el anterior
}
```

**Solución aplicada:** Merged en un único handler con routing por header
```typescript
handlers: {
  POST: async ({ request }) => {
    const stripeSignature = request.headers.get("stripe-signature");
    if (stripeSignature) {
      // Webhook handler
    } else {
      // Checkout handler
    }
  }
}
```

## 📋 Checklist de Configuración Requerida

**Antes de usar en producción, configurar en Vercel:**

- [x] `STRIPE_SECRET_KEY` - Tu clave secreta de Stripe
- [x] `STRIPE_PUBLISHABLE_KEY` - Tu clave pública de Stripe (opcional, se puede pasar desde cliente)
- [x] `STRIPE_WEBHOOK_SECRET` - Secreto del webhook de Stripe
- [x] `FIREBASE_SERVICE_ACCOUNT_JSON` - Credenciales de Firebase Admin del proyecto, solo en el servidor

**En Stripe Dashboard:**

- [x] Verificar los importes configurados en el endpoint (Checkout crea precios recurrentes en línea)
- [x] Configurar endpoint de webhook: `https://tu-dominio.com/api/stripe/subscription`
- [x] Suscribirse a eventos:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

## 🧪 Verificación Local

Para testear la funcionalidad:

```bash
# Verifica que la página de pricing carga
curl http://localhost:8080/pricing

# Verifica que el endpoint existe
curl -X POST http://localhost:8080/api/stripe/subscription \
  -H "Content-Type: application/json" \
  -d '{"plan":"monthly","role":"business"}'
# Espera: { "error": "..." } (sin 404)

# Con autenticación de Firebase
curl -X POST http://localhost:8080/api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{"plan":"monthly","role":"business"}'
# Espera: URL de Stripe si la configuración es válida y no hay otro pago pendiente.
```

## Webhooks y datos verificados

Checkout revisa las sesiones del usuario identificadas por metadatos en Stripe,
rechaza suscripciones existentes y reutiliza una sesión pendiente compatible.
Una reserva atómica por usuario y una clave de idempotencia evitan crear dos
sesiones ante solicitudes simultáneas. Un intento antiguo cuyo resultado no
puede determinarse se bloquea para revisión en lugar de volver a cobrar.
Las sesiones antiguas abiertas sin identificador de intento deben caducar o
cerrarse desde Stripe antes de crear una nueva.
Los eventos de suscripción se verifican con la firma, consultan el estado
actual en Stripe y se guardan mediante Firebase Admin en
`users/{uid}/verifiedSubscriptions/{subscriptionId}`. Los fallos de
persistencia devuelven un error para que Stripe reintente. Las suscripciones
antiguas sin ambos metadatos requieren migración desde un entorno confiable.
`pastDueSince` conserva la primera fecha observada del impago; si un evento
anterior del mismo impago llega después, se conserva la fecha más temprana.
Los estados incompletos no se convierten en activos.

En la misma transacción se recalculan `users/{uid}/access/business` y
`users/{uid}/access/enterprise`, cada uno con `paidUntil` como Timestamp de
Firestore. Se conserva la máxima expiración de cada plan entre todas las
suscripciones verificadas: fin de periodo para `active`/`trialing` y siete días
desde `pastDueSince` para `past_due`, `unpaid` o una cancelación por impago.
Los demás estados no conceden acceso. Sin
suscripciones válidas para un plan se escribe el inicio de la época Unix. Las
reglas pueden comprobar ambos documentos con OR y `request.time < paidUntil`,
por lo que los vencimientos no requieren una tarea programada.

Las suscripciones ya guardadas antes de este cambio requieren volver a
procesar un evento de suscripción firmado para generar sus documentos de
acceso. No se deben utilizar los antiguos documentos `subscriptions`
editables por clientes como prueba de acceso.

## 📊 Estado Actual

✅ **Componentes UI:** Listos para usar
✅ **Endpoint:** Implementado y sin errores de sintaxis
✅ **Autenticación:** Integrada con Firebase
✅ **Webhooks:** Persistencia de suscripciones verificadas en Firebase Admin
⏳ **Integración Stripe:** Requiere credenciales en Vercel

**Limitaciones:** Los cambios y cancelaciones se gestionan desde Stripe, no
desde la aplicación. Los documentos de acceso se actualizan con los eventos de
Stripe; los eventos perdidos requieren reconciliación o reenvío. Las
suscripciones creadas fuera de este flujo o sin metadatos de usuario requieren
revisión manual. Antes de activar pagos reales, publica las reglas de Firestore
y verifica el flujo completo en modo de pruebas.
