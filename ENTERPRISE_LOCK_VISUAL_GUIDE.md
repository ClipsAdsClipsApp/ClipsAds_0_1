# 🔐 Bloqueo de Opción "Empresa" - Guía Visual de Implementación

## Cambio en la Interfaz

### ANTES: Tab "Empresa" Siempre Disponible
```
┌───────────────────────────────────────┐
│          PERFIL DE USUARIO            │
├───────────────────────────────────────┤
│                                       │
│  ┌─ Perfil ─┬─ Empresa ─┐           │
│  │          │           │            │
│  │ ACTIVO   │ ACTIVO    │            │
│  └──────────┴───────────┘            │
│                                       │
│  Contenido del panel empresarial...  │
│                                       │
└───────────────────────────────────────┘
```

### DESPUÉS: Tab "Empresa" Bloqueado Sin Suscripción
```
┌───────────────────────────────────────┐
│          PERFIL DE USUARIO            │
├───────────────────────────────────────┤
│                                       │
│  ┌─ Perfil ─┬─ 🔒 Empresa ─┐        │
│  │          │              │         │
│  │ ACTIVO   │ BLOQUEADO    │         │
│  └──────────┴──────────────┘         │
│                                       │
│  "Necesitas un plan activo para      │
│   acceder a Empresa"                 │
│                                       │
│  [Ver planes de suscripción]         │
│                                       │
└───────────────────────────────────────┘
```

---

## Flujo de Usuario

### Escenario 1: Usuario SIN Suscripción

```
┌─────────────────┐
│  Usuario Entra  │
│   a ClipsApp    │
└────────┬────────┘
         │
         ↓
┌─────────────────────┐
│  Va a Perfil/      │
│  Empresa Tab       │
└────────┬────────────┘
         │
         ↓
  🔒 TAB BLOQUEADO
         │
         ├─→ Se muestra candado (Lock icon)
         ├─→ Tooltip: "Requiere suscripción"
         └─→ Toast: "Necesitas un plan activo"
         │
         ↓
┌──────────────────────┐
│ Click "Ver planes"   │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│ Abre /pricing        │
│ (Business/Enterprise)│
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│ Paga con Stripe      │
│ Checkout            │
└────────┬─────────────┘
         │
         ↓ ✅ Pago Confirmado
         │
┌──────────────────────────┐
│ Webhook Stripe Notifica  │
│ event: subscription.    │
│ created                 │
└────────┬─────────────────┘
         │
         ↓
┌────────────────────────┐
│ Firestore Guardado:    │
│ users/{id}/            │
│ subscriptions/{sub_id} │
└────────┬───────────────┘
         │
         ↓ 🔄 Real-time Sync
         │
┌───────────────────────┐
│ Cliente Detecta       │
│ Cambio en Firestore   │
└────────┬──────────────┘
         │
         ↓
  🔓 TAB DESBLOQUEADO
         │
         ├─→ Desaparece el candado
         ├─→ Se activa el click
         └─→ Acceso a Business Panel
```

---

## Escenario 2: Usuario CON Suscripción Activa

```
┌─────────────────┐
│  Usuario Entra  │
│   a ClipsApp    │
└────────┬────────┘
         │
         ↓
  ✅ Detecta suscripción
     en Firestore
         │
         ↓
┌──────────────────────┐
│  Va a Perfil/       │
│  Empresa Tab        │
└────────┬─────────────┘
         │
         ↓
  ✅ TAB DESBLOQUEADO
         │
         ├─→ Sin candado
         ├─→ Clickeable
         └─→ Acceso total
         │
         ↓
┌──────────────────────┐
│ Ve Business Panel    │
│ - Clips publicados   │
│ - Analytics         │
│ - Métricas          │
└──────────────────────┘
```

---

## Arquitectura de Datos

```
┌─────────────────────────────────────────────────────┐
│                    FIRESTORE                        │
└─────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ↓                  ↓                  ↓
   ┌────────┐         ┌──────────┐    ┌────────────┐
   │ users  │         │   clips  │    │  product-  │
   │        │         │          │    │  insights  │
   └────┬───┘         └──────────┘    └────────────┘
        │
        └─→ subscriptions/  ← 🔑 NUEVA COLECCIÓN
            {subscriptionId}
            {
              stripeCustomerId
              stripeSubscriptionId
              status: active|past_due|canceled|paused
              plan: business|enterprise
              currentPeriodStart
              currentPeriodEnd
              createdAt
              updatedAt
              cancelledAt (si está cancelada)
            }
```

---

## Integración con Stripe

```
┌──────────────────────┐
│   STRIPE CHECKOUT    │
│   (Pago realizado)   │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────────────────────┐
│    STRIPE WEBHOOK                    │
│    POST /api/stripe/subscription     │
│                                      │
│  Eventos procesados:                │
│  - customer.subscription.created    │
│  - customer.subscription.updated    │
│  - customer.subscription.deleted    │
└──────────┬───────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│  Admin SDK (Firebase)                │
│  saveStripeSubscriptionFromWebhook() │
│                                      │
│  Verifica:                           │
│  - userId del metadata              │
│  - plan del producto                │
│  - status de suscripción            │
└──────────┬───────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│  FIRESTORE GUARDADO                  │
│  users/{userId}/                     │
│  subscriptions/{stripeSubId}         │
└──────────────────────────────────────┘
```

---

## Validación en Tiempo Real

### Cliente (React)
```javascript
// En Profile component:
useEffect(() => {
  subscribeToUserSubscription(
    user.id,
    (subscription) => {
      setSubscription(subscription);  // ← Actualiza estado
    }
  );
}, [user.id]);

// Tab de Empresa usa:
const isLocked = !hasActiveSubscription(subscription);
```

### Firestore (Real-time Listener)
```
Firestore Database
         │
         ├─→ Cambio detectado
         │   en subscriptions/{id}
         │
         └─→ Query ejecutada:
             WHERE status IN ['active', 'past_due']
             LIMIT 1
                │
                ↓
            Listener notificado
                │
                ↓
            setState(subscription)
                │
                ↓
            UI se re-renderiza
                │
                ↓
            🔓 Tab se desbloquea
```

---

## Checklist de Implementación

### Backend ✅
- [x] Crear colección `subscriptions` en Firestore
- [x] Actualizar reglas de Firestore
- [x] Crear función webhook para guardar suscripción
- [x] Crear función Admin SDK para procesar webhooks
- [x] Integrar webhook en `/api/stripe/subscription`

### Frontend ✅
- [x] Crear hook `useSubscription` para leer datos
- [x] Crear hook para suscripción real-time
- [x] Detectar cambios de suscripción en Profile
- [x] Bloquear tab "Empresa" sin suscripción
- [x] Mostrar UI de bloqueo (icono, tooltip)
- [x] Toast al intentar acceder sin suscripción

### Configuración ✅
- [x] Variables de entorno en `.env`
- [x] Webhook URL en Stripe Dashboard
- [x] Metadatos en checkout session

### Testing ⏳
- [ ] Verificar que tab se bloquea sin suscripción
- [ ] Simular pago con Stripe test cards
- [ ] Verificar que tab se desbloquea con pago
- [ ] Verificar que cancela en Firestore cuando se cancela en Stripe

---

## Variables de Entorno Necesarias

```bash
# .env.local (desarrollo)
VITE_FIREBASE_PROJECT_ID=tu-proyecto
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
FIREBASE_ADMIN_KEY='{"type":"service_account",...}'

# En Vercel/Producción
Mismas variables, con claves de producción
```

---

## Icono Visual en la UI

Cuando la suscripción no está activa:

```
  ┌─────────────────┐
  │ 🔒 Empresa      │  ← Candado de lucide-react
  └─────────────────┘
  opacity: 50%
  cursor: not-allowed
```

Cuando la suscripción está activa:

```
  ┌─────────────────┐
  │ Empresa         │  ← Sin icono, totalmente visible
  └─────────────────┘
  opacity: 100%
  cursor: pointer
```

---

## Flujo de Cambio de Plan

```
Usuario con plan Business
           │
           ↓
Paga upgrade a Enterprise
           │
           ↓
Stripe notifica webhook
           │
           ↓
Firestore actualiza:
- Elimina doc de Business
- Crea doc de Enterprise
           │
           ↓
Client detecta cambio
           │
           ↓
plan en state cambia
  "business" → "enterprise"
           │
           ↓
¿Quizás mostrar "Upgrade confirmed!"?
```

---

## Próximas Mejoras

```
Fase 2: Feature Gating
├─ Limitar clips por plan
├─ Contador de clips del mes
└─ Modal "Upgrade required"

Fase 3: Admin Dashboard
├─ Ver suscriptores
├─ Cancelar suscripciones
└─ Reportes de ingresos

Fase 4: UX Premium
├─ Email de confirmación
├─ Recordatorio de renovación
├─ Stripe Customer Portal
└─ Cambio entre planes
```

---

**Implementación Completada** ✅
