import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateFirebaseRequest,
  CheckoutRequestError,
  getStripeClient,
  saveStripeAccountId,
  StripeSetupError,
} from "@/lib/stripe/server";

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
      amount: 2999, // $29.99/month in cents
      currency: "usd",
      interval: "month",
      intervalCount: 1,
    },
    annual: {
      priceId: "price_business_annual",
      amount: 29990, // $299.90/year (saves ~$60)
      currency: "usd",
      interval: "year",
      intervalCount: 1,
    },
  },
  enterprise: {
    monthly: {
      priceId: "price_enterprise_monthly",
      amount: 9999, // $99.99/month in cents
      currency: "usd",
      interval: "month",
      intervalCount: 1,
    },
    annual: {
      priceId: "price_enterprise_annual",
      amount: 99990, // $999.90/year (saves ~$200)
      currency: "usd",
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
          const identity = await authenticateFirebaseRequest(request);
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
                    name: `ClipsApp ${role === "enterprise" ? "Enterprise" : "Business"} Plan`,
                    description: `${role === "enterprise" ? "Enterprise" : "Business"} subscription - ${
                      plan === "annual" ? "Annual" : "Monthly"
                    } billing`,
                    metadata: {
                      role,
                      plan,
                    },
                  },
                },
              },
            ],
            customer_email: identity.email || undefined,
            metadata: {
              userId: identity.uid,
              role,
              plan,
              firebaseUid: identity.uid,
            },
            success_url: `${origin}/?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?subscription=cancelled`,
          });

          if (!session.url) {
            throw new CheckoutRequestError("Stripe no devolvió el enlace de pago.");
          }

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

      // Webhook handler for subscription events
      POST: async ({ request }) => {
        try {
          const signature = request.headers.get("stripe-signature");
          if (!signature) {
            throw new Error("No Stripe signature provided");
          }

          const stripe = getStripeClient();
          const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
          if (!webhookSecret) {
            throw new Error("Webhook secret not configured");
          }

          const body = await request.text();
          const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

          switch (event.type) {
            case "customer.subscription.created":
            case "customer.subscription.updated": {
              const subscription = event.data.object as any;
              console.log(`[stripe] Subscription ${event.type}:`, subscription.id);
              // Handle subscription update (save to Firestore, etc.)
              break;
            }
            case "customer.subscription.deleted": {
              const subscription = event.data.object as any;
              console.log(`[stripe] Subscription cancelled:`, subscription.id);
              // Handle subscription cancellation
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
        } catch (error) {
          console.error("[stripe] Webhook error:", error);
          return Response.json({ error: "Webhook processing failed" }, { status: 400 });
        }
      },
    },
  },
});
