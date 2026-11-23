import { getMonthlyClipLimit, type PlanType } from "./plans.ts";

export type VerifiedSubscription = {
  plan: "business" | "enterprise";
  status: string;
  startedAt: string;
  currentPeriodEnd: string;
  pastDueSince?: string;
  cancellationReason?: string;
};

const GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export function effectivePlan(
  subscriptions: VerifiedSubscription[],
  now: number,
): { plan: PlanType; anchor?: number } {
  const eligible = subscriptions.filter((subscription) => {
    const start = Date.parse(subscription.startedAt);
    if (!Number.isFinite(start) || start > now) return false;
    if (subscription.status === "active" || subscription.status === "trialing") {
      const end = Date.parse(subscription.currentPeriodEnd);
      return Number.isFinite(end) && now < end;
    }
    if (subscription.status !== "past_due" && subscription.status !== "unpaid"
      && !(subscription.status === "canceled" && subscription.cancellationReason === "payment_failed")) return false;
    if (!subscription.pastDueSince) return false;
    const since = Date.parse(subscription.pastDueSince);
    return Number.isFinite(since) && since <= now && now < since + GRACE_MS;
  });
  const selected = eligible.find((s) => s.plan === "enterprise")
    ?? eligible.find((s) => s.plan === "business");
  return selected
    ? { plan: selected.plan, anchor: Date.parse(selected.startedAt) }
    : { plan: "free" };
}

function anniversary(anchor: Date, monthOffset: number): number {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + monthOffset;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(
    year, month, Math.min(anchor.getUTCDate(), lastDay),
    anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds(), anchor.getUTCMilliseconds(),
  );
}

export function monthlyPeriod(anchorMs: number, now: number): { start: number; end: number } {
  if (!Number.isFinite(anchorMs) || anchorMs > now) throw new Error("Fecha de inicio inválida");
  const anchor = new Date(anchorMs);
  const current = new Date(now);
  let offset = (current.getUTCFullYear() - anchor.getUTCFullYear()) * 12
    + current.getUTCMonth() - anchor.getUTCMonth();
  if (anniversary(anchor, offset) > now) offset--;
  return { start: anniversary(anchor, offset), end: anniversary(anchor, offset + 1) };
}

export function clipLimit(plan: PlanType): number | null {
  const limit = getMonthlyClipLimit(plan);
  return Number.isFinite(limit) ? limit : null;
}

export function canPublishAnotherClip(plan: PlanType, count: number): boolean {
  const limit = clipLimit(plan);
  return limit === null || count < limit;
}

export function canUsePublishingOptions(plan: PlanType, ages: readonly string[], action: string): boolean {
  return plan !== "free" || (ages.length === 0 && !["buy", "contact", "offer"].includes(action));
}

export function countPublications(
  entries: readonly { id: string; publishedAt: unknown }[],
  period: { start: number; end: number },
): number {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (typeof entry.publishedAt === "number"
      && entry.publishedAt >= period.start && entry.publishedAt < period.end) {
      ids.add(entry.id);
    }
  }
  return ids.size;
}
