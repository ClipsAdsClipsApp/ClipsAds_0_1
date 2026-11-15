import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateFirebaseRequest,
  CheckoutRequestError,
  getStripeClient,
  readFirestoreDocument,
  StripeSetupError,
} from "@/lib/stripe/server";

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numericValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export const Route = createFileRoute("/api/stripe/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const identity = await authenticateFirebaseRequest(request);
          const body = (await request.json()) as {
            clipId?: string;
            quantity?: number;
            size?: string;
          };
          const clipId = body.clipId?.trim() ?? "";
          const quantity = Number(body.quantity);
          const size = body.size?.trim() ?? "";
          if (!/^[a-zA-Z0-9_-]{1,120}$/.test(clipId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
            throw new CheckoutRequestError("Revisa el producto y la cantidad seleccionada.");
          }

          const shared = await readFirestoreDocument(`clips/${clipId}`, identity.idToken);
          if (!shared) throw new CheckoutRequestError("Este clip ya no está disponible.");
          const product = shared.product as Record<string, unknown> | undefined;
          const author = shared.author as Record<string, unknown> | undefined;
          if (!product || product.cta !== "buy" || product.purchaseMode === "external") {
            throw new CheckoutRequestError("Este producto se compra en una tienda externa.");
          }

          const sellerAccountId = stringValue(author?.stripeAccountId ?? product.sellerStripeAccountId);
          if (!sellerAccountId.startsWith("acct_")) {
            throw new CheckoutRequestError("El vendedor todavía no ha conectado Stripe Connect.");
          }
          const price = numericValue(product.price);
          const currency = stringValue(product.currency).toLowerCase();
          const name = stringValue(product.name);
          if (!name || price <= 0 || !/^[a-z]{3}$/.test(currency)) {
            throw new CheckoutRequestError("El producto no tiene un precio válido.");
          }
          const options = Array.isArray(product.sizeOptions)
            ? product.sizeOptions.filter((option): option is string => typeof option === "string")
            : [];
          if (options.length > 0 && !options.includes(size)) {
            throw new CheckoutRequestError("Selecciona una talla u opción disponible.");
          }

          const stripe = getStripeClient();
          const seller = await stripe.accounts.retrieve(sellerAccountId);
          if (seller.metadata?.firebaseUid !== shared.authorId || !seller.charges_enabled || !seller.payouts_enabled) {
            throw new CheckoutRequestError("El vendedor aún no está habilitado para recibir pagos.");
          }

          const origin = new URL(request.url).origin;
          const session = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: [
              {
                quantity,
                price_data: {
                  currency,
                  unit_amount: Math.round(price * 100),
                  product_data: {
                    name,
                    description: [stringValue(product.brand), size && `Opción: ${size}`]
                      .filter(Boolean)
                      .join(" · ") || undefined,
                    images: /^https:\/\//.test(stringValue(product.imageUrl))
                      ? [stringValue(product.imageUrl)]
                      : undefined,
                  },
                },
              },
            ],
            payment_intent_data: { transfer_data: { destination: sellerAccountId } },
            metadata: {
              clipId,
              productId: stringValue(product.id),
              productName: name,
              buyerUid: identity.uid,
              sellerUid: stringValue(shared.authorId),
              size,
              quantity: String(quantity),
            },
            success_url: `${origin}/?checkout=success&clipId=${encodeURIComponent(clipId)}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?checkout=cancelled&clipId=${encodeURIComponent(clipId)}`,
          });
          if (!session.url) throw new CheckoutRequestError("Stripe no devolvió el enlace de pago.");
          return Response.json({ url: session.url });
        } catch (error) {
          if (error instanceof StripeSetupError) {
            return Response.json({ error: error.message, code: "stripe_not_configured" }, { status: 503 });
          }
          if (error instanceof CheckoutRequestError) {
            return Response.json({ error: error.message }, { status: 400 });
          }
          console.error("[stripe] Checkout creation failed.", error);
          return Response.json({ error: "No se pudo iniciar el pago seguro." }, { status: 500 });
        }
      },
    },
  },
});