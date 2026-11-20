# 🏗️ Arquitectura de Suscripción Stripe - Diagrama Visual

## Flujo de Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│                        USUARIO                                   │
│                                                                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ 1. Click "Ver planes de suscripción"
                       ▼
        ┌──────────────────────────────────┐
        │      Menu de Perfil               │
        │  (src/components/screens.tsx)    │
        │                                  │
        │  [Ver planes] ◀─── Cyan button  │
        │  [Logout]                        │
        └──────────────────┬───────────────┘
                           │
                           │ 2. Navega a /pricing
                           ▼
        ┌──────────────────────────────────┐
        │     Página de Pricing             │
        │   (src/routes/pricing.tsx)       │
        │                                  │
        │  Detecta URL params:             │
        │  ?subscription=success|cancelled │
        └──────────────────┬───────────────┘
                           │
                           │ 3. Renderiza
                           ▼
        ┌──────────────────────────────────────┐
        │   Componente SubscriptionPlans       │
        │  (src/components/subscription-plans) │
        │                                      │
        │  ┌──────────────────────────────┐  │
        │  │ BUSINESS       │ ENTERPRISE  │  │
        │  ├──────────────────────────────┤  │
        │  │ Monthly / Annual  Buttons    │  │
        │  │ $29.99 / $299.90             │  │
        │  │ [Comenzar ahora] ───────┐    │  │
        │  │                         │    │  │
        │  │ Monthly / Annual        │    │  │
        │  │ $99.99 / $999.90        │    │  │
        │  │ [Comenzar ahora] ───────┼────┼──┼─┐
        │  │                         │    │  │ │
        │  └──────────────────────────┘  │  │ │
        └──────────────────────────────────┘  │
                                               │
                           ┌───────────────────┘
                           │
                           │ 4. Click "Comenzar ahora"
                           ▼
        ┌──────────────────────────────────┐
        │  SubscriptionCard.onSubscribe()   │
        │                                  │
        │  1. Obtiene Firebase ID Token   │
        │  2. POST a /api/stripe/...      │
        │  3. Recibe {url, sessionId}     │
        │  4. Redirige a Stripe Checkout  │
        └──────────────────┬───────────────┘
                           │
                           │ 5. Envía credenciales
                           ▼
        ┌──────────────────────────────────┐
        │      Stripe Checkout              │
        │   (checkout.stripe.com)          │
        │                                  │
        │  Formulario de Pago:             │
        │  • Email                         │
        │  • Tarjeta de Crédito           │
        │  • Código Postal                │
        └──────────────────┬───────────────┘
                           │
                   ┌───────┴────────┐
                   │                │
         ┌─────────▼───────┐  ┌────▼────────────┐
         │   ✅ ÉXITO       │  │  ❌ CANCELADO    │
         │                 │  │                 │
         │ Redirige a:     │  │ Redirige a:     │
         │ /?subscription= │  │ /?subscription= │
         │ success&       │  │ cancelled       │
         │ session_id=... │  │                 │
         └─────────┬───────┘  └────┬────────────┘
                   │               │
                   │               │
         ┌─────────▼───────┐  ┌────▼────────────┐
         │  Modal de Éxito │  │ Modal de Cancel │
         │                 │  │                 │
         │ ✅ ¡Listo!      │  │ ⚠️ Cancelado    │
         │ Acceso premium  │  │ Reintenta luego │
         └─────────────────┘  └─────────────────┘


Webhook (Background)
═════════════════════

        ┌────────────────────────────────────┐
        │   Stripe Webhook Event              │
        │  (customer.subscription.created)   │
        └────────────────┬────────────────────┘
                         │
                         │ Envía POST
                         ▼
        ┌────────────────────────────────────┐
        │   /api/stripe/subscription          │
        │   (POST handler - Webhook)          │
        │                                     │
        │  1. Valida stripe-signature        │
        │  2. Procesa evento                  │
        │  3. Log en console                  │
        │  4. Devuelve 200 OK                 │
        └────────────────────────────────────┘
                         │
                 (TODO: Guardar en Firestore)
                         │
        ┌────────────────▼────────────────────┐
        │  Firestore (Future)                 │
        │  users/{userId}/subscriptions/      │
        │  {stripeSubscriptionId}             │
        │                                     │
        │  • stripeCustomerId                │
        │  • stripePriceId                   │
        │  • status: "active"                │
        │  • currentPeriodEnd                │
        └────────────────────────────────────┘
```

---

## Estructura de Componentes

```
src/
├── routes/
│   ├── __root.tsx ..................... (Shell - sin cambios)
│   ├── index.tsx ...................... (Home - sin cambios)
│   ├── pricing.tsx ..................... ✨ NUEVO
│   │   └── Parámetros:
│   │       ?subscription=success
│   │       ?subscription=cancelled
│   │
│   └── api/
│       └── stripe/
│           ├── subscription.ts ......... ✨ NUEVO
│           │   ├── POST /checkout
│           │   └── POST /webhook
│           │
│           └── connect.ts ............. (Existente)
│
├── components/
│   ├── screens.tsx .................... 📝 MODIFICADO
│   │   └── Profile: Agregó botón de pricing
│   │
│   ├── subscription-plans.tsx ......... ✨ NUEVO
│   │   ├── SubscriptionPlans()
│   │   ├── SubscriptionCard()
│   │   ├── SubscriptionSuccessModal()
│   │   └── SubscriptionCancelledModal()
│   │
│   └── chrome.tsx ..................... (Sin cambios)
│
└── lib/
    ├── stripe/
    │   ├── server.ts .................. (Existente)
    │   └── client.ts .................. (Existente)
    │
    └── firebase/
        └── client.ts .................. (Para autenticación)
```

---

## Flujo de Datos - POST a /api/stripe/subscription

```
REQUEST ENTRADA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Headers:
  Authorization: Bearer <FIREBASE_ID_TOKEN>
  Content-Type: application/json

Body:
  {
    "plan": "monthly" | "annual",
    "role": "business" | "enterprise"
  }

PROCESAMIENTO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Autenticar con Firebase ✓
2. Validar parámetros ✓
3. Buscar config de plan ✓
4. Crear sesión de Stripe ✓
5. Generar URLs de redirección ✓

RESPUESTA EXITOSA (200):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    "url": "https://checkout.stripe.com/pay/cs_...",
    "sessionId": "cs_...",
    "plan": "monthly",
    "role": "business",
    "amount": 29.99,
    "currency": "usd",
    "interval": "month"
  }

RESPUESTAS DE ERROR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
401: Sin autenticación
  { "error": "No autenticado" }

400: Parámetros inválidos
  { "error": "El plan debe ser 'monthly' o 'annual'." }

503: Stripe no configurado
  { 
    "error": "Stripe no está configurado",
    "code": "stripe_not_configured"
  }

500: Error interno
  { "error": "No se pudo iniciar el pago de suscripción." }
```

---

## Flujo de Datos - Webhook de Stripe

```
ENTRADA (Headers):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
stripe-signature: t=1234567890,v1=abcd...,v0=xyz...
Content-Type: application/json

ENTRADA (Body - Ejemplo):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "id": "evt_123...",
  "type": "customer.subscription.created",
  "object": "event",
  "data": {
    "object": {
      "id": "sub_123...",
      "customer": "cus_123...",
      "status": "active",
      "current_period_start": 1700000000,
      "current_period_end": 1702678400,
      "items": {
        "data": [
          {
            "price": {
              "id": "price_business_monthly",
              "recurring": { "interval": "month" }
            }
          }
        ]
      }
    }
  }
}

PROCESAMIENTO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Validar signature ✓
2. Construir evento ✓
3. Detectar tipo de evento ✓
4. Procesar según tipo:
   • customer.subscription.created → Log
   • customer.subscription.updated → Log
   • customer.subscription.deleted → Log
   • invoice.payment_succeeded → Log
   • invoice.payment_failed → Log

RESPUESTA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
200: { "received": true }

4XX/5XX: { "error": "Webhook processing failed" }
```

---

## Diagrama de Dependencias

```
Componentes Externos:
├── @tanstack/react-router ........... Routing
├── lucide-react ..................... Iconos
├── firebase/app ..................... Autenticación
├── @stripe/stripe-js ................ Checkout (cliente)
└── stripe ........................... API (servidor)

ClipsApp Components:
├── screens.tsx
│   └── Importa: SubscriptionPlans
│       └── Importa: subscription-plans.tsx
│           ├── Usa: getFirebaseAuth()
│           └── Llama: POST /api/stripe/subscription
│
└── pricing.tsx
    └── Importa: SubscriptionPlans
        └── [mismo de arriba]

Rutas:
├── __root.tsx ...................... Shell HTML
├── index.tsx ....................... Home + ClipsApp
├── pricing.tsx ..................... Página de planes
└── api/stripe/subscription.ts ....... Endpoint
    ├── Importa: authenticateFirebaseRequest()
    ├── Importa: getStripeClient()
    └── Importa: SUBSCRIPTION_PLANS config
```

---

**Diagrama actualizado:** 2026-11-20
**Formato:** ASCII + Mermaid compatible
