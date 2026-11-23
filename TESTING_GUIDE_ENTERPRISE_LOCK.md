# Guía de Testing - Bloqueo Funcional de Empresa

## 📱 Instalación de APK

### Requisitos
- Dispositivo Android 9+ o emulador
- Cable USB o conexión de red (para emulador)
- Android Debug Bridge (adb) instalado

### Pasos de Instalación

#### Opción 1: Usando ADB (Cable USB)
```bash
# 1. Conectar dispositivo y activar USB Debug
# 2. Verificar que adb ve el dispositivo
adb devices

# 3. Instalar APK
adb install -r C:\Users\TVCASA\Desktop\ClipsApp-debug-enterprise-locked.apk

# 4. Esperar mensaje "Success"
# 5. Abrir app desde launcher: "ClipsApp"
```

#### Opción 2: Usando Emulador Android Studio
```bash
# 1. Abrir Android Studio > Device Manager
# 2. Crear emulador (Android 11+ recomendado)
# 3. Iniciar emulador
# 4. adb install -r ClipsApp-debug-enterprise-locked.apk
# 5. Abrir desde launcher
```

#### Opción 3: Transferencia Manual
- Copiar APK a carpeta Descargas del dispositivo
- Abrir administrador de archivos
- Navegar a Descargas
- Tocar archivo APK
- Permitir instalación de fuentes desconocidas
- Instalar

---

## 🧪 Casos de Testing

### Escenario 1: Usuario SIN Suscripción (Free Plan)

#### Precondiciones
- Crear usuario nuevo o usar usuario sin suscripción
- Plan debe ser "free" o no existir

#### Pasos
1. **Registrarse/Iniciar sesión**
   - Email: `test-free@example.com`
   - Contraseña: `Test@12345`
   - Completar perfil

2. **Ir a pestaña Perfil**
   - Click en "Perfil" (tab inferior)
   - Scroll hacia abajo
   - Ver tabs: "Perfil" (azul activo) y "Empresa" (gris)

3. **Verificar Tab Empresa Bloqueado**
   - **Visual:** 
     - Chip "Empresa" debe estar gris (color `bg-fg/8`)
     - Opacidad reducida (50%)
     - Ícono de candado 🔒 visible antes del texto
   - **Funcional:**
     - Click en tab NO cambia de panel
     - Toast aparece: "Acceso a Empresa solo con plan Enterprise"
   - **Interacción:**
     - Cursor debe cambiar a "not-allowed" al pasar sobre tab

#### Resultado Esperado
✅ PASS: Tab "Empresa" completamente bloqueado

#### Resultado Fallido
❌ FAIL: Si tab es clickeable o no muestra candado → Revisar:
- `hasEnterpriseAccess()` retorna false correctamente
- Chip onClick handler previene evento
- CSS de opacity y cursor-not-allowed aplicado

---

### Escenario 2: Usuario con Plan BUSINESS

#### Precondiciones
- Usuario con suscripción activa a plan "Business"
- En Firestore: `users/{userId}/subscriptions/{id}` con `plan="business"` y `status="active"`

#### Pasos
1. **Registrarse/Iniciar sesión**
   - Email: `test-business@example.com`
   - Usar Stripe para suscribirse a plan Business
   - Esperar webhook de Stripe (actualiza Firestore)

2. **Ir a pestaña Perfil**
   - Click en "Perfil" (tab inferior)
   - Scroll hacia abajo
   - Ver tabs: "Perfil" (azul) y "Empresa" (gris)

3. **Verificar Tab Empresa Bloqueado**
   - Debe verse idéntico al Escenario 1
   - Bloqueo aplica para todos los planes except "enterprise"
   - Toast: "Acceso a Empresa solo con plan Enterprise"

#### Resultado Esperado
✅ PASS: Tab "Empresa" bloqueado (business NO tiene acceso)

#### Verificar Límites de Clips
- Crear clips y verificar límite de 15/mes
- Después de 15 clips, debe mostrar error: "Has alcanzado tu límite mensual"
- Verificar en `/lib/firebase/clip-limits.ts`

#### Resultado Fallido
❌ FAIL: Si tab es habilitado para Business → Revisar:
- `plans.ts`: `business: { canAccessEnterprise: false }`
- `getPlanType()` retorna "business" correctamente
- `canAccessEnterprise("business")` retorna false

---

### Escenario 3: Usuario con Plan ENTERPRISE ✨

#### Precondiciones
- Usuario con suscripción activa a plan "Enterprise"
- En Firestore: `users/{userId}/subscriptions/{id}` con `plan="enterprise"` y `status="active"`
- Balance en Stripe positivo (suscripción pagada)

#### Pasos
1. **Registrarse/Iniciar sesión**
   - Email: `test-enterprise@example.com`
   - Usar Stripe para suscribirse a plan Enterprise
   - Esperar confirmación de pago

2. **Ir a pestaña Perfil**
   - Click en "Perfil"
   - Scroll abajo
   - Ver tabs: "Perfil" (azul activo) y "Empresa" (disponible)

3. **Verificar Tab Empresa HABILITADO**
   - **Visual:**
     - Chip "Empresa" color normal (gris cuando inactivo, azul cuando activo)
     - SIN ícono de candado
     - Opacidad normal (100%)
   - **Funcional:**
     - Click en "Empresa" SÍ cambia el panel
     - Panel muestra contenido de empresa
     - NO debe mostrar toast "Acceso restringido"

4. **Explorar Funciones Empresa**
   - Crear clips ilimitados (sin límite de 15/mes)
   - Acceder a estadísticas avanzadas
   - Cambiar entre tabs "Perfil" ↔ "Empresa" sin problemas

#### Resultado Esperado
✅ PASS: Tab "Empresa" totalmente funcional para Enterprise

#### Verificar Límites de Clips
- Crear 50+ clips y verificar que NO hay límite
- Sistema debe permitir "Infinity" clips/mes
- Verificar en `/lib/firebase/clip-limits.ts`

#### Resultado Fallido
❌ FAIL: Si tab sigue bloqueado para Enterprise → Revisar:
- `plans.ts`: `enterprise: { canAccessEnterprise: true }`
- `hasEnterpriseAccess()` retorna true con plan="enterprise"
- `subscription.status === "active"` en Firestore
- Firestore rules permiten lectura de `/users/{userId}/subscriptions`

---

### Escenario 4: Pérdida de Suscripción mientras está en Tab Empresa

#### Precondiciones
- Usuario en tab "Empresa" con plan activo
- Capacidad de simular cambio de suscripción (admin console o test)

#### Pasos
1. **Iniciar sesión con Enterprise**
   - Usuario con plan Enterprise activo
   - Estar en tab "Empresa" viendo contenido

2. **Simular expiración de suscripción**
   - Opción A: Esperar a que expire automáticamente (si está configurado)
   - Opción B: Usar Firestore console para cambiar:
     - `status`: "active" → "expired"
     - O eliminar documento de suscripción

3. **Observar cambios**
   - App debe detectar cambio en Firestore (listener activo)
   - Panel debe resetear automáticamente a "Perfil" en 1-2 segundos
   - Toast debe aparecer: "Acceso a Empresa revocado - plan no válido"

#### Resultado Esperado
✅ PASS: Panel resetea automáticamente + toast notificación

#### Implementación (backend/admin)
```javascript
// Firestore Console o script
const userRef = db.collection('users').doc('{userId}');
const subsRef = userRef.collection('subscriptions').doc('{subscriptionId}');

// Cambiar a expirado
await subsRef.update({ status: 'expired' });
// O eliminar
await subsRef.delete();
```

#### Resultado Fallido
❌ FAIL: Si usuario permanece en tab Empresa → Revisar:
- useEffect dependencies include `subscription` y `panel`
- `hasEnterpriseAccess()` retorna false después del cambio
- Listener de Firestore está activo: `subscribeToUserSubscription()`

---

### Escenario 5: Cambio de Plan (Business → Enterprise)

#### Precondiciones
- Usuario con Business plan activo
- Crear nuevo plan Enterprise en Stripe

#### Pasos
1. **Iniciar con Business**
   - Usuario logged in con plan Business
   - Tab "Empresa" bloqueado (como Escenario 2)

2. **Upgrade a Enterprise**
   - Click en "Mejorar Plan" o similar
   - Seleccionar Enterprise en modal de precios
   - Completar pago en Stripe

3. **Esperar webhook**
   - Stripe envía evento de suscripción a backend
   - Backend actualiza Firestore: `plan: "business" → "enterprise"`
   - App listener detecta cambio (1-2 segundos)

4. **Verificar Acceso**
   - Tab "Empresa" debe volverse habilitada
   - Color cambia de gris a normal
   - Candado desaparece
   - Puede acceder sin restricción

#### Resultado Esperado
✅ PASS: Acceso a Empresa habilitado después de upgrade

#### Verificar Estado
- Revisar Firestore Console: `users/{userId}/subscriptions`
- Debe tener: `plan: "enterprise"`, `status: "active"`

#### Resultado Fallido
❌ FAIL: Si sigue bloqueado → Revisar:
- Webhook de Stripe actualiza Firestore
- `subscribeToUserSubscription()` listener se dispara
- Plan type se actualiza correctamente

---

## 🐛 Debugging

### Habilitar Logs en Consola

Editar `screens.tsx` y agregar logs:

```typescript
useEffect(() => {
  console.log("[Profile] subscription:", subscription);
  console.log("[Profile] hasEnterpriseAccess:", hasEnterpriseAccess(subscription));
}, [subscription]);

// En renderizado
{hasEnterpriseAccess(subscription) ? (
  <Chip ... >
    Empresa (✅ HABILITADA)
  </Chip>
) : (
  <Chip ... >
    Empresa (🔒 BLOQUEADA)
  </Chip>
)}
```

### Ver Logs en Dispositivo

```bash
# Terminal
adb logcat | grep -i "Profile\|hasEnterprise\|Empresa"

# O en Android Studio: Logcat panel
# Filter: "Profile" or "hasEnterprise"
```

### Verificar Firestore

1. Abrir Firebase Console
2. Ir a Firestore Database
3. Navegar a: `users` → `{userId}` → `subscriptions`
4. Ver documento y verificar:
   - `plan`: "enterprise" (o "business", "free")
   - `status`: "active" (o "past_due", "expired")
   - `currentPeriodEnd`: fecha futura

---

## ✅ Checklist de Testing

### Antes de Release
- [ ] Escenario 1 (Free): Tab "Empresa" bloqueado y gris
- [ ] Escenario 2 (Business): Tab "Empresa" bloqueado (mismo que Free)
- [ ] Escenario 3 (Enterprise): Tab "Empresa" habilitado y funcional
- [ ] Escenario 4: Reseteo automático cuando pierde acceso
- [ ] Escenario 5: Upgrade de plan funciona correctamente
- [ ] Clips Limits: Verificar límite de 2/15/ilimitado por plan
- [ ] Toast messages: Aparecen en momentos correctos
- [ ] No errores en consola Android
- [ ] Firestore rules permiten acceso (revisar rules)
- [ ] APK se ejecuta sin crashes

### Performance
- [ ] App no lag cuando cambia de panel
- [ ] Listener de Firestore no crea memory leaks
- [ ] Toast desaparece después de 3-5 segundos
- [ ] Compilación móvil < 10s (HMR)

### Compatibilidad
- [ ] Funciona en Android 9+
- [ ] Funciona en dispositivos físicos
- [ ] Funciona en emulador
- [ ] Responsive en pantallas 390px+ de ancho

---

## 📞 Support

### Si algo no funciona

1. **Verificar Firestore:**
   ```
   users/{userId}/subscriptions/{id}
   - plan: "enterprise"
   - status: "active"
   - currentPeriodEnd: fecha válida
   ```

2. **Verificar Logs:**
   ```bash
   adb logcat | grep -E "Profile|hasEnterprise|firestore"
   ```

3. **Resetear App:**
   ```bash
   adb uninstall com.example.clipsapp
   adb install ClipsApp-debug-enterprise-locked.apk
   ```

4. **Limpiar Caché:**
   - Configuración > Apps > ClipsApp > Almacenamiento > Borrar Cache

---

**Documento versión:** 1.0
**Última actualización:** 21/11/2026
**APK testeada:** ClipsApp-debug-enterprise-locked.apk (6.08 MB)
