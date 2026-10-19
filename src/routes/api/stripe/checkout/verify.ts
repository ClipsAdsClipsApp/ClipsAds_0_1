import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateFirebaseRequest,
  CheckoutRequestError,
  getStripeClient,
  StripeSetupError,
} from "@/lib/stripe/server";

export const Route = createFileRoute("/api/stripe/checkout/verify")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const identity = await authenticateFirebaseRequest(request);
          const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
          if (!sessionId.startsWith("cs_")) {
            throw new CheckoutRequestError("La sesión de pago no es válida.");
          }
          const stripe = getStripeClient();
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (session.payment_status !== "paid" || session.metadata?.buyerUid !== identity.uid) {
            throw new CheckoutRequestError("El pago no aparece como completado.");
          }
          return Response.json({
            paid: true,
            clipId: session.metadata?.clipId ?? "",
            productId: session.metadata?.productId ?? "",
            productName: session.metadata?.productName ?? "tu compra",
          });
        } catch (error) {
          if (error instanceof StripeSetupError) {
            return Response.json({ error: error.message }, { status: 503 });
          }
          if (error instanceof CheckoutRequestError) {
            return Response.json({ error: error.message }, { status: 400 });
          }
          console.error("[stripe] Checkout verification failed.", error);
          return Response.json({ error: "No se pudo verificar el pago." }, { status: 500 });
        }
      },
    },
  },
});