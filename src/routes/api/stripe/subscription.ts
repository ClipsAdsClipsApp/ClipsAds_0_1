import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateFirebaseRequest,
  CheckoutRequestError,
  getStripeClient,
  StripeSetupError,
} from "@/lib/stripe/server";
import { saveStripeSubscriptionFromWebhook } from "@/lib/stripe/webhook";
import { prepareSubscriptionCheckout, recordCheckoutSession } from "@/lib/stripe/checkout.server";
import { SUBSCRIPTION_PRICES } from "@/lib/stripe/plans";
import { getFirebaseAdmin } from "@/lib/admin/firebase.server";

type SubscriptionPlan = "monthly" | "annual";
type UserRole = "business" | "enterprise";

interface SubscriptionConfig {
  priceId: string;
  amount: number;
  currency: string;
  interval: "month" | "year";
  intervalCount: number;
}

// Subscription plans configuration
const SUBSCRIPTION_PLANS: Record<UserRole, Record<SubscriptionPlan, SubscriptionConfig>> = {
  business: {
    monthly: {
      priceId: "price_business_monthly",
      amount: SUBSCRIPTION_PRICES.business.monthly,
      currency: "eur",
      interval: "month",
      intervalCount: 1,
    },
    annual: {
      priceId: "price_business_annual",
      amount: SUBSCRIPTION_PRICES.business.annual,
      currency: "eur",
      interval: "year",
      intervalCount: 1,
    },
  },
  enterprise: {
    monthly: {
      priceId: "price_enterprise_monthly",
      amount: SUBSCRIPTION_PRICES.enterprise.monthly,
      currency: "eur",
      interval: "month",
      intervalCount: 1,
    },
    annual: {
      priceId: "price_enterprise_annual",
      amount: SUBSCRIPTION_PRICES.enterprise.annual,
      currency: "eur",
      interval: "year",
      intervalCount: 1,
    },
  },
};

export const Route = createFileRoute("/api/stripe/subscription")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Check if this is a Stripe webhook (has stripe-signature header)
          const stripeSignature = request.headers.get("stripe-signature");
          if (stripeSignature) {
            // Webhook handler for subscription events
            const signature = stripeSignature;
            const stripe = getStripeClient();
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
            if (!webhookSecret) {
              throw new Error("Webhook secret not configured");
            }

            const body = await request.text();
            let event;
            try {
              event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
            } catch {
              return Response.json({ error: "Firma de webhook no válida." }, { status: 400 });
            }

            switch (event.type) {
              case "customer.subscription.created":
              case "customer.subscription.updated":
              case "customer.subscription.deleted": {
                await saveStripeSubscriptionFromWebhook(stripe, event.data.object, event.created);
                break;
              }
              case "invoice.payment_succeeded": {
                const invoice = event.data.object as any;
                console.log(`[stripe] Payment succeeded:`, invoice.id);
                // Handle successful payment
                break;
              }
              case "invoice.payment_failed": {
                const invoice = event.data.object as any;
                console.log(`[stripe] Payment failed:`, invoice.id);
                // Handle payment failure
                break;
              }
            }

            return Response.json({ received: true });
          }

          // Regular subscription checkout handler
          const identity = await authenticateFirebaseRequest(request);
          await getFirebaseAdmin().auth.verifyIdToken(identity.idToken, true);
          const body = (await request.json()) as {
            plan?: string;
            role?: string;
          };

          const plan = (body.plan?.trim() ?? "monthly") as SubscriptionPlan;
          const role = (body.role?.trim() ?? "business") as UserRole;

          // Validate plan and role
          if (!["monthly", "annual"].includes(plan)) {
            throw new CheckoutRequestError("El plan debe ser 'monthly' o 'annual'.");
          }
          if (!["business", "enterprise"].includes(role)) {
            throw new CheckoutRequestError("El rol debe ser 'business' o 'enterprise'.");
          }

          const config = SUBSCRIPTION_PLANS[role][plan];
          if (!config) {
            throw new CheckoutRequestError("El plan no está disponible para este rol.");
          }

          const stripe = getStripeClient();
          const origin = new URL(request.url).origin;
          const prepared = await prepareSubscriptionCheckout(stripe, {
            uid: identity.uid,
            email: identity.email,
            role,
            plan,
            origin,
          });
          if (prepared.session) {
            return Response.json({ url: prepared.session.url, sessionId: prepared.session.id, plan, role });
          }
          const attempt = prepared.attempt;
          if (!attempt) throw new Error("Missing checkout reservation");

          // Create checkout session for subscription
          const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: config.currency,
                  unit_amount: config.amount,
                  recurring: {
                    interval: config.interval,
                    interval_count: config.intervalCount,
                  },
                  product_data: {
                    name: `ClipsApp ${attempt.role === "enterprise" ? "Enterprise" : "Business"} Plan`,
                    description: `${attempt.role === "enterprise" ? "Enterprise" : "Business"} subscription - ${
                      attempt.plan === "annual" ? "Annual" : "Monthly"
                    } billing`,
                    metadata: {
                      role: attempt.role,
                      plan: attempt.plan,
                    },
                  },
                },
              },
            ],
            customer_email: attempt.email || undefined,
            metadata: {
              userId: identity.uid,
              role: attempt.role,
              plan: attempt.plan,
              firebaseUid: identity.uid,
              attemptId: attempt.id,
            },
            subscription_data: {
              metadata: { userId: identity.uid, role: attempt.role },
            },
            success_url: `${attempt.origin}/?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${attempt.origin}/pricing?subscription=cancelled`,
          }, { idempotencyKey: `clipsapp-subscription-${attempt.id}` });

          if (!session.url) {
            throw new CheckoutRequestError("Stripe no devolvió el enlace de pago.");
          }
          await recordCheckoutSession(identity.uid, attempt.id, session.id);

          return Response.json({
            url: session.url,
            sessionId: session.id,
            plan,
            role,
            amount: config.amount / 100, // Return in dollars
            currency: config.currency,
            interval: `${config.interval}${config.intervalCount > 1 ? config.intervalCount : ""}`,
          });
        } catch (error) {
          if (error instanceof StripeSetupError) {
            return Response.json(
              { error: error.message, code: "stripe_not_configured" },
              { status: 503 }
            );
          }
          if (error instanceof CheckoutRequestError) {
            return Response.json({ error: error.message }, { status: 400 });
          }
          console.error("[stripe] Subscription creation failed.", error);
          return Response.json(
            { error: "No se pudo iniciar el pago de suscripción." },
            { status: 500 }
          );
        }
      },
    },
  },
});
