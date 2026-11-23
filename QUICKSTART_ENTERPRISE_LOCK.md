# 🚀 QUICK START - Bloqueo de Opción "Empresa"

## En 30 Segundos

La opción **"Empresa"** en el perfil está ahora **bloqueada 🔒** hasta que el usuario pague una suscripción.

---

## ¿Qué Cambió?

### ANTES
```
Perfil          Empresa
└─ Siempre accesible
```

### AHORA
```
Perfil          🔒 Empresa (bloqueado sin pago)
                ✅ Empresa (desbloqueado con pago)
```

---

## 🎯 Funcionalidad

| Situación | Comportamiento |
|-----------|---|
| **Sin pago** | Tab tiene 🔒 icono, no es clickeable, muestra toast |
| **Después de pagar** | Tab se desbloquea automáticamente en tiempo real |
| **Cambio de plan** | Se actualiza automáticamente en Firestore |

---

## 📝 Cambios de Código

### 3 archivos nuevos:
- `src/lib/stripe/subscriptions.ts` - REST API para suscripciones
- `src/lib/firebase/subscriptions.ts` - Firestore real-time
- `src/lib/stripe/webhook.ts` - Procesa webhooks

### 3 archivos modificados:
- `src/components/screens.tsx` - Bloquea tab "Empresa"
- `src/routes/api/stripe/subscription.ts` - Webhook integrado
- `firestore.rules` - Nueva colección de suscripciones

---

## ✅ Estado

```
✅ Implementación completa
✅ Listo para producción
✅ Documentación incluida
✅ Seguridad validada
```

---

## 📚 Documentación

Lee estos archivos para entender más:

1. **ENTERPRISE_LOCK_SUMMARY.md** ← Comienza aquí (5 min)
2. **ENTERPRISE_LOCK_IMPLEMENTATION.md** - Detalles técnicos (10 min)
3. **ENTERPRISE_LOCK_VISUAL_GUIDE.md** - Diagramas visuales (8 min)
4. **ENTERPRISE_LOCK_VERIFICATION.md** - Checklist (10 min)

---

## 🔧 Para Poner en Producción

1. Configura en Vercel:
   - `FIREBASE_ADMIN_KEY` (service account)
   - `STRIPE_WEBHOOK_SECRET` (webhook)
   - `STRIPE_SECRET_KEY` (API key)

2. Webhook en Stripe Dashboard:
   - URL: `https://tudominio.com/api/stripe/subscription`
   - Eventos: subscription.created, subscription.updated, subscription.deleted

3. Deploy a Vercel (auto)

---

## 🧪 Prueba Local

```bash
# Usuario sin pago:
1. Crear cuenta
2. Ir a /profile
3. Ver 🔒 en "Empresa"
4. Intentar click → Toast "Necesitas plan activo"

# Usuario con pago (test):
1. Ir a /pricing
2. Seleccionar plan
3. Pagar con: 4242 4242 4242 4242
4. Webhook procesa
5. Tab "Empresa" se desbloquea ✅
```

---

## 📞 Soporte Técnico

| Pregunta | Respuesta |
|----------|-----------|
| ¿Dónde se bloquea? | En `src/components/screens.tsx` línea ~960 |
| ¿Dónde se guarda? | `users/{userId}/subscriptions/{subId}` en Firestore |
| ¿Cuándo se desbloquea? | Cuando webhook procesa el pago |
| ¿Es seguro? | Sí, validado en Firestore Rules y servidor |
| ¿Se actualiza en tiempo real? | Sí, con listeners de Firestore |

---

**Estado:** ✅ COMPLETADO Y LISTO  
**Implementado:** 21 Nov 2026  
**Versión:** 1.0 Final
