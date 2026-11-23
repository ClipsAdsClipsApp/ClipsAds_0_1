import { getFirebaseFirestore } from "@/lib/firebase/client";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import type { UserSubscription } from "@/lib/stripe/subscriptions";

const json = Response.json;

/**
 * API para asignar suscripciones de testing
 * SOLO para desarrollo/testing - remover en producción
 * 
 * Uso: POST /api/test-subscription
 * Body: { plan: "enterprise" | "business" }
 */
export async function POST({ request }: { request: Request }) {
  try {
    // ⚠️ SECURITY: En producción, remover esta ruta completa
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV === "production") {
      return json({ error: "Not available in production" }, { status: 403 });
    }

    const body = await request.json();
    const { plan } = body as { plan: string };

    // Validar plan
    if (!["business", "enterprise"].includes(plan)) {
      return json({ error: "Invalid plan. Use 'business' or 'enterprise'" }, { status: 400 });
    }

    // Obtener usuario actual desde Auth
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return json({ error: "User not authenticated" }, { status: 401 });
    }

    // Obtener Firestore
    const db = getFirebaseFirestore();
    if (!db) {
      return json({ error: "Firestore not configured" }, { status: 500 });
    }

    // Crear suscripción de testing
    const now = new Date();
    const subscriptionData: UserSubscription = {
      stripeCustomerId: `test_${user.uid}`,
      stripeSubscriptionId: `test_sub_${Date.now()}`,
      status: "active",
      plan: plan as "business" | "enterprise",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Guardar en Firestore
    const subscriptionRef = collection(db, "users", user.uid, "subscriptions");
    await setDoc(
      doc(subscriptionRef),
      subscriptionData
    );

    return json({
      success: true,
      message: `Test subscription created: ${plan}`,
      subscription: subscriptionData,
    });
  } catch (error) {
    console.error("Test subscription error:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET para ver suscripción actual
 */
export async function GET() {
  try {
    if (process.env.NODE_ENV === "production") {
      return json({ error: "Not available in production" }, { status: 403 });
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      return json({ error: "User not authenticated" }, { status: 401 });
    }

    const db = getFirebaseFirestore();
    if (!db) {
      return json({ error: "Firestore not configured" }, { status: 500 });
    }

    // Obtener primera suscripción activa
    const subscriptionRef = collection(db, "users", user.uid, "subscriptions");
    const firstSubDoc = await getDoc(doc(subscriptionRef));

    if (!firstSubDoc.exists()) {
      return json({ subscription: null });
    }

    return json({ subscription: firstSubDoc.data() });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
