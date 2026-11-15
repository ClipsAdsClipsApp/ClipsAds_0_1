import { createRemoteJWKSet, jwtVerify } from "jose";
import Stripe from "stripe";

const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export class StripeSetupError extends Error {}
export class CheckoutRequestError extends Error {}

export type FirebaseRequestIdentity = {
  uid: string;
  email: string | null;
  idToken: string;
};

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  mapValue?: { fields?: Record<string, FirestoreValue> };
  arrayValue?: { values?: FirestoreValue[] };
  nullValue?: null;
};

function decodeFirestoreValue(value: FirestoreValue): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if (value.mapValue) return decodeFirestoreFields(value.mapValue.fields ?? {});
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decodeFirestoreValue);
  return undefined;
}

export function decodeFirestoreFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
}

export async function authenticateFirebaseRequest(request: Request): Promise<FirebaseRequestIdentity> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match || !FIREBASE_PROJECT_ID) throw new CheckoutRequestError("Inicia sesión para continuar.");
  try {
    const { payload } = await jwtVerify(match[1], FIREBASE_JWKS, {
      algorithms: ["RS256"],
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
      requiredClaims: ["sub", "iat", "exp"],
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      throw new CheckoutRequestError("Sesión no válida. Vuelve a iniciar sesión.");
    }
    return {
      uid: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
      idToken: match[1],
    };
  } catch {
    throw new CheckoutRequestError("Sesión no válida. Vuelve a iniciar sesión.");
  }
}

export async function readFirestoreDocument(
  path: string,
  idToken: string,
): Promise<Record<string, unknown> | null> {
  if (!FIREBASE_PROJECT_ID) throw new CheckoutRequestError("Firebase no está configurado.");
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${encodedPath}`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${idToken}` } });
  if (response.status === 404) return null;
  if (!response.ok) throw new CheckoutRequestError("No se pudo leer el producto en Firestore.");
  const document = (await response.json()) as { fields?: Record<string, FirestoreValue> };
  return decodeFirestoreFields(document.fields ?? {});
}

export async function saveStripeAccountId(
  uid: string,
  idToken: string,
  accountId: string,
): Promise<void> {
  if (!FIREBASE_PROJECT_ID) throw new CheckoutRequestError("Firebase no está configurado.");
  const path = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const url = `https://firestore.googleapis.com/v1/${path}?updateMask.fieldPaths=stripeAccountId`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ fields: { stripeAccountId: { stringValue: accountId } } }),
  });
  if (!response.ok) throw new CheckoutRequestError("No se pudo guardar la cuenta Stripe en el perfil.");
}

export function getStripeClient(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) throw new StripeSetupError("Stripe Connect aún no está configurado en ClipsApp.");
  return new Stripe(secret);
}