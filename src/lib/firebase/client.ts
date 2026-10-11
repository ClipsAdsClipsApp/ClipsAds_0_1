import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = [
  config.apiKey,
  config.authDomain,
  config.projectId,
  config.messagingSenderId,
  config.appId,
].every((value) => typeof value === "string" && value.length > 0);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfigured) {
    throw new Error("Firebase aún no está configurado para esta aplicación.");
  }
  if (typeof window === "undefined") {
    throw new Error("Firebase solo está disponible en el navegador.");
  }
  app ??= getApps().length ? getApp() : initializeApp(config);
  return app;
}

export function getFirebaseAuth(): Auth {
  auth ??= getAuth(getFirebaseApp());
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    const firebaseApp = getFirebaseApp();
    try {
      firestore = initializeFirestore(firebaseApp, {
        ignoreUndefinedProperties: true,
      });
    } catch {
      firestore = getFirestore(firebaseApp);
    }
  }
  return firestore;
}