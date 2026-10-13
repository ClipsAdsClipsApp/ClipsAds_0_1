import { collection, doc, limit, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import type { Clip, Creator, Product } from "@/lib/types";

export type SharedClipDoc = {
  authorId: string;
  clip: Clip;
  product: Product;
  author: Pick<Creator, "username" | "displayName" | "avatarUrl" | "role" | "city">;
  createdAt: number;
};

export function publishSharedClip(entry: SharedClipDoc): Promise<void> {
  return setDoc(doc(getFirebaseFirestore(), "clips", entry.clip.id), entry);
}

export function subscribeSharedClips(
  onData: (docs: SharedClipDoc[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(collection(getFirebaseFirestore(), "clips"), orderBy("createdAt", "desc"), limit(100));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as SharedClipDoc)),
    (error) => onError?.(error),
  );
}
