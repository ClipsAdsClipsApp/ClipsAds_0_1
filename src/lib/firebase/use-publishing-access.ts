import { useEffect, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { PlanType } from "@/lib/stripe/plans";

export type PublishingAccess = {
  plan: PlanType;
  count: number;
  limit: number | null;
  period: { start: number; end: number };
};

export async function fetchPublishingAccess(userId: string): Promise<PublishingAccess> {
  const user = getFirebaseAuth().currentUser;
  if (!user || user.uid !== userId) throw new Error("Inicia sesión de nuevo.");
  const response = await fetch("/api/clips/publish", {
    headers: { authorization: `Bearer ${await user.getIdToken()}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json() as { error?: string };
    throw new Error(body.error ?? "No se pudo comprobar tu plan.");
  }
  return await response.json() as PublishingAccess;
}

export function usePublishingAccess(userId?: string) {
  const [state, setState] = useState<{ uid: string; access: PublishingAccess | null; error: string | null } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = () => {
      void fetchPublishingAccess(userId).then(
        (access) => { if (active) setState({ uid: userId, access, error: null }); },
        (error: unknown) => {
          if (active) setState({
            uid: userId,
            access: null,
            error: error instanceof Error ? error.message : "No se pudo comprobar tu plan.",
          });
        },
      );
    };
    load();
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [userId]);
  return state?.uid === userId ? state : null;
}
