import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updatePassword as firebaseUpdatePassword,
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
  emailVerified: boolean;
  isDevFallback: false;
};

export function toFirebaseUserInfo(user: User): FirebaseUserInfo {
  return {
    id: user.uid,
    displayName: user.displayName,
    primaryEmail: user.email,
    profileImageUrl: user.photoURL,
    emailVerified: user.emailVerified,
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
  await sendEmailVerification(credential.user);
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

export async function resendVerificationEmail(): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Inicia sesión para verificar tu correo.");
  await sendEmailVerification(user);
}

export async function refreshEmailVerification(): Promise<FirebaseUserInfo> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Inicia sesión para verificar tu correo.");
  await user.reload();
  return toFirebaseUserInfo(user);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user?.email) throw new Error("Inicia sesión para cambiar tu contraseña.");
  if (!user.providerData.some((provider) => provider.providerId === "password")) {
    throw new Error("Esta cuenta no tiene una contraseña de ClipsApp para cambiar.");
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await firebaseUpdatePassword(user, newPassword);
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