import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { getFirebaseAdmin } from "@/lib/admin/firebase.server";
import { CheckoutRequestError, StripeSetupError } from "@/lib/stripe/server";

type CheckoutSelection = {
  uid: string;
  email: string | null;
  role: "business" | "enterprise";
  plan: "monthly" | "annual";
  origin: string;
};

type CheckoutAttempt = CheckoutSelection & {
  id: string;
  startedAt: number;
  sessionId?: string;
};

const TERMINAL_STATUSES = new Set(["canceled", "incomplete_expired"]);

async function findExistingSession(stripe: Stripe, selection: CheckoutSelection) {
  let open: Stripe.Checkout.Session | null = null;
  const endedAttempts = new Set<string>();
  for await (const session of stripe.checkout.sessions.list({ limit: 100 })) {
    if (session.mode !== "subscription" || session.metadata?.userId !== selection.uid) continue;
    if (session.status === "open") {
      if (open || !session.metadata.attemptId || session.metadata.role !== selection.role || session.metadata.plan !== selection.plan || !session.url) {
        throw new CheckoutRequestError("Ya tienes un pago pendiente. Complétalo o espera a que caduque antes de elegir otro plan.");
      }
      open = session;
    }
    if (session.status === "complete") {
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (!subscriptionId) {
        throw new CheckoutRequestError("Hay un pago pendiente de confirmación. Inténtalo más tarde.");
      }
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!TERMINAL_STATUSES.has(subscription.status)) {
        throw new CheckoutRequestError("Ya tienes una suscripción. No se creará otro cobro.");
      }
    }
    if ((session.status === "expired" || session.status === "complete") && session.metadata.attemptId) {
      endedAttempts.add(session.metadata.attemptId);
    }
  }
  return { open, endedAttempts };
}

export async function prepareSubscriptionCheckout(
  stripe: Stripe,
  selection: CheckoutSelection,
): Promise<{ session: Stripe.Checkout.Session | null; attempt: CheckoutAttempt | null }> {
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    throw new StripeSetupError("Stripe no está preparado para confirmar suscripciones.");
  }
  const { db } = getFirebaseAdmin();
  const ref = db.collection("users").doc(selection.uid).collection("checkout").doc("current");
  const existing = await findExistingSession(stripe, selection);
  if (existing.open) return { session: existing.open, attempt: null };

  const current = await ref.get();
  const previous = current.exists ? current.data() as CheckoutAttempt : null;
  let previousEnded = Boolean(previous && existing.endedAttempts.has(previous.id));
  if (previous?.sessionId) {
    const session = await stripe.checkout.sessions.retrieve(previous.sessionId);
    if (session.status === "open") {
      if (session.metadata?.role !== selection.role || session.metadata?.plan !== selection.plan || !session.url) {
        throw new CheckoutRequestError("Ya tienes un pago pendiente. Complétalo o espera a que caduque antes de elegir otro plan.");
      }
      return { session, attempt: null };
    }
    if (session.status === "complete") {
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (!subscriptionId || !TERMINAL_STATUSES.has((await stripe.subscriptions.retrieve(subscriptionId)).status)) {
        throw new CheckoutRequestError("Ya tienes un pago o una suscripción pendiente. No se creará otro cobro.");
      }
    }
    previousEnded = true;
  }

  const attempt = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const saved = snapshot.exists ? snapshot.data() as CheckoutAttempt : null;
    if (saved && !(previousEnded && saved.id === previous?.id)) {
      if (saved.role !== selection.role || saved.plan !== selection.plan) {
        throw new CheckoutRequestError("Ya tienes un pago pendiente para otro plan.");
      }
      if (!saved.sessionId && Date.now() - saved.startedAt >= 23 * 60 * 60 * 1000) {
        throw new StripeSetupError("No se pudo confirmar un intento de pago anterior. Contacta con soporte antes de intentarlo de nuevo.");
      }
      return saved;
    }
    const next: CheckoutAttempt = { ...selection, id: randomUUID(), startedAt: Date.now() };
    tx.set(ref, next);
    return next;
  });
  return { session: null, attempt };
}

export async function recordCheckoutSession(uid: string, attemptId: string, sessionId: string) {
  const { db } = getFirebaseAdmin();
  const ref = db.collection("users").doc(uid).collection("checkout").doc("current");
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists || snapshot.get("id") !== attemptId) {
      throw new Error("Checkout reservation changed unexpectedly.");
    }
    tx.update(ref, { sessionId });
  });
}
