import Stripe from "stripe";
import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateFirebaseRequest,
  getStripeClient,
  readFirestoreDocument,
  saveStripeAccountId,
  StripeSetupError,
} from "@/lib/stripe/server";

const COUNTRY_CODES = new Set(["ES", "MX", "AR", "CL", "CO", "PE", "US", "GB", "FR", "DE", "IT", "PT"]);

export const Route = createFileRoute("/api/stripe/connect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const identity = await authenticateFirebaseRequest(request);
          const profile = await readFirestoreDocument(`users/${identity.uid}`, identity.idToken);
          if (!profile) {
            return Response.json({ error: "Completa tu perfil antes de configurar cobros." }, { status: 409 });
          }
          const body = (await request.json().catch(() => ({}))) as { country?: string };
          const profileCountry = typeof profile.country === "string" ? profile.country : "ES";
          const requestedCountry = (body.country ?? profileCountry).toUpperCase();
          const country = COUNTRY_CODES.has(requestedCountry) ? requestedCountry : "ES";
          const stripe = getStripeClient();
          let account: Stripe.Account;

          if (typeof profile.stripeAccountId === "string" && profile.stripeAccountId.startsWith("acct_")) {
            account = await stripe.accounts.retrieve(profile.stripeAccountId);
            if (account.metadata?.firebaseUid !== identity.uid) {
              return Response.json({ error: "La cuenta Stripe no pertenece a este usuario." }, { status: 403 });
            }
          } else {
            account = await stripe.accounts.create({
              type: "express",
              country,
              email: identity.email ?? undefined,
              business_type: "individual",
              capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
              },
              metadata: { firebaseUid: identity.uid },
            });
            await saveStripeAccountId(identity.uid, identity.idToken, account.id);
          }

          if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
            return Response.json({ ready: true, stripeAccountId: account.id });
          }

          const appOrigin = new URL(request.url).origin;
          const accountLink = await stripe.accountLinks.create({
            account: account.id,
            type: "account_onboarding",
            return_url: `${appOrigin}/?stripe=return`,
            refresh_url: `${appOrigin}/?stripe=refresh`,
          });
          return Response.json({ ready: false, stripeAccountId: account.id, url: accountLink.url });
        } catch (error) {
          if (error instanceof StripeSetupError) {
            return Response.json({ error: error.message, code: "stripe_not_configured" }, { status: 503 });
          }
          if (error instanceof Stripe.errors.StripeError) {
            console.error("[stripe] Connect onboarding failed.", error.type);
            return Response.json({ error: "Stripe no pudo iniciar el alta del vendedor." }, { status: 502 });
          }
          console.error("[stripe] Connect API failed.", error);
          const message = error instanceof Error ? error.message : "No se pudo iniciar Stripe Connect.";
          const unauthorized = message.includes("Inicia sesión") || message.includes("Sesión no válida");
          return Response.json({ error: unauthorized ? message : "No se pudo iniciar Stripe Connect." }, { status: unauthorized ? 401 : 500 });
        }
      },
    },
  },
});