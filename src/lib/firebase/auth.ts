import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, firebaseConfigured } from "./client";

export { firebaseConfigured };
export const authEnabled =
  import.meta.env.VITE_AUTH_ENABLED !== "false" && firebaseConfigured;

export const FIREBASE_PROVIDERS = [
  { providerId: "google", label: "Google" },
] as const;

export type FirebaseUserInfo = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  isDevFallback: false;
};

export function toFirebaseUserInfo(user: User): FirebaseUserInfo {
  return {
    id: user.uid,
    displayName: user.displayName,
    primaryEmail: user.email,
    profileImageUrl: user.photoURL,
    isDevFallback: false,
  };
}

export function subscribeToFirebaseUser(
  callback: (user: FirebaseUserInfo | null) => void,
): () => void {
  if (!firebaseConfigured) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(getFirebaseAuth(), (user) => {
    callback(user ? toFirebaseUserInfo(user) : null);
  });
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<FirebaseUserInfo> {
  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password,
  );
  await updateProfile(credential.user, { displayName: displayName.trim() });
  return toFirebaseUserInfo(credential.user);
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<FirebaseUserInfo> {
  const credential = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password,
  );
  return toFirebaseUserInfo(credential.user);
}

export async function signIn(providerId: string, callbackURL = "/"): Promise<void> {
  if (providerId !== "google") {
    throw new Error("Este método de acceso no está configurado en Firebase.");
  }
  await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  window.location.assign(callbackURL);
}

export async function signOut(redirectTo = "/"): Promise<void> {
  if (firebaseConfigured) await firebaseSignOut(getFirebaseAuth());
  if (typeof window !== "undefined") window.location.assign(redirectTo);
}