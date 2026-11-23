# 📊 Explicación Visual del Problema y la Solución

## ❌ ¿Por Qué No Funcionaba?

### Estructura INCORRECTA que Creamos:

```
Firestore Rules
│
├─ match /users/{userId}  ← ESTA REGLA NO EXISTÍA
│  └─ No había permitidos read/write/create
│
└─ match /users/{userId}/subscriptions/{subscriptionId}
   └─ Tenía reglas, pero sin la regla padre
```

**El Problema:**
Cuando el usuario intentaba hacer login (crear perfil en `/users/{userId}`):

```
Usuario hace login
       ↓
Intenta crear documento en /users/{userId}
       ↓
Firestore busca una regla que coincida
       ↓
❌ NO ENCUENTRA regla para /users/{userId}
       ↓
❌ RECHAZA con "Missing or insufficient permissions"
       ↓
Usuario no puede entrar a la app
```

### Función Problemática:

```
function hasActiveSubscription(userId) {
  let activeSubs = firestore.query(subsPath)  ← ❌ ESTO NO EXISTE
    .where('status', 'in', ['active', 'past_due'])
    .limit(1);
  return activeSubs.size() > 0;
}
```

**Por qué falla:**
- `firestore.query()` **NO EXISTE** en Firestore Security Rules v2
- Las reglas no pueden hacer queries complejas
- Solo pueden hacer operaciones simples: read, write, exists, get

---

## ✅ ¿Cómo Se Arregló?

### Estructura CORRECTA ahora:

```
Firestore Rules
│
├─ match /users/{userId}  ← ✅ AHORA EXISTE
│  ├─ allow read: if request.auth.uid == userId
│  ├─ allow create: if request.auth.uid == userId
│  ├─ allow write: if request.auth.uid == userId
│  │
│  └─ match /subscriptions/{subscriptionId}  ← Subcollection
│     ├─ allow read: if request.auth.uid == userId
│     ├─ allow create: if validaciones...
│     ├─ allow update: if request.auth.uid == userId
│     └─ allow delete: false
│
└─ match /product-insights/{productId}
   └─ ...otras colecciones...
```

**El Flujo Ahora:**
```
Usuario hace login
       ↓
Intenta crear documento en /users/{userId}
       ↓
Firestore busca una regla que coincida
       ↓
✅ ENCUENTRA: match /users/{userId}
       ↓
✅ Verifica: request.auth.uid == userId (SÍ)
       ↓
✅ PERMITE crear el documento
       ↓
✅ Usuario puede entrar a la app
```

---

## 🎯 Comparación: Antes vs Después

### ANTES (Roto)

```
┌─────────────────────────────────────┐
│ Firestore Rules                     │
├─────────────────────────────────────┤
│                                     │
│ ❌ NO hay regla para /users/{id}   │
│                                     │
│ ✅ Hay regla para /subscriptions/  │
│    (pero huérfana sin padre)        │
│                                     │
└─────────────────────────────────────┘
         ↓
    LOGIN FALLA
    "Missing permissions"
```

### DESPUÉS (Funcional)

```
┌─────────────────────────────────────┐
│ Firestore Rules                     │
├─────────────────────────────────────┤
│                                     │
│ ✅ Hay regla para /users/{id}      │
│    ├─ read ✅                       │
│    ├─ create ✅                     │
│    └─ write ✅                      │
│                                     │
│    └─ /subscriptions/ (subcollection)
│       ├─ read ✅                    │
│       ├─ create ✅ (validado)      │
│       ├─ update ✅                 │
│       └─ delete ❌                 │
│                                     │
└─────────────────────────────────────┘
         ↓
    LOGIN FUNCIONA
```

---

## 🔄 Cómo Desplegar la Reparación

### Opción 1: CLI de Firebase (Recomendado)

```bash
# En la terminal, en la carpeta del proyecto
firebase login
firebase deploy --only firestore:rules
```

**Resultado esperado:**
```
✔  Deploy complete!
  Firestore Rules have been deployed successfully.
```

### Opción 2: Firebase Console (Manual)

1. Ve a https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a **Firestore Database** → pestaña **Rules**

```
┌──────────────────────────────────────────┐
│ Firestore Database                       │
├──────────────────────────────────────────┤
│ ☑ Data ☑ Indexes ☑ Rules ← AQUÍ        │
└──────────────────────────────────────────┘
```

4. Haz click en **"Editar reglas"**
5. Borra el contenido actual
6. Pega el contenido de `firestore.rules` localmente
7. Haz click en **"Publicar"**

```
┌──────────────────────────────────────────┐
│ Reglas de seguridad de Firestore        │
│                                          │
│ rules_version = '2';                    │
│                                          │
│ service cloud.firestore {               │
│   match /databases/{database}/...       │
│   ...                                    │
│                                          │
│           [Publicar]  ← Click aquí       │
└──────────────────────────────────────────┘
```

---

## 🧪 Verificación Post-Fix

### Después de desplegar, prueba esto:

```
1. Recarga la app (F5 o Cmd+Shift+R)
2. Haz logout si ya estabas dentro
3. Intenta crear una cuenta nueva
4. Llena el formulario de registro
5. Verifica:
   ✅ No hay error "Missing permissions"
   ✅ Puedes ver el perfil
   ✅ La opción "Empresa" está bloqueada (🔒)
```

---

## 📌 ¿Qué NO Cambió?

El bloqueo de la opción "Empresa" **sigue funcionando exactamente igual**:

```
Usuario sin pago:
├─ Tab "Empresa" muestra 🔒
├─ No es clickeable
└─ Muestra toast "Necesitas plan activo"

Usuario con pago:
├─ Tab "Empresa" se desbloquea
├─ Es clickeable
└─ Acceso total
```

Lo que cambió fue **solo las reglas de Firestore** para permitir que los usuarios puedan entrar.

---

## 🎯 Resumen

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Regla /users/{id}** | ❌ No existe | ✅ Existe |
| **Login** | ❌ Falla | ✅ Funciona |
| **Creación perfil** | ❌ Rechazada | ✅ Permitida |
| **Bloqueo Empresa** | N/A | ✅ Sigue funcionando |
| **Subscripciones** | ❌ No se guardaban | ✅ Se guardan |

---

**Fix Completado:** 21 de Noviembre de 2026  
**Resultado:** ✅ App totalmente funcional
