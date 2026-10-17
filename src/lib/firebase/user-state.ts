import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "./client";

export async function loadUserAppState<T>(uid: string): Promise<T | null> {
  const snapshot = await getDoc(
    doc(getFirebaseFirestore(), "users", uid, "state", "app"),
  );
  return snapshot.exists() ? (snapshot.data().value as T) : null;
}

export function subscribeUserAppState<T>(
  uid: string,
  onData: (value: T | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(getFirebaseFirestore(), "users", uid, "state", "app"),
    (snapshot) => onData(snapshot.exists() ? (snapshot.data().value as T) : null),
    (error) => onError?.(error),
  );
}

export async function saveUserAppState<T>(uid: string, value: T): Promise<void> {
  await setDoc(
    doc(getFirebaseFirestore(), "users", uid, "state", "app"),
    { value, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
