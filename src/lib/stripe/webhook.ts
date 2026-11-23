import type Stripe from "stripe";
import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/admin/firebase.server";

type Plan = "business" | "enterprise";
const MAX_FIRESTORE_MILLIS = 253402300799999;

function subscriptionOwner(subscription: Stripe.Subscription): { userId: string; plan: Plan } | null {
  const { userId, role } = subscription.metadata;
  if (!userId && !role) return null;
  if (
    !userId ||
    userId !== userId.trim() ||
    userId.includes("/") ||
    userId === "." ||
    userId === ".." ||
    userId.length > 128 ||
    (role !== "business" && role !== "enterprise")
  ) {
    throw new Error("Invalid subscription metadata");
  }
  return { userId, plan: role };
}

function objectId(value: string | { id: string } | null): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

function isoDate(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error("Invalid Stripe date");
  return new Date(seconds * 1000).toISOString();
}

function paidUntil(subscription: Record<string, unknown>, now: number): number {
  const start = typeof subscription.startedAt === "string"
    ? Date.parse(subscription.startedAt)
    : NaN;
  if (!Number.isFinite(start) || start > now) return 0;

  if (subscription.status === "active" || subscription.status === "trialing") {
    const end = typeof subscription.currentPeriodEnd === "string"
      ? Date.parse(subscription.currentPeriodEnd)
      : NaN;
    return Number.isFinite(end) && end > 0 && end <= MAX_FIRESTORE_MILLIS ? end : 0;
  }
  if ((subscription.status === "past_due" || subscription.status === "unpaid"
    || (subscription.status === "canceled" && subscription.cancellationReason === "payment_failed"))
    && typeof subscription.pastDueSince === "string") {
    const since = Date.parse(subscription.pastDueSince);
    const end = since + 7 * 24 * 60 * 60 * 1000;
    if (Number.isFinite(since) && since <= now && end <= MAX_FIRESTORE_MILLIS) {
      return Math.max(0, end);
    }
  }
  return 0;
}

export async function saveStripeSubscriptionFromWebhook(
  stripe: Stripe,
  eventSubscription: Stripe.Subscription,
  eventCreated: number,
): Promise<void> {
  const initial = await stripe.subscriptions.retrieve(eventSubscription.id);
  const owner = subscriptionOwner(initial);
  if (!owner) {
    if (subscriptionOwner(eventSubscription)) {
      throw new Error("Managed subscription metadata is missing in Stripe");
    }
    console.warn("[stripe] Ignoring subscription without application metadata:", initial.id);
    return;
  }

  const { db } = getFirebaseAdmin();
  const userRef = db.collection("users").doc(owner.userId);
  const subscriptionsRef = userRef.collection("verifiedSubscriptions");
  const ref = subscriptionsRef.doc(initial.id);

  await db.runTransaction(async (transaction) => {
    const businessAccessRef = userRef.collection("access").doc("business");
    const enterpriseAccessRef = userRef.collection("access").doc("enterprise");
    await transaction.getAll(businessAccessRef, enterpriseAccessRef);
    const snapshots = await transaction.get(subscriptionsRef);
    // Fetch after the read: a transaction retry must also refresh Stripe state.
    const subscription = await stripe.subscriptions.retrieve(initial.id);
    const currentOwner = subscriptionOwner(subscription);
    if (!currentOwner || currentOwner.userId !== owner.userId) {
      throw new Error("Subscription owner changed during synchronization");
    }

    const customerId = objectId(subscription.customer);
    const periodEnd = subscription.items.data[0]?.current_period_end;
    if (!customerId || periodEnd == null) throw new Error("Incomplete Stripe subscription");

    const now = new Date().toISOString();
    const data: {
      plan: Plan;
      status: Stripe.Subscription.Status;
      startedAt: string;
      currentPeriodEnd: string;
      pastDueSince?: string;
      cancellationReason?: string;
      stripeSubscriptionId: string;
      stripeCustomerId: string;
      updatedAt: string;
    } = {
      plan: currentOwner.plan,
      status: subscription.status,
      startedAt: isoDate(subscription.start_date),
      currentPeriodEnd: isoDate(periodEnd),
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      updatedAt: now,
    };

    if (subscription.cancellation_details?.reason) {
      data.cancellationReason = subscription.cancellation_details.reason;
    }

    if (subscription.status === "past_due" || subscription.status === "unpaid"
      || (subscription.status === "canceled" && subscription.cancellation_details?.reason === "payment_failed")) {
      const previous = snapshots.docs.find((doc) => doc.id === initial.id)?.data();
      const saved = typeof previous?.pastDueSince === "string"
        && Number.isFinite(Date.parse(previous.pastDueSince))
        ? previous.pastDueSince
        : now;
      const currentInvoice = objectId(subscription.latest_invoice);
      const eventInvoice = objectId(eventSubscription.latest_invoice);
      const eventDate = Number.isFinite(eventCreated) && eventCreated >= 0
        ? isoDate(eventCreated)
        : now;
      data.pastDueSince = (eventSubscription.status === "past_due" || eventSubscription.status === "unpaid"
        || (eventSubscription.status === "canceled" && eventSubscription.cancellation_details?.reason === "payment_failed")) &&
        currentInvoice !== null && eventInvoice === currentInvoice && eventDate < saved
        ? eventDate
        : saved;
    }

    const expirations: Record<Plan, number> = { business: 0, enterprise: 0 };
    const nowMs = Date.parse(now);
    const subscriptions = snapshots.docs
      .filter((doc) => doc.id !== initial.id)
      .map((doc) => doc.data());
    subscriptions.push(data);
    for (const candidate of subscriptions) {
      const plan: unknown = candidate.plan;
      if (plan === "business" || plan === "enterprise") {
        expirations[plan] = Math.max(
          expirations[plan],
          paidUntil(candidate, nowMs),
        );
      }
    }

    transaction.set(ref, data);
    transaction.set(businessAccessRef, { paidUntil: Timestamp.fromMillis(expirations.business) });
    transaction.set(enterpriseAccessRef, { paidUntil: Timestamp.fromMillis(expirations.enterprise) });
  });
}
