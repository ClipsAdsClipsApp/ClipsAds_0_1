import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentReference,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import type { UserSubscription } from "@/lib/stripe/subscriptions";
import { canAccessEnterprise, getPlanType } from "@/lib/stripe/plans";

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const db = getFirebaseFirestore();
  if (!db) return null;

  try {
    const subsRef = collection(db, "users", userId, "subscriptions");
    const q = query(
      subsRef,
      where("status", "in", ["active", "past_due"]),
      orderBy("currentPeriodEnd", "desc"),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return doc.data() as UserSubscription;
  } catch (error) {
    console.error("[firestore] Error fetching user subscription:", error);
    return null;
  }
}

export function subscribeToUserSubscription(
  userId: string,
  onSubscription: (subscription: UserSubscription | null) => void,
  onError: (error: Error) => void,
): () => void {
  const db = getFirebaseFirestore();
  if (!db) {
    onError(new Error("Firestore not configured"));
    return () => {};
  }

  try {
    const subsRef = collection(db, "users", userId, "subscriptions");
    const q = query(
      subsRef,
      where("status", "in", ["active", "past_due"]),
      orderBy("currentPeriodEnd", "desc"),
      limit(1)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          onSubscription(null);
        } else {
          const doc = snapshot.docs[0];
          onSubscription(doc.data() as UserSubscription);
        }
      },
      onError
    );
  } catch (error) {
    onError(error instanceof Error ? error : new Error("Unknown error"));
    return () => {};
  }
}

export function hasActiveSubscription(subscription: UserSubscription | null): boolean {
  if (!subscription) return false;
  return subscription.status === "active" || subscription.status === "past_due";
}

/**
 * Check if user has valid Enterprise plan access
 */
export function hasEnterpriseAccess(subscription: UserSubscription | null): boolean {
  if (!hasActiveSubscription(subscription)) return false;
  if (!subscription) return false;
  
  const planType = getPlanType(subscription.plan);
  return canAccessEnterprise(planType);
}

/**
 * Get the plan type from subscription (defaults to 'free' if no active subscription)
 */
export function getUserPlanType(subscription: UserSubscription | null) {
  if (!hasActiveSubscription(subscription)) return "free";
  if (!subscription) return "free";
  return getPlanType(subscription.plan);
}
