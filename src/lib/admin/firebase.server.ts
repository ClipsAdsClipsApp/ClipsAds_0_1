import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  const existing = getApps().find((app) => app.name === "clipsads-admin");
  if (existing) return existing;

  const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!rawCredentials) {
    throw new Error("FIREBASE_ADMIN_NOT_CONFIGURED");
  }

  let credentials: ServiceAccount;
  try {
    const parsed = JSON.parse(rawCredentials) as Record<string, unknown>;
    credentials = {
      projectId: String(parsed.projectId ?? parsed.project_id ?? ""),
      clientEmail: String(parsed.clientEmail ?? parsed.client_email ?? ""),
      privateKey: String(parsed.privateKey ?? parsed.private_key ?? ""),
    };
  } catch {
    throw new Error("FIREBASE_ADMIN_CREDENTIALS_INVALID");
  }
  if (!credentials.projectId || !credentials.clientEmail || !credentials.privateKey) {
    throw new Error("FIREBASE_ADMIN_CREDENTIALS_INVALID");
  }
  credentials.privateKey = credentials.privateKey.replace(/\\n/g, "\n");

  return initializeApp(
    { credential: cert(credentials), projectId: credentials.projectId },
    "clipsads-admin",
  );
}

export function getFirebaseAdmin() {
  const app = getAdminApp();
  return { auth: getAuth(app), db: getFirestore(app) };
}

export function optionalFirebaseAdmin() {
  try {
    return getFirebaseAdmin();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "FIREBASE_ADMIN_NOT_CONFIGURED" ||
        error.message === "FIREBASE_ADMIN_CREDENTIALS_INVALID")
    ) {
      return null;
    }
    throw error;
  }
}

export type AdminFirebaseUser = UserRecord;
