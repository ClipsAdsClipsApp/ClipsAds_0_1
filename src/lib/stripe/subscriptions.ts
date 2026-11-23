import type { FirebaseRequestIdentity } from "./server";

const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "paused";

export interface UserSubscription {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  plan: "business" | "enterprise";
  currentPeriodStart: string; // ISO timestamp
  currentPeriodEnd: string; // ISO timestamp
  cancelledAt?: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

function encodeFirestoreString(value: string) {
  return { stringValue: value };
}

function encodeFirestoreTimestamp(value: string) {
  return { timestampValue: value };
}

export async function saveUserSubscription(
  uid: string,
  identity: FirebaseRequestIdentity,
  subscription: Omit<UserSubscription, "createdAt" | "updatedAt">,
): Promise<void> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error("Firebase project ID is not configured");
  }

  const now = new Date().toISOString();
  const path = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}/subscriptions/${encodeURIComponent(subscription.stripeSubscriptionId)}`;
  const url = `https://firestore.googleapis.com/v1/${path}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${identity.idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        stripeCustomerId: encodeFirestoreString(subscription.stripeCustomerId),
        stripeSubscriptionId: encodeFirestoreString(subscription.stripeSubscriptionId),
        status: encodeFirestoreString(subscription.status),
        plan: encodeFirestoreString(subscription.plan),
        currentPeriodStart: encodeFirestoreTimestamp(subscription.currentPeriodStart),
        currentPeriodEnd: encodeFirestoreTimestamp(subscription.currentPeriodEnd),
        ...(subscription.cancelledAt && {
          cancelledAt: encodeFirestoreTimestamp(subscription.cancelledAt),
        }),
        createdAt: encodeFirestoreTimestamp(now),
        updatedAt: encodeFirestoreTimestamp(now),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to save subscription: ${response.statusText} - ${error}`,
    );
  }
}

export async function getUserActiveSubscription(
  uid: string,
  idToken: string,
): Promise<UserSubscription | null> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error("Firebase project ID is not configured");
  }

  const path = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}/subscriptions`;
  const url = `https://firestore.googleapis.com/v1/${path}?pageSize=10`;

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch subscriptions: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    documents?: Array<{ fields?: Record<string, any> }>;
  };

  if (!data.documents || data.documents.length === 0) {
    return null;
  }

  // Find the first active subscription
  for (const doc of data.documents) {
    const fields = doc.fields || {};
    const status = fields.status?.stringValue;

    if (status === "active" || status === "past_due") {
      return {
        stripeCustomerId: fields.stripeCustomerId?.stringValue || "",
        stripeSubscriptionId: fields.stripeSubscriptionId?.stringValue || "",
        status: (status || "canceled") as SubscriptionStatus,
        plan: (fields.plan?.stringValue || "business") as "business" | "enterprise",
        currentPeriodStart: fields.currentPeriodStart?.timestampValue || "",
        currentPeriodEnd: fields.currentPeriodEnd?.timestampValue || "",
        createdAt: fields.createdAt?.timestampValue || "",
        updatedAt: fields.updatedAt?.timestampValue || "",
      };
    }
  }

  return null;
}

export async function cancelUserSubscription(
  uid: string,
  identity: FirebaseRequestIdentity,
  stripeSubscriptionId: string,
): Promise<void> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error("Firebase project ID is not configured");
  }

  const now = new Date().toISOString();
  const path = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`;
  const url = `https://firestore.googleapis.com/v1/${path}?updateMask.fieldPaths=status&updateMask.fieldPaths=cancelledAt&updateMask.fieldPaths=updatedAt`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${identity.idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        status: { stringValue: "canceled" },
        cancelledAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to cancel subscription: ${response.statusText} - ${error}`);
  }
}
