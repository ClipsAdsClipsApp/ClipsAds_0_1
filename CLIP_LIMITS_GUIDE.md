# 📊 Límites de Clips por Plan - Documentación

> **Nota:** Los ejemplos históricos de este documento describen reglas antiguas.
> La configuración actual es: gratuito, 2 clips; Business, 10 clips; Enterprise,
> ilimitados. Business y Enterprise acceden a Empresa y a todas las opciones de
> publicación. El periodo mensual empieza en el aniversario del registro para
> usuarios gratuitos y en el aniversario de inicio de la suscripción para planes
> de pago, también cuando la facturación es anual. El impago mantiene el acceso
> durante siete días desde su inicio.
>
> El historial de publicaciones registradas por el nuevo sistema se conserva al
> borrar un clip. Los clips eliminados antes de introducir ese registro no pueden
> recuperarse para el cómputo; los clips antiguos que todavía existen sí cuentan.

## Tabla de Comparación

```
┌──────────────┬──────────┬────────────┬──────────────┐
│   PLAN       │  PRECIO  │ CLIPS/MES  │  EMPRESA     │
├──────────────┼──────────┼────────────┼──────────────┤
│ 📱 Libre     │   €0     │     2      │    ❌ NO     │
│ 💼 Business  │   €29    │    15      │    ❌ NO     │
│ 🚀 Enterprise│   €99    │  ILIMITADO │    ✅ SÍ     │
└──────────────┴──────────┴────────────┴──────────────┘
```

---

## Escenarios de Uso

### Escenario 1: Usuario Gratuito

```
Usuario: @juan (sin suscripción)
Plan actual: FREE

┌─────────────────────────────────────┐
│          📱 PERFIL DE JUAN           │
└─────────────────────────────────────┘

Uso de clips:
  Clips creados este mes: 2/2 ✅ LÍMITE ALCANZADO
  Próximo mes se reinicia

Tabs disponibles:
  ✅ Perfil (editable)
  🔒 Empresa (bloqueado - solo con plan Enterprise)

Mensaje al intentar acceso:
  "Acceso a Empresa solo con plan Enterprise"
```

### Escenario 2: Usuario con Plan Business

```
Usuario: @acme_corp (con suscripción)
Plan actual: BUSINESS
Período activo: Nov 1 - Nov 30

┌─────────────────────────────────────┐
│       💼 PERFIL ACME CORP            │
└─────────────────────────────────────┘

Uso de clips:
  Clips creados este mes: 8/15
  Clips restantes: 7
  
  Progreso: ████░░░░░░ (53%)

Tabs disponibles:
  ✅ Perfil (editable)
  🔒 Empresa (bloqueado - requiere plan Enterprise)

Notas:
  - Puede crear hasta 15 clips/mes
  - NO tiene acceso a funciones Enterprise
  - Puede actualizar a Enterprise en cualquier momento

Mensaje al intentar acceso:
  "Acceso a Empresa solo con plan Enterprise"
```

### Escenario 3: Usuario con Plan Enterprise

```
Usuario: @megacorp (con suscripción)
Plan actual: ENTERPRISE
Período activo: Nov 1 - Nov 30

┌─────────────────────────────────────┐
│       🚀 PERFIL MEGACORP             │
└─────────────────────────────────────┘

Uso de clips:
  Clips creados este mes: 142
  Límite: ILIMITADO ♾️
  
  Progreso: ✅ SIN LÍMITE

Tabs disponibles:
  ✅ Perfil (editable)
  ✅ Empresa (acceso completo) ← DESBLOQUEADO

Funciones disponibles en Empresa:
  ✅ Crear teams
  ✅ Gestionar empleados
  ✅ Acceso a métricas avanzadas
  ✅ Webhooks personalizados
  ✅ Soporte prioritario

Notas:
  - Clips ILIMITADOS
  - Acceso completo a Empresa
  - Renovación automática cada mes
```

---

## Implementación Técnica

### Archivo: `src/lib/stripe/plans.ts`

Define la configuración de cada plan:

```typescript
export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    id: "free",
    name: "Libre",
    monthlyClipLimit: 2,
    canAccessEnterprise: false,
  },
  business: {
    id: "business",
    name: "Business",
    monthlyClipLimit: 15,
    canAccessEnterprise: false,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthlyClipLimit: Infinity,
    canAccessEnterprise: true,
  },
};
```

### Archivo: `src/lib/firebase/clip-limits.ts`

Implementa la lógica de conteo:

```typescript
// Obtener clips creados en el mes actual
const clipsThisMonth = await getClipsThisMonth(userId);

// Obtener información de uso
const usage = await getUserClipUsage(userId, subscription);

console.log(usage);
// {
//   clipsThisMonth: 8,
//   monthlyLimit: 15,
//   canCreateMoreClips: true,
//   clipsRemaining: 7
// }

// Validar si puede crear más
const canCreate = await canCreateClip(userId, subscription);
// true si clipsThisMonth < monthlyLimit
```

---

## Integración en Componentes

### En `screens.tsx` - Bloqueo de Tab Empresa

```typescript
<div
  className={cn(
    "relative flex-1",
    // Si NO tiene acceso Enterprise: gris y no clickeable
    !hasEnterpriseAccess(subscription) && "opacity-50 cursor-not-allowed pointer-events-none"
  )}
  title={
    !hasEnterpriseAccess(subscription) 
      ? "Solo disponible con plan Enterprise" 
      : ""
  }
>
  <Chip
    on={panel === "business"}
    onClick={() => {
      if (!hasEnterpriseAccess(subscription)) {
        toastMsg("Acceso a Empresa solo con plan Enterprise");
        return;
      }
      setPanel("business");
    }}
  >
    {!hasEnterpriseAccess(subscription) && (
      <Lock size={14} className="inline mr-1" />
    )}
    Empresa
  </Chip>
</div>
```

---

## Conteo de Clips - Consulta a Firestore

```typescript
// Función: getClipsThisMonth(userId)
// 
// Busca clips del usuario en el mes actual:
// - Colección: /clips
// - Filtro 1: authorId == userId
// - Filtro 2: createdAt >= mes_inicio (1 de mes)
// - Filtro 3: createdAt < mes_siguiente (1 de mes siguiente)

// Ejemplo para Noviembre 2026:
const start = new Date(2026, 10, 1);    // Nov 1, 2026 00:00
const end   = new Date(2026, 11, 1);    // Dec 1, 2026 00:00

const q = query(
  collection(db, "clips"),
  where("authorId", "==", userId),
  where("createdAt", ">=", Timestamp.fromDate(start)),
  where("createdAt", "<", Timestamp.fromDate(end))
);

const result = await getDocs(q);
// Retorna: cantidad de clips en ese rango
```

---

## Estados de UI

### Estado 1: Sin Suscripción

```
┌─────────────┬─────────────┐
│   Perfil    │ 🔒 Empresa  │
└─────────────┴─────────────┘
  Normal      Deshabilitado
              - Opacidad 50%
              - pointer-events-none
              - Cursor: no-allowed
              - Tooltip: "Solo disponible con plan Enterprise"
```

### Estado 2: Suscripción Activa (Business)

```
┌─────────────┬─────────────┐
│   Perfil    │ 🔒 Empresa  │
└─────────────┴─────────────┘
  Normal      Deshabilitado
              - Opacidad 50%
              - pointer-events-none
              - Lock icon visible
              - Mismo tooltip
```

### Estado 3: Suscripción Active (Enterprise)

```
┌─────────────┬─────────────┐
│   Perfil    │  Empresa    │
└─────────────┴─────────────┘
  Normal      DESBLOQUEADO ✅
              - Opacidad 100%
              - Clickeable
              - Sin lock icon
              - Acceso completo
```

---

## Validación en Firestore Rules

**La regla de subscriptions:**

```firestore
match /subscriptions/{subscriptionId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow create: if request.auth != null && request.auth.uid == userId
    && request.resource.data.plan in ["business", "enterprise"]
    && request.resource.data.status in ["active", "past_due"];
  allow update: if request.auth != null && request.auth.uid == userId
    && resource.data.stripeCustomerId == request.resource.data.stripeCustomerId;
  allow delete: if false;  // ← No se puede eliminar (audit trail)
}
```

---

## Testing

### Test 1: Bloqueo Efectivo

```bash
1. Crear cuenta nueva
2. NO pagar ningún plan
3. Ir a Perfil → Click en "Empresa"
   ✅ RESULTADO: No se abre, toast aparece
   ✅ Verificar: pointer-events-none activo
```

### Test 2: Plan Business Bloqueado

```bash
1. Pagar plan Business en Stripe (test mode)
2. Webhook actualiza Firestore: plan="business"
3. Recargar app
4. Ir a Perfil → Click en "Empresa"
   ✅ RESULTADO: Seguido bloqueado
   ✅ Verificar: Toast "Acceso a Empresa solo con plan Enterprise"
```

### Test 3: Plan Enterprise Desbloqueado

```bash
1. Upgrade a plan Enterprise en Stripe
2. Webhook actualiza Firestore: plan="enterprise"
3. Recargar app
4. Ir a Perfil → Click en "Empresa"
   ✅ RESULTADO: Se abre correctamente
   ✅ Verificar: Tab activo, contenido visible
```

### Test 4: Conteo de Clips

```bash
1. Crear cuenta con plan Business (15 clips/mes)
2. Crear 10 clips
   Verificar: getClipsThisMonth() retorna 10
3. Crear 5 clips más (total 15)
   Verificar: Límite alcanzado, no se puede crear más
4. Upgrade a Enterprise
   Verificar: Ahora se puede crear sin límite
```

---

## Troubleshooting

### Problema: Tab "Empresa" aún clickeable sin suscripción

```
Causa probable: 
- pointer-events-none no se está aplicando
- CSS no se cargó correctamente

Solución:
1. Limpiar cache: Ctrl+Shift+Delete
2. Verificar DevTools: elemento tiene class "pointer-events-none"?
3. Revisar screens.tsx línea 967-980
```

### Problema: getClipsThisMonth() retorna 0 siempre

```
Causa probable:
- Clips no tienen "createdAt" en Firestore
- Consulta de fecha está mal

Solución:
1. Verificar que clips tengan campo "createdAt" tipo Timestamp
2. Revisar que fecha está en rango correcto
3. Revisar firestore.rules permite lectura de clips
```

### Problema: hasEnterpriseAccess() siempre retorna false

```
Causa probable:
- Webhook no está actualizando plan en Firestore
- Suscripción no tiene status "active"

Solución:
1. Verificar webhook en Stripe Dashboard está configurado
2. Enviarse evento de prueba desde Stripe
3. Revisar Firestore: /users/[userId]/subscriptions debe tener plan="enterprise"
4. Verificar status es "active" o "past_due"
```
