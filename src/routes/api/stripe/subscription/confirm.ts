import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getFirebaseAdmin } from "@/lib/admin/firebase.server";
import {
  authenticateFirebaseRequest,
  CheckoutRequestError,
  getStripeClient,
  StripeSetupError,
} from "@/lib/stripe/server";
import { saveStripeSubscriptionFromWebhook } from "@/lib/stripe/webhook";

const confirmationSchema = z.object({
  sessionId: z.string().regex(/^cs_[a-zA-Z0-9_]+$/),
});

export const Route = createFileRoute("/api/stripe/subscription/confirm")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const identity = await authenticateFirebaseRequest(request);
          await getFirebaseAdmin().auth.verifyIdToken(identity.idToken, true);
          const input = confirmationSchema.safeParse(await request.json());
          if (!input.success) {
            throw new CheckoutRequestError("La sesión de pago no es válida.");
          }

          const stripe = getStripeClient();
          const session = await stripe.checkout.sessions.retrieve(input.data.sessionId, {
            expand: ["subscription"],
          });
          if (
            session.mode !== "subscription" ||
            session.status !== "complete" ||
            session.metadata?.userId !== identity.uid ||
            (session.payment_status !== "paid" && session.payment_status !== "no_payment_required")
          ) {
            throw new CheckoutRequestError("Stripe todavía no confirma esta suscripción.");
          }

          const subscription = typeof session.subscription === "string"
            ? await stripe.subscriptions.retrieve(session.subscription)
            : session.subscription;
          if (!subscription || (subscription.status !== "active" && subscription.status !== "trialing")) {
            throw new CheckoutRequestError("Stripe todavía no confirma esta suscripción.");
          }

          await saveStripeSubscriptionFromWebhook(stripe, subscription, Math.floor(Date.now() / 1000));
          return Response.json({ active: true });
        } catch (error) {
          if (error instanceof StripeSetupError) {
            return Response.json({ error: error.message }, { status: 503 });
          }
          if (error instanceof CheckoutRequestError) {
            return Response.json({ error: error.message }, { status: 400 });
          }
          console.error("[stripe] Subscription confirmation failed.", error);
          return Response.json({ error: "No se pudo confirmar la suscripción." }, { status: 500 });
        }
      },
    },
  },
});
