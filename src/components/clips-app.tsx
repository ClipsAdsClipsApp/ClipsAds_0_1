import { useEffect, useState } from "react";
import { PhoneFrame, ToastHost } from "@/components/chrome";
import { CookieConsent } from "@/components/cookie-consent";
import { Feed } from "@/components/feed";
import { Onboarding } from "@/components/onboarding";
import { CreateClip, Explore, Library, Profile } from "@/components/screens";
import { PostPurchaseFeedback } from "@/components/product-feedback";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { firebaseConfigured, getFirebaseAuth } from "@/lib/firebase/client";
import { subscribeSharedClips, syncSharedAuthor } from "@/lib/firebase/clips";
import { getMyAccountStatus, getMyProfile } from "@/lib/profile";
import { useApp } from "@/lib/store";
import type { AgeRange, Role, UserProfile } from "@/lib/types";

export function ClipsApp() {
  const hydrate = useApp((s) => s.hydrate);
  const user = useApp((s) => s.user);
  const authorId = useApp((s) => s.user?.id);
  const authorUsername = useApp((s) => s.user?.username);
  const authorDisplayName = useApp((s) => s.user?.displayName);
  const authorAvatarUrl = useApp((s) => s.user?.avatarUrl);
  const authorRole = useApp((s) => s.user?.role);
  const authorCity = useApp((s) => s.user?.city);
  const authorStripeAccountId = useApp((s) => s.user?.stripeAccountId);
  const tab = useApp((s) => s.tab);
  const toastMsg = useApp((s) => s.toastMsg);
  const signingOut = useApp((s) => s.signingOut);
  const { user: session, isPending } = useCurrentUserState();
  const [profileReady, setProfileReady] = useState(false);
  const [accountIssue, setAccountIssue] = useState<{ blocked: boolean; reason: string } | null>(null);
  const [purchaseFeedback, setPurchaseFeedback] = useState<{
    productId: string;
    productName: string;
  } | null>(null);

  useEffect(() => {
    if (!isPending) void hydrate(session?.id ?? null);
  }, [hydrate, isPending, session?.id]);

  useEffect(() => {
    if (isPending || !session || typeof window === "undefined") return;
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get("checkout") !== "success") return;
    const sessionId = currentUrl.searchParams.get("session_id");
    if (!sessionId) return;
    const verifiedSessionId = sessionId;
    let cancelled = false;

    async function verifyPurchase() {
      try {
        const firebaseUser = getFirebaseAuth().currentUser;
        if (!firebaseUser || firebaseUser.uid !== session?.id) return;
        const response = await fetch(
          `/api/stripe/checkout/verify?session_id=${encodeURIComponent(verifiedSessionId)}`,
          { headers: { authorization: `Bearer ${await firebaseUser.getIdToken()}` } },
        );
        const result = (await response.json()) as {
          paid?: boolean;
          productId?: string;
          productName?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || !result.paid || !result.productId) {
          toastMsg(result.error || "No se pudo verificar el pago.");
          return;
        }
        setPurchaseFeedback({
          productId: result.productId,
          productName: result.productName || "tu compra",
        });
      } catch (error) {
        console.error("[stripe] Could not verify checkout return.", error);
        if (!cancelled) toastMsg("No se pudo verificar el pago.");
      } finally {
        if (!cancelled) {
          currentUrl.searchParams.delete("checkout");
          currentUrl.searchParams.delete("session_id");
          currentUrl.searchParams.delete("clipId");
          window.history.replaceState({}, "", currentUrl.pathname + currentUrl.search + currentUrl.hash);
        }
      }
    }

    void verifyPurchase();
    return () => {
      cancelled = true;
    };
  }, [isPending, session?.id, toastMsg]);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return subscribeSharedClips(
      (docs) => useApp.getState().setRemote(docs),
      (error) => {
        console.error("[firebase] Could not load shared clips.", error);
        const code = (error as { code?: string }).code;
        useApp
          .getState()
          .toastMsg(
            code === "permission-denied"
              ? "Firestore bloquea la lectura: publica las reglas"
              : `No se pudieron cargar los clips compartidos${code ? ` (${code})` : ""}`,
          );
      },
    );
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !authorId || !authorUsername || !authorDisplayName || !authorRole || !authorCity) return;
    void syncSharedAuthor(authorId, {
      username: authorUsername,
      displayName: authorDisplayName,
      avatarUrl: authorAvatarUrl && !authorAvatarUrl.startsWith("/avatars/") ? authorAvatarUrl : "",
      role: authorRole,
      city: authorCity,
      stripeAccountId: authorStripeAccountId,
    }).catch((error: unknown) => {
      console.error("[firebase] Could not sync clip author profile.", error);
    });
  }, [authorAvatarUrl, authorCity, authorDisplayName, authorId, authorRole, authorStripeAccountId, authorUsername]);

  useEffect(() => {
    if (isPending) return;
    let cancelled = false;
    async function sync() {
      if (!session) {
        if (!cancelled) {
          setAccountIssue(null);
          setProfileReady(true);
        }
        return;
      }
      setProfileReady(false);
      setAccountIssue(null);
      try {
        const accountStatus = await getMyAccountStatus(session.id);
        if (cancelled) return;
        if (accountStatus.blocked) {
          setAccountIssue({ blocked: true, reason: accountStatus.reason });
          setProfileReady(true);
          return;
        }
        const current = useApp.getState().user;
        if (current?.id === session.id) {
          setProfileReady(true);
          return;
        }
        const p = await getMyProfile();
        if (cancelled) return;
        if (p) {
          const next: UserProfile = {
            id: session.id,
            username: p.username,
            displayName: p.displayName,
            email: session.primaryEmail || "",
            phone: p.phone || "",
            avatarUrl:
              (p.avatarUrl && !p.avatarUrl.startsWith("/avatars/") ? p.avatarUrl : session.profileImageUrl) || "",
            role: (p.role as Role) || "user",
            creatorMode: p.creatorMode ?? p.role === "creator",
            businessId: p.businessId,
            accountMode: p.accountMode === "business" ? "business" : "personal",
            bio: p.bio,
            ageRange: (p.ageRange as AgeRange) || "25-34",
            gender: "prefer_not",
            city: p.city,
            country: p.country || undefined,
            province: p.province || undefined,
            stripeAccountId: p.stripeAccountId,
            interests: ["tech", "restaurants"],
            personalizeAds: true,
            approximateLocation: true,
          };
          useApp.getState().login(next, { silent: true });
        }
      } catch (error) {
        console.error("[firebase] Could not verify account access.", error);
        setAccountIssue({
          blocked: false,
          reason: "No se pudo comprobar el estado de tu cuenta. Por seguridad, el acceso queda pausado.",
        });
      } finally {
        if (!cancelled) setProfileReady(true);
      }
    }
    void sync();
    return () => {
      cancelled = true;
    };
  }, [session?.id, isPending]);

  return (
    <PhoneFrame>
      {signingOut || isPending || !profileReady ? (
        <div className="grid h-full place-items-center bg-bg">
          <div className="h-12 w-12 animate-pulse rounded-2xl bg-cyan/30" />
        </div>
      ) : !session ? (
        <Onboarding />
      ) : accountIssue !== null ? (
        <div className="grid h-full place-items-center px-7 text-center">
          <div className="max-w-sm">
            <p className="font-display text-xl font-extrabold">
              {accountIssue.blocked ? "Cuenta bloqueada" : "Acceso temporalmente pausado"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {accountIssue.blocked
                ? `No puedes iniciar sesión ni publicar mientras esta cuenta esté bloqueada.${accountIssue.reason ? ` Motivo: ${accountIssue.reason}` : ""}`
                : accountIssue.reason}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 min-h-11 rounded-xl border border-line px-5 text-sm font-bold"
            >
              Volver a intentar
            </button>
          </div>
        </div>
      ) : !session.emailVerified ? (
        <Onboarding session={session} />
      ) : !user || user.id !== session.id ? (
        <Onboarding session={session} />
      ) : (
        <Main tab={tab} />
      )}
      {purchaseFeedback ? (
        <PostPurchaseFeedback
          productId={purchaseFeedback.productId}
          productName={purchaseFeedback.productName}
          onClose={() => setPurchaseFeedback(null)}
        />
      ) : null}
      <ToastHost />
      <CookieConsent />
    </PhoneFrame>
  );
}

function Main({ tab }: { tab: "home" | "explore" | "create" | "clips" | "profile" }) {
  if (tab === "explore") return <Explore />;
  if (tab === "create") return <CreateClip />;
  if (tab === "clips") return <Library />;
  if (tab === "profile") return <Profile />;
  return <Feed />;
}
