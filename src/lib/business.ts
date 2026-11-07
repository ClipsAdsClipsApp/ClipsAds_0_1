import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  firebaseConfigured,
  getFirebaseAuth,
  getFirebaseFirestore,
} from "@/lib/firebase/client";

export type BusinessWorkspace = {
  id: string;
  ownerId: string;
  name: string;
  city: string;
  address: string;
  openingHours: string;
  plan: "basic" | "pro";
};

export type BusinessProfileInput = Pick<BusinessWorkspace, "name" | "city" | "address" | "openingHours">;

function cleanInput(input: BusinessProfileInput) {
  return {
    name: input.name.trim().slice(0, 60),
    city: input.city.trim().slice(0, 40),
    address: input.address.trim().slice(0, 120),
    openingHours: input.openingHours.trim().slice(0, 160),
  };
}

export async function getMyBusiness(businessId?: string): Promise<BusinessWorkspace | null> {
  if (!firebaseConfigured) return null;
  const user = getFirebaseAuth().currentUser;
  if (!user || (businessId && businessId !== user.uid)) return null;
  const snapshot = await getDoc(doc(getFirebaseFirestore(), "businesses", user.uid));
  if (!snapshot.exists() || snapshot.data().ownerId !== user.uid) return null;
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ownerId: user.uid,
    name: typeof data.name === "string" ? data.name : "",
    city: typeof data.city === "string" ? data.city : "",
    address: typeof data.address === "string" ? data.address : "",
    openingHours: typeof data.openingHours === "string" ? data.openingHours : "",
    plan: data.plan === "pro" ? "pro" : "basic",
  };
}

export async function saveMyBusiness(input: BusinessProfileInput): Promise<BusinessWorkspace> {
  if (!firebaseConfigured) throw new Error("Firebase no esta configurado.");
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Inicia sesion para crear un negocio.");
  const values = cleanInput(input);
  if (!values.name || !values.city) throw new Error("Indica el nombre y la ciudad del negocio.");

  const ref = doc(getFirebaseFirestore(), "businesses", user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { ...values, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, {
      ...values,
      ownerId: user.uid,
      plan: "basic",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  const saved = await getMyBusiness(user.uid);
  if (!saved) throw new Error("No se pudo leer el espacio comercial guardado.");
  return saved;
}
