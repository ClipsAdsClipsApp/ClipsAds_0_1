import assert from "node:assert/strict";
import test from "node:test";
import { canPublishAnotherClip, canUsePublishingOptions, clipLimit, countPublications, effectivePlan, monthlyPeriod } from "./entitlements.ts";
import { SUBSCRIPTION_PRICES } from "./plans.ts";

test("planes y prioridad de suscripción", () => {
  const now = Date.parse("2026-03-15T00:00:00Z");
  /** @type {import("./entitlements.ts").VerifiedSubscription} */
  const business = { plan: "business", status: "active", startedAt: "2026-01-31T12:00:00Z", currentPeriodEnd: "2027-01-31T12:00:00Z" };
  /** @type {import("./entitlements.ts").VerifiedSubscription} */
  const enterprise = { ...business, plan: "enterprise" };
  assert.equal(clipLimit("free"), 2);
  assert.equal(clipLimit("business"), 10);
  assert.equal(clipLimit("enterprise"), null);
  assert.equal(effectivePlan([business, enterprise], now).plan, "enterprise");
  assert.equal(effectivePlan([{ ...business, status: "incomplete" }], now).plan, "free");
  assert.equal(effectivePlan([{ ...business, currentPeriodEnd: new Date(now).toISOString() }], now).plan, "free");
});

test("los importes de los planes son los acordados en céntimos de euro", () => {
  assert.deepEqual(SUBSCRIPTION_PRICES, {
    business: { monthly: 999, annual: 9999 },
    enterprise: { monthly: 2999, annual: 29990 },
  });
});

test("impago tiene siete días de gracia exactos", () => {
  const since = Date.parse("2026-03-01T10:00:00Z");
  /** @type {import("./entitlements.ts").VerifiedSubscription} */
  const subscription = { plan: "business", status: "past_due", startedAt: "2026-01-01T00:00:00Z", currentPeriodEnd: "2026-03-01T00:00:00Z", pastDueSince: new Date(since).toISOString() };
  assert.equal(effectivePlan([subscription], since + 7 * 86400000 - 1).plan, "business");
  assert.equal(effectivePlan([subscription], since + 7 * 86400000).plan, "free");
  assert.equal(effectivePlan([{ ...subscription, pastDueSince: undefined }], since).plan, "free");
  assert.equal(effectivePlan([{ ...subscription, status: "unpaid" }], since + 86400000).plan, "business");
  assert.equal(effectivePlan([{ ...subscription, status: "canceled", cancellationReason: "payment_failed" }], since + 86400000).plan, "business");
  assert.equal(effectivePlan([{ ...subscription, status: "canceled", cancellationReason: "cancellation_requested" }], since + 86400000).plan, "free");
});

test("las opciones restringidas solo están disponibles en planes de pago", () => {
  for (const action of ["buy", "contact", "offer"]) {
    assert.equal(canUsePublishingOptions("free", [], action), false);
    assert.equal(canUsePublishingOptions("business", ["18-24"], action), true);
    assert.equal(canUsePublishingOptions("enterprise", ["18-24"], action), true);
  }
  assert.equal(canUsePublishingOptions("free", ["18-24"], "book"), false);
  assert.equal(canUsePublishingOptions("free", [], "book"), true);
  assert.equal(canUsePublishingOptions("free", [], "directions"), true);
});

test("se aplica el límite exacto al publicar", () => {
  assert.equal(canPublishAnotherClip("free", 1), true);
  assert.equal(canPublishAnotherClip("free", 2), false);
  assert.equal(canPublishAnotherClip("business", 9), true);
  assert.equal(canPublishAnotherClip("business", 10), false);
  assert.equal(canPublishAnotherClip("enterprise", 100000), true);
});

test("aniversario mensual conserva día y hora incluso al final del mes", () => {
  const anchor = Date.parse("2026-01-31T12:00:00Z");
  assert.deepEqual(monthlyPeriod(anchor, Date.parse("2026-02-28T11:59:59Z")), {
    start: anchor, end: Date.parse("2026-02-28T12:00:00Z"),
  });

  assert.deepEqual(monthlyPeriod(anchor, Date.parse("2026-03-01T00:00:00Z")), {
    start: Date.parse("2026-02-28T12:00:00Z"), end: Date.parse("2026-03-31T12:00:00Z"),
  });
});

test("conteo incluye eventos de clips borrados sin duplicar clips existentes", () => {
  const period = { start: 10, end: 20 };
  assert.equal(countPublications([
    { id: "deleted", publishedAt: 10 },
    { id: "existing", publishedAt: 15 },
    { id: "existing", publishedAt: 15 },
    { id: "previous", publishedAt: 9 },
    { id: "next", publishedAt: 20 },
  ], period), 2);
});
