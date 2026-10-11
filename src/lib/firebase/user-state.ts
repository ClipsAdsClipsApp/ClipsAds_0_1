import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "./client";

export async function loadUserAppState<T>(uid: string): Promise<T | null> {
  const snapshot = await getDoc(
    doc(getFirebaseFirestore(), "users", uid, "state", "app"),
  );
  return snapshot.exists() ? (snapshot.data().value as T) : null;
}

export async function saveUserAppState<T>(uid: string, value: T): Promise<void> {
  await setDoc(
    doc(getFirebaseFirestore(), "users", uid, "state", "app"),
    { value, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
