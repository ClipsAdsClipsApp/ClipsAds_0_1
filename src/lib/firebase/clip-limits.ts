/**
 * Clip limits and usage tracking for subscription plans
 */

import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import type { UserSubscription } from "@/lib/stripe/subscriptions";
import { getMonthlyClipLimit } from "@/lib/stripe/plans";
import { getUserPlanType } from "@/lib/firebase/subscriptions";

export interface ClipUsage {
  clipsThisMonth: number;
  monthlyLimit: number;
  canCreateMoreClips: boolean;
  clipsRemaining: number;
}

/**
 * Get the current month's start and end dates
 */
function getCurrentMonthDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

/**
 * Count clips created by user in current month
 */
export async function getClipsThisMonth(userId: string): Promise<number> {
  const db = getFirebaseFirestore();
  if (!db) return 0;

  try {
    const { start, end } = getCurrentMonthDateRange();
    const clipsRef = collection(db, "clips");
    const q = query(
      clipsRef,
      where("authorId", "==", userId),
      where("createdAt", ">=", Timestamp.fromDate(start)),
      where("createdAt", "<", Timestamp.fromDate(end))
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("[firestore] Error counting clips this month:", error);
    return 0;
  }
}

/**
 * Get clip usage information for a user based on their subscription
 */
export async function getUserClipUsage(
  userId: string,
  subscription: UserSubscription | null
): Promise<ClipUsage> {
  const planType = getUserPlanType(subscription);
  const monthlyLimit = getMonthlyClipLimit(planType);
  const clipsThisMonth = await getClipsThisMonth(userId);

  return {
    clipsThisMonth,
    monthlyLimit,
    canCreateMoreClips: clipsThisMonth < monthlyLimit,
    clipsRemaining: Math.max(0, monthlyLimit - clipsThisMonth),
  };
}

/**
 * Check if user can create more clips based on their plan
 */
export async function canCreateClip(
  userId: string,
  subscription: UserSubscription | null
): Promise<boolean> {
  const usage = await getUserClipUsage(userId, subscription);
  return usage.canCreateMoreClips;
}

/**
 * Get a user-friendly message about clip limits
 */
export function getClipLimitMessage(usage: ClipUsage): string {
  if (usage.monthlyLimit === Infinity) {
    return "Clips ilimitados";
  }

  if (usage.clipsRemaining === 0) {
    return `Límite alcanzado (${usage.clipsThisMonth}/${usage.monthlyLimit})`;
  }

  return `${usage.clipsRemaining} clips restantes este mes (${usage.clipsThisMonth}/${usage.monthlyLimit})`;
}
