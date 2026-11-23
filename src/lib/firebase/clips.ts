import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase/client";
import type { Clip, Comment, Creator, Product } from "@/lib/types";

export type SharedClipDoc = {
  authorId: string;
  clip: Clip;
  product: Product;
  author: Pick<Creator, "username" | "displayName" | "avatarUrl" | "role" | "city" | "stripeAccountId">;
  createdAt: number;
};

export type ClipVoteSummary = {
  adYes: number;
  adNo: number;
  usedYes: number;
  usedNo: number;
  wouldYes: number;
  wouldNo: number;
  verified: number;
  myAdLike?: "yes" | "no";
  myUsed?: "yes" | "no";
  myWould?: "yes" | "no";
  myTried?: "verified" | "casual" | "no";
};

export type SharedComment = Comment & { authorId: string };

export type ClipCounts = {
  comments: number;
  saves: number;
  shares: number;
  views: number;
  detailViews: number;
  conversionClicks: number;
};

export function subscribeClipCounts(
  clipId: string,
  onData: (counts: ClipCounts) => void,
  onError?: (error: Error) => void,
  includeBusinessMetrics = false,
): () => void {
  const db = getFirebaseFirestore();
  const counts: ClipCounts = {
    comments: 0,
    saves: 0,
    shares: 0,
    views: 0,
    detailViews: 0,
    conversionClicks: 0,
  };
  const watch = (name: keyof ClipCounts) =>
    onSnapshot(
      query(collection(db, "clips", clipId, name), limit(10000)),
      (snap) => {
        counts[name] = snap.size;
        onData({ ...counts });
      },
      (error) => onError?.(error),
    );
  const stops = [watch("comments"), watch("saves"), watch("shares")];
  if (includeBusinessMetrics) {
    stops.push(watch("views"), watch("detailViews"), watch("conversionClicks"));
  }
  return () => stops.forEach((stop) => stop());
}

export function setClipSaved(clipId: string, userId: string, saved: boolean): Promise<void> {
  const ref = doc(getFirebaseFirestore(), "clips", clipId, "saves", userId);
  return saved ? setDoc(ref, { userId, updatedAt: serverTimestamp() }) : deleteDoc(ref);
}

export function recordClipEvent(
  clipId: string,
  event: "views" | "detailViews" | "conversionClicks",
  userId: string,
): Promise<void> {
  return addDoc(collection(getFirebaseFirestore(), "clips", clipId, event), {
    userId,
    createdAt: serverTimestamp(),
  }).then(() => undefined);
}

export function recordClipShare(clipId: string, userId: string): Promise<void> {
  return setDoc(doc(getFirebaseFirestore(), "clips", clipId, "shares", userId), {
    userId,
    updatedAt: serverTimestamp(),
  });
}

export type SharedAuthor = SharedClipDoc["author"];

export async function publishSharedClip(entry: SharedClipDoc): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user || user.uid !== entry.authorId) throw new Error("Inicia sesión de nuevo.");
  const response = await fetch("/api/clips/publish", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    const body = await response.json() as { error?: string };
    throw new Error(body.error ?? "No se pudo publicar el clip.");
  }
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

export function subscribeMySharedClips(
  authorId: string,
  onData: (docs: SharedClipDoc[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(collection(getFirebaseFirestore(), "clips"), where("authorId", "==", authorId));
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs
          .map((d) => d.data() as SharedClipDoc)
          .sort((a, b) => b.createdAt - a.createdAt),
      ),
    (error) => onError?.(error),
  );
}

export function subscribeClipComments(
  clipId: string,
  onData: (comments: SharedComment[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(getFirebaseFirestore(), "clips", clipId, "comments"),
    orderBy("createdAt", "desc"),
    limit(100),
  );
  return onSnapshot(
    q,
    (snap) =>
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SharedComment)),
    (error) => onError?.(error),
  );
}

export function publishClipComment(
  clipId: string,
  authorId: string,
  username: string,
  text: string,
): Promise<void> {
  return addDoc(collection(getFirebaseFirestore(), "clips", clipId, "comments"), {
    authorId,
    username,
    text,
    clipId,
    createdAt: Date.now(),
  }).then(() => undefined);
}

export function subscribeClipVotes(
  clipId: string,
  userId: string,
  onData: (summary: ClipVoteSummary) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(getFirebaseFirestore(), "clips", clipId, "votes"),
    (snap) => {
      const summary: ClipVoteSummary = {
        adYes: 0,
        adNo: 0,
        usedYes: 0,
        usedNo: 0,
        wouldYes: 0,
        wouldNo: 0,
        verified: 0,
      };
      for (const voteDoc of snap.docs) {
        const vote = voteDoc.data();
        if (vote.adLike === "yes") summary.adYes += 1;
        if (vote.adLike === "no") summary.adNo += 1;
        if (vote.used === "yes") summary.usedYes += 1;
        if (vote.used === "no") summary.usedNo += 1;
        if (vote.would === "yes") summary.wouldYes += 1;
        if (vote.would === "no") summary.wouldNo += 1;
        if (vote.tried === "verified") summary.verified += 1;
        if (voteDoc.id === userId) {
          if (vote.adLike === "yes" || vote.adLike === "no") summary.myAdLike = vote.adLike;
          if (vote.used === "yes" || vote.used === "no") summary.myUsed = vote.used;
          if (vote.would === "yes" || vote.would === "no") summary.myWould = vote.would;
          if (vote.tried === "verified" || vote.tried === "casual" || vote.tried === "no") {
            summary.myTried = vote.tried;
          }
        }
      }
      onData(summary);
    },
    (error) => onError?.(error),
  );
}

export function saveClipVote(
  clipId: string,
  userId: string,
  vote: {
    adLike?: "yes" | "no";
    used?: "yes" | "no";
    would?: "yes" | "no";
    tried?: "verified" | "casual" | "no";
  },
): Promise<void> {
  return setDoc(
    doc(getFirebaseFirestore(), "clips", clipId, "votes", userId),
    { ...vote, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function syncSharedAuthor(authorId: string, author: SharedAuthor): Promise<void> {
  const matches = await getDocs(
    query(collection(getFirebaseFirestore(), "clips"), where("authorId", "==", authorId)),
  );
  for (let start = 0; start < matches.docs.length; start += 450) {
    const batch = writeBatch(getFirebaseFirestore());
    for (const match of matches.docs.slice(start, start + 450)) {
      batch.update(match.ref, { author });
    }
    await batch.commit();
  }
}

export async function deleteSharedClip(clipId: string): Promise<void> {
  await deleteClips({ clipId });
}

export async function deleteAllSharedClips(authorId: string): Promise<void> {
  if (getFirebaseAuth().currentUser?.uid !== authorId) throw new Error("Inicia sesión de nuevo.");
  await deleteClips({});
}

async function deleteClips(input: { clipId?: string }): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Inicia sesión de nuevo.");
  const response = await fetch("/api/clips/publish", {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json() as { error?: string };
    throw new Error(body.error ?? "No se pudieron eliminar los clips.");
  }
}
