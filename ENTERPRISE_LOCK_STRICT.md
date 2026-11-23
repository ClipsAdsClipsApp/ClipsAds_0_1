# 🔒 Bloqueo Estricto de Empresa + Límite de Clips por Plan

## Cambios Implementados

### 1. **Bloqueo Estricto de la Pestaña "Empresa"**

**Problema anterior:** El usuario podía hacer click en la pestaña pero recibía un mensaje de toast.

**Solución implementada:**
- ✅ La pestaña "Empresa" ahora es **completamente no interactiva** sin plan Enterprise
- ✅ Se agregó `pointer-events-none` para bloquear clicks
- ✅ Se cambió el mensaje a **"Acceso a Empresa solo con plan Enterprise"** (más específico)
- ✅ Se cambió la validación de `hasActiveSubscription()` a `hasEnterpriseAccess()` (solo Enterprise permite acceso)

**Archivo modificado:**
- `src/components/screens.tsx` (líneas 967-980): Lógica del tab "Empresa" ahora rechaza cualquier intento sin plan Enterprise

---

### 2. **Sistema de Límite de Clips por Plan**

Se creó un nuevo archivo para gestionar límites de clips por plan:

**`src/lib/firebase/clip-limits.ts`** (90 líneas)
```typescript
// Límites por plan:
// - Free: 2 clips/mes
// - Business: 15 clips/mes  
// - Enterprise: Ilimitado

// Funciones principales:
getClipsThisMonth(userId)      // Contar clips del mes actual
getUserClipUsage(userId, sub)  // Obtener uso completo del usuario
canCreateClip(userId, sub)     // Validar si puede crear más clips
getClipLimitMessage(usage)     // Mensaje amigable para el usuario
```

---

### 3. **Configuración de Planes**

Se creó un nuevo archivo para definir todos los planes:

**`src/lib/stripe/plans.ts`** (60 líneas)
```typescript
export const PLANS = {
  free: {
    id: "free",
    name: "Libre",
    monthlyClipLimit: 2,
    canAccessEnterprise: false,
    features: ["2 clips por mes", "Perfil básico", ...]
  },
  business: {
    id: "business", 
    name: "Business",
    monthlyClipLimit: 15,
    canAccessEnterprise: false,
    features: ["15 clips por mes", ...]
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise", 
    monthlyClipLimit: Infinity,
    canAccessEnterprise: true,
    features: ["Clips ilimitados", "Acceso empresa", ...]
  }
};
```

---

### 4. **Funciones de Validación Mejoradas**

Se ampliaron las funciones en `src/lib/firebase/subscriptions.ts`:

```typescript
// NUEVA: Verificar acceso a Enterprise
hasEnterpriseAccess(subscription) → boolean

// NUEVA: Obtener tipo de plan del usuario
getUserPlanType(subscription) → "free" | "business" | "enterprise"

// EXISTENTE: Verificar si hay suscripción activa
hasActiveSubscription(subscription) → boolean
```

---

## Flujo de Validación

```
Usuario intenta acceder a Empresa
           ↓
¿Tiene suscripción activa?
    ├─ NO → Plan = "free"
    └─ SÍ → Leer plan de Firestore
           ├─ plan="business" → Plan = "business"
           └─ plan="enterprise" → Plan = "enterprise"
           ↓
¿Plan == "enterprise"?
    ├─ NO → ❌ Pestaña bloqueada, no interactiva
    └─ SÍ → ✅ Acceso permitido
```

---

## Implementación en la UI

### Tab "Empresa" - Estados

```
SIN SUSCRIPCIÓN:
┌─────────────────┬──────────────┐
│   Perfil        │ 🔒 Empresa   │  ← Gris, no clickeable
└─────────────────┴──────────────┘
  ↑ Se puede click    ↓ No se puede click
  Acceso normal       pointer-events-none

CON PLAN BUSINESS:
┌─────────────────┬──────────────┐
│   Perfil        │ 🔒 Empresa   │  ← Gris, no clickeable
└─────────────────┴──────────────┘

CON PLAN ENTERPRISE:
┌─────────────────┬──────────────┐
│   Perfil        │   Empresa    │  ← Normal, clickeable
└─────────────────┴──────────────┘
                    ↓ Se puede click
                    Acceso completo
```

---

## Integración con Clips (Próximo Paso)

Cuando se implementen los límites de clips, agregar esto al crear clip:

```typescript
// Antes de crear el clip:
const usage = await getUserClipUsage(user.id, subscription);

if (!usage.canCreateMoreClips) {
  toastMsg(`Límite alcanzado (${usage.clipsThisMonth}/${usage.monthlyLimit})`);
  return;
}

// Crear el clip normalmente...
```

---

## Archivos Creados

1. **`src/lib/stripe/plans.ts`** - Definición de planes y configuración
2. **`src/lib/firebase/clip-limits.ts`** - Sistema de límites y conteo de clips

## Archivos Modificados

1. **`src/lib/firebase/subscriptions.ts`** - Nuevas funciones: `hasEnterpriseAccess()`, `getUserPlanType()`
2. **`src/components/screens.tsx`** - Bloqueo estricto del tab "Empresa" con `pointer-events-none`

---

## Próximos Pasos

1. ✅ Desplegar cambios a Vercel
2. 🔄 Probar acceso a "Empresa" sin suscripción (debe estar bloqueado)
3. 🔄 Probar acceso a "Empresa" con plan Business (debe estar bloqueado)
4. 🔄 Probar acceso a "Empresa" con plan Enterprise (debe funcionar)
5. ⏳ Implementar validación de límite de clips al crear clip
6. ⏳ Mostrar indicador de uso (ej: "2/15 clips usados")

---

## Testing

**Para probar manualmente:**

```bash
# 1. Crear usuario sin suscripción
# → Ir a Perfil → intentar click en "Empresa" → debe estar gris y no clickeable

# 2. Pagar plan Business en Stripe Dashboard (test mode)
# → Webhook actualiza Firestore automáticamente
# → Recargar app → "Empresa" sigue gris (Business no tiene acceso)

# 3. Cambiar plan a Enterprise en Stripe
# → Webhook actualiza Firestore a plan="enterprise"
# → Recargar app → "Empresa" se vuelve interactiva ✅
```
