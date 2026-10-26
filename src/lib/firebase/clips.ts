import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase/client";
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
  myAdLike?: "yes" | "no";
  myUsed?: "yes" | "no";
};

export type SharedComment = Comment & { authorId: string };

export type ClipCounts = { comments: number; saves: number; shares: number };

export function subscribeClipCounts(
  clipId: string,
  onData: (counts: ClipCounts) => void,
  onError?: (error: Error) => void,
): () => void {
  const db = getFirebaseFirestore();
  const counts: ClipCounts = { comments: 0, saves: 0, shares: 0 };
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
  return () => stops.forEach((stop) => stop());
}

export function setClipSaved(clipId: string, userId: string, saved: boolean): Promise<void> {
  const ref = doc(getFirebaseFirestore(), "clips", clipId, "saves", userId);
  return saved ? setDoc(ref, { userId, updatedAt: serverTimestamp() }) : deleteDoc(ref);
}

export function recordClipShare(clipId: string, userId: string): Promise<void> {
  return setDoc(doc(getFirebaseFirestore(), "clips", clipId, "shares", userId), {
    userId,
    updatedAt: serverTimestamp(),
  });
}

export type SharedAuthor = SharedClipDoc["author"];

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
      };
      for (const voteDoc of snap.docs) {
        const vote = voteDoc.data();
        if (vote.adLike === "yes") summary.adYes += 1;
        if (vote.adLike === "no") summary.adNo += 1;
        if (vote.used === "yes") summary.usedYes += 1;
        if (vote.used === "no") summary.usedNo += 1;
        if (voteDoc.id === userId) {
          if (vote.adLike === "yes" || vote.adLike === "no") summary.myAdLike = vote.adLike;
          if (vote.used === "yes" || vote.used === "no") summary.myUsed = vote.used;
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
  vote: { adLike?: "yes" | "no"; used?: "yes" | "no" },
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
  const ref = doc(getFirebaseFirestore(), "clips", clipId);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) await deleteClipDocuments([ref]);
}

export async function deleteAllSharedClips(authorId: string): Promise<void> {
  const matches = await getDocs(
    query(collection(getFirebaseFirestore(), "clips"), where("authorId", "==", authorId)),
  );
  const clipRefs = matches.docs.map((match) => match.ref);
  await deleteClipDocuments(clipRefs);
}

async function deleteClipDocuments(clipRefs: DocumentReference[]): Promise<void> {
  const db = getFirebaseFirestore();
  const allRefs: DocumentReference[] = [];
  for (const clipRef of clipRefs) {
    const [comments, votes, saves, shares] = await Promise.all([
      getDocs(collection(db, "clips", clipRef.id, "comments")),
      getDocs(collection(db, "clips", clipRef.id, "votes")),
      getDocs(collection(db, "clips", clipRef.id, "saves")),
      getDocs(collection(db, "clips", clipRef.id, "shares")),
    ]);
    allRefs.push(...comments.docs.map((entry) => entry.ref));
    allRefs.push(...votes.docs.map((entry) => entry.ref));
    allRefs.push(...saves.docs.map((entry) => entry.ref));
    allRefs.push(...shares.docs.map((entry) => entry.ref));
    allRefs.push(clipRef);
  }
  for (let start = 0; start < allRefs.length; start += 450) {
    const batch = writeBatch(db);
    for (const ref of allRefs.slice(start, start + 450)) batch.delete(ref);
    await batch.commit();
  }
}
