import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  firebaseConfigured,
  getFirebaseAuth,
  getFirebaseFirestore,
} from "@/lib/firebase/client";

export type SavedProfile = {
  userId: string;
  username: string;
  displayName: string;
  phone?: string;
  bio: string;
  country?: string;
  province?: string;
  city: string;
  avatarUrl: string;
  role: string;
  stripeAccountId?: string;
};

export async function getMyProfile(): Promise<SavedProfile | null> {
  if (!firebaseConfigured) return null;
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  const snapshot = await getDoc(doc(getFirebaseFirestore(), "users", user.uid));
  if (!snapshot.exists()) return null;
  return { userId: user.uid, ...(snapshot.data() as Omit<SavedProfile, "userId">) };
}

export async function saveMyProfile({ data: input }: { data: {
    username: string;
    displayName: string;
    phone?: string;
    bio: string;
    country?: string;
    province?: string;
    city: string;
    avatarUrl: string;
    role: string;
    stripeAccountId?: string;
  } }): Promise<SavedProfile> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Inicia sesión para guardar tu perfil.");
  const data = {
    username: input.username.trim().replace(/^@/, "").toLowerCase().slice(0, 24) || "usuario",
    displayName: input.displayName.trim().slice(0, 40) || "Usuario",
    phone: (input.phone ?? "").trim().slice(0, 30),
    bio: input.bio.trim().slice(0, 180),
    country: (input.country ?? "").trim().slice(0, 40),
    province: (input.province ?? "").trim().slice(0, 40),
    city: input.city.trim().slice(0, 40) || "Parla",
    avatarUrl: input.avatarUrl.slice(0, 350_000),
    role: ["user", "creator", "business"].includes(input.role) ? input.role : "user",
    ...(input.stripeAccountId ? { stripeAccountId: input.stripeAccountId } : {}),
  };
  await setDoc(
    doc(getFirebaseFirestore(), "users", user.uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
  return { userId: user.uid, ...data };
}
