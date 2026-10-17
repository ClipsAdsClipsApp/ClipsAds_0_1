import {
  addDoc,
  collectionGroup,
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
  author: Pick<Creator, "username" | "displayName" | "avatarUrl" | "role" | "city">;
  createdAt: number;
};

export type ClipVoteSummary = {
  likes: number;
  adYes: number;
  adNo: number;
  usedYes: number;
  usedNo: number;
  wouldYes: number;
  wouldNo: number;
  myLiked?: boolean;
  myAdLike?: "yes" | "no";
  myUsed?: "yes" | "no";
  myWould?: "yes" | "no";
};

export type SharedComment = Comment & { authorId: string };

export type SharedAuthor = SharedClipDoc["author"];

export type CreatorFollowCounts = Record<string, number>;

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

export function subscribeAllClipComments(
  onData: (comments: SharedComment[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collectionGroup(getFirebaseFirestore(), "comments"),
    (snap) =>
      onData(
        snap.docs
          .filter((entry) => {
            const pathParts = entry.ref.path.split("/");
            return pathParts[0] === "clips" && pathParts[2] === "comments";
          })
          .map((entry) => ({ id: entry.id, ...entry.data() }) as SharedComment)
          .sort((a, b) => b.createdAt - a.createdAt),
      ),
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
        likes: 0,
        adYes: 0,
        adNo: 0,
        usedYes: 0,
        usedNo: 0,
        wouldYes: 0,
        wouldNo: 0,
      };
      for (const voteDoc of snap.docs) {
        const vote = voteDoc.data();
        if (vote.liked === true) summary.likes += 1;
        if (vote.adLike === "yes") summary.adYes += 1;
        if (vote.adLike === "no") summary.adNo += 1;
        if (vote.used === "yes") summary.usedYes += 1;
        if (vote.used === "no") summary.usedNo += 1;
        if (vote.would === "yes") summary.wouldYes += 1;
        if (vote.would === "no") summary.wouldNo += 1;
        if (voteDoc.id === userId) {
          summary.myLiked = vote.liked === true;
          if (vote.adLike === "yes" || vote.adLike === "no") summary.myAdLike = vote.adLike;
          if (vote.used === "yes" || vote.used === "no") summary.myUsed = vote.used;
          if (vote.would === "yes" || vote.would === "no") summary.myWould = vote.would;
        }
      }
      onData(summary);
    },
    (error) => onError?.(error),
  );
}

export function subscribeAllClipVotes(
  userId: string,
  onData: (summaries: Record<string, ClipVoteSummary>) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collectionGroup(getFirebaseFirestore(), "votes"),
    (snap) => {
      const summaries: Record<string, ClipVoteSummary> = {};
      for (const voteDoc of snap.docs) {
        const pathParts = voteDoc.ref.path.split("/");
        if (pathParts[0] !== "clips" || pathParts[2] !== "votes") continue;
        const clipId = voteDoc.ref.parent.parent?.id;
        if (!clipId) continue;
        const summary = (summaries[clipId] ??= {
          likes: 0,
          adYes: 0,
          adNo: 0,
          usedYes: 0,
          usedNo: 0,
          wouldYes: 0,
          wouldNo: 0,
        });
        const vote = voteDoc.data();
        if (vote.liked === true) summary.likes += 1;
        if (vote.adLike === "yes") summary.adYes += 1;
        if (vote.adLike === "no") summary.adNo += 1;
        if (vote.used === "yes") summary.usedYes += 1;
        if (vote.used === "no") summary.usedNo += 1;
        if (vote.would === "yes") summary.wouldYes += 1;
        if (vote.would === "no") summary.wouldNo += 1;
        if (voteDoc.id === userId) {
          summary.myLiked = vote.liked === true;
          if (vote.adLike === "yes" || vote.adLike === "no") summary.myAdLike = vote.adLike;
          if (vote.used === "yes" || vote.used === "no") summary.myUsed = vote.used;
          if (vote.would === "yes" || vote.would === "no") summary.myWould = vote.would;
        }
      }
      onData(summaries);
    },
    (error) => onError?.(error),
  );
}

export function subscribeAllCreatorFollows(
  onData: (counts: CreatorFollowCounts) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collectionGroup(getFirebaseFirestore(), "followers"),
    (snap) => {
      const counts: CreatorFollowCounts = {};
      for (const follower of snap.docs) {
        const creatorId = follower.ref.parent.parent?.id;
        if (creatorId) counts[creatorId] = (counts[creatorId] ?? 0) + 1;
      }
      onData(counts);
    },
    (error) => onError?.(error),
  );
}

export function setCreatorFollow(
  creatorId: string,
  userId: string,
  following: boolean,
): Promise<void> {
  const followerRef = doc(getFirebaseFirestore(), "creator-follows", creatorId, "followers", userId);
  return following
    ? setDoc(followerRef, { creatorId, userId, createdAt: serverTimestamp() })
    : deleteDoc(followerRef);
}

export function saveClipVote(
  clipId: string,
  userId: string,
  vote: {
    liked?: boolean;
    adLike?: "yes" | "no";
    used?: "yes" | "no";
    would?: "yes" | "no";
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
    const [comments, votes] = await Promise.all([
      getDocs(collection(db, "clips", clipRef.id, "comments")),
      getDocs(collection(db, "clips", clipRef.id, "votes")),
    ]);
    allRefs.push(...comments.docs.map((entry) => entry.ref));
    allRefs.push(...votes.docs.map((entry) => entry.ref));
    allRefs.push(clipRef);
  }
  for (let start = 0; start < allRefs.length; start += 450) {
    const batch = writeBatch(db);
    for (const ref of allRefs.slice(start, start + 450)) batch.delete(ref);
    await batch.commit();
  }
}
