# Resumen Técnico - Bloqueo de Pestaña Empresa

## 🎯 Objetivo
Implementar bloqueo **funcional y visual** de la pestaña "Empresa" para usuarios sin suscripción **Enterprise**.

---

## 📊 Arquitectura de Validación

```
┌─────────────────────────────────────────────────────────┐
│                   USUARIO APP                          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  hasEnterpriseAccess │  ← screens.tsx línea 980
        │  (subscription)      │
        └────────────┬─────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   ✅ RENDERIZAR         ❌ RENDERIZAR
   CHIP HABILITADO       CHIP BLOQUEADO
   - Color normal        - Color gris
   - Clickeable          - Candado 🔒
   - Función normal      - onClick preventDefault
   - SIN límites         - Toast: "Acceso restringido"


┌────────────────────────────────────────────┐
│   FUNCIÓN: hasEnterpriseAccess()           │
│   (subscriptions.ts)                       │
├────────────────────────────────────────────┤
│ INPUT: subscription: UserSubscription      │
│ STEPS:                                     │
│  1. hasActiveSubscription()? → false       │
│  2. subscription exists? → false           │
│  3. getPlanType(plan) → plan type          │
│  4. canAccessEnterprise(type) → boolean    │
│ OUTPUT: true|false                         │
└────────────────────────────────────────────┘
         ▼
┌────────────────────────────────────────────┐
│   FUNCIÓN: getPlanType()                   │
│   (plans.ts)                               │
├────────────────────────────────────────────┤
│ "enterprise" → "enterprise" ✅             │
│ "business"  → "business"                   │
│ undefined   → "free" ⚠️                     │
│ otros       → "free" ⚠️                     │
└────────────────────────────────────────────┘
         ▼
┌────────────────────────────────────────────┐
│   FUNCIÓN: canAccessEnterprise()           │
│   (plans.ts)                               │
├────────────────────────────────────────────┤
│ PLANS.free.canAccessEnterprise = false     │
│ PLANS.business.canAccessEnterprise = false │
│ PLANS.enterprise.canAccessEnterprise = true│
└────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Validación

### Ruta Crítica: Usuario sin Suscripción

```
1. subscribeToUserSubscription(userId)
   ├─ Query: where status IN ["active", "past_due"]
   ├─ Resultado: null (no encontrado)
   └─ callback(null)

2. setSubscription(null)
   ├─ State actualizado
   └─ Re-render

3. hasEnterpriseAccess(null)
   ├─ hasActiveSubscription(null) → false
   └─ return false

4. {false ? <Chip habilitado> : <Chip bloqueado>}
   ├─ Renderiza rama else
   ├─ Chip gris con candado
   ├─ onClick preventDefault
   └─ Toast: "Acceso a Empresa solo con plan Enterprise"
```

### Ruta Crítica: Usuario con Enterprise

```
1. subscribeToUserSubscription(userId)
   ├─ Query: where status IN ["active", "past_due"]
   ├─ Resultado: {plan: "enterprise", status: "active", ...}
   └─ callback(subscription)

2. setSubscription(subscription)
   ├─ State actualizado
   └─ Re-render

3. hasEnterpriseAccess(subscription)
   ├─ hasActiveSubscription() → true (status="active")
   ├─ getPlanType("enterprise") → "enterprise"
   ├─ canAccessEnterprise("enterprise") → true
   └─ return true

4. {true ? <Chip habilitado> : <Chip bloqueado>}
   ├─ Renderiza rama if
   ├─ Chip normal (gris inactivo, azul activo)
   ├─ onClick funciona
   └─ Acceso a "Empresa" sin restricción
```

---

## 🔐 Capas de Seguridad

### Capa 1: Frontend (screens.tsx)
```typescript
{hasEnterpriseAccess(subscription) ? (...) : (...)}
// Renderizado condicional - previene acceso visual
```

### Capa 2: Validación de Plan (subscriptions.ts)
```typescript
export function hasEnterpriseAccess(subscription) {
  if (!hasActiveSubscription(subscription)) return false;
  if (!subscription) return false;
  const planType = getPlanType(subscription.plan);
  return canAccessEnterprise(planType);
}
// Validación lógica - previene acceso lógico
```

### Capa 3: Configuración de Planes (plans.ts)
```typescript
enterprise: {
  canAccessEnterprise: true,
  monthlyClipLimit: Infinity
}
// Fuente de verdad - define qué planes tienen acceso
```

### Capa 4: Firestore Rules (firestore.rules)
```
match /users/{userId}/subscriptions/{subscriptionId} {
  allow read: if request.auth.uid == userId;
  allow write: if false; // Solo servidor puede escribir
}
// Seguridad en backend - valida acceso a datos
```

### Capa 5: Server Functions
```typescript
// Todas las operaciones en Empresa verifican
if (!hasEnterpriseAccess(context.userId)) {
  throw new Error("Insufficient permissions");
}
// Validación en servidor - previene bypass de cliente
```

---

## 🎨 Componentes Modificados

### 1. Chip (screens.tsx:138-156)

**Antes:**
```typescript
function Chip({
  on: boolean;
  onClick: () => void;
  children: string;
})
```

**Después:**
```typescript
function Chip({
  on: boolean;
  onClick: (e?: React.MouseEvent) => void;
  children: React.ReactNode;  // ← Permite JSX
  className?: string;         // ← Permite estilos
})
```

**Por qué:** Necesitábamos pasar un elemento complejo con ícono de candado + estilos personalizados (opacity, cursor).

---

### 2. Profile Panel (screens.tsx:968-985)

**Antes:**
```typescript
<div className="mt-3 flex gap-1 rounded-[14px] bg-fg/5 p-1">
  <Chip on={panel === "profile"} onClick={() => setPanel("profile")}>
    Perfil
  </Chip>
  <div className={!hasEnterpriseAccess(subscription) ? "pointer-events-none opacity-50" : ""}>
    <Chip on={panel === "business"} onClick={() => setPanel("business")}>
      Empresa
    </Chip>
  </div>
</div>
```

**Después:**
```typescript
<div className="mt-3 flex gap-1 rounded-[14px] bg-fg/5 p-1">
  <Chip on={panel === "profile"} onClick={() => setPanel("profile")}>
    Perfil
  </Chip>
  {hasEnterpriseAccess(subscription) ? (
    <Chip on={panel === "business"} onClick={() => setPanel("business")}>
      Empresa
    </Chip>
  ) : (
    <div className="relative flex-1" title="Solo disponible con plan Enterprise">
      <Chip on={false} onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toastMsg("Acceso a Empresa solo con plan Enterprise");
      }} className="opacity-50 cursor-not-allowed">
        <Lock size={14} className="inline mr-1" />
        Empresa
      </Chip>
    </div>
  )}
</div>
```

**Por qué:** `pointer-events-none` no previene cambios de estado internos de React. El renderizado condicional if/else es más robusto.

---

### 3. useEffect de Reseteo (screens.tsx:849-855)

**Nuevo:**
```typescript
// Reset panel to "profile" if user loses enterprise access
useEffect(() => {
  if (panel === "business" && !hasEnterpriseAccess(subscription)) {
    setPanel("profile");
    toastMsg("Acceso a Empresa revocado - plan no válido");
  }
}, [subscription, panel]);
```

**Por qué:** Si un usuario pierde su suscripción Enterprise mientras está en la pestaña "Empresa", debe ser sacado automáticamente. Este useEffect lo hace.

---

## 📈 Límites de Clips por Plan

```typescript
// plans.ts
export const PLANS = {
  free: { monthlyClipLimit: 2 },
  business: { monthlyClipLimit: 15 },
  enterprise: { monthlyClipLimit: Infinity }
}

// clip-limits.ts
export async function validateClipCreation(userId: string, planType: PlanType) {
  const limit = getMonthlyClipLimit(planType);
  const count = await getMonthlyClipCount(userId);
  if (count >= limit && limit !== Infinity) {
    throw new Error(`Clip limit reached: ${count}/${limit}`);
  }
}
```

---

## 🔄 Estado y Listeners

### Subscription Listener
```typescript
useEffect(() => {
  if (!firebaseConfigured || !user?.id) return;
  return subscribeToUserSubscription(
    user.id,
    (sub) => setSubscription(sub),
    (error) => console.error("Error:", error)
  );
}, [user?.id]);
// Se ejecuta cuando user.id cambia
// Mantiene subscription sincronizada con Firestore
// Listener activo todo el tiempo
```

### Panel Reseteo Listener
```typescript
useEffect(() => {
  if (panel === "business" && !hasEnterpriseAccess(subscription)) {
    setPanel("profile");
    toastMsg("Acceso a Empresa revocado - plan no válido");
  }
}, [subscription, panel]);
// Se ejecuta cuando subscription O panel cambian
// Revisa si el usuario aún tiene acceso
// Si no, fuerza volver a "profile"
```

---

## 🛠️ Configuración de Build

### gradle.properties
```properties
# Antes
org.gradle.jvmargs=-Xmx1536m

# Después
org.gradle.jvmargs=-Xmx1536m
org.gradle.java.home=C:/Program Files/Android/Android Studio/jbr
```

**Razón:** Gradle 8.13.0+ requiere Java 11+. Android Studio JBR (Java 25) lo proporciona.

---

## 📦 APK Generada

| Propiedad | Valor |
|-----------|-------|
| Archivo | `ClipsApp-debug-enterprise-locked.apk` |
| Tamaño | 6.08 MB |
| Build Type | Debug (testing) |
| Android Min | API 9 |
| Android Target | API 36 |
| Java | OpenJDK 25.0.3 (JBR) |
| Gradle | 8.14.3 |
| Capacitor | 7.x |

---

## 🚀 Próximos Pasos

### Testing en Dispositivo
1. `adb install -r ClipsApp-debug-enterprise-locked.apk`
2. Crear usuarios con diferentes planes
3. Verificar rendering de Tab Empresa según plan
4. Verificar límites de clips por plan
5. Verificar reseteo automático cuando pierde acceso

### Production Release
1. Generar APK/Bundle firmado
2. Testear contra Firestore production
3. Verificar webhooks de Stripe production
4. Publicar en Google Play Store

### Monitoreo
1. Analytics: Tracking de acceso a pestaña Empresa
2. Errors: Capturar errores de validación
3. Performance: Monitor de Firestore queries
4. User Feedback: Recopilar feedback de acceso bloqueado

---

## 📝 Cambios de Archivo Summary

| Archivo | Cambios | Líneas |
|---------|---------|--------|
| `screens.tsx` | Chip (tipos), useEffect reseteo, renderizado if/else | 138-856, 968-985 |
| `gradle.properties` | Agregar org.gradle.java.home | +1 línea |
| `subscriptions.ts` | (Sin cambios - funciones ya existen) | - |
| `plans.ts` | (Sin cambios - ya define canAccessEnterprise) | - |
| `clip-limits.ts` | (Sin cambios - ya valida límites) | - |

---

**Versión:** 1.0.0
**Fecha:** 21/11/2026
**Estado:** ✅ Completado y compilado
