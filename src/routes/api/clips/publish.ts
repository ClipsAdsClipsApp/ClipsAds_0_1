import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getFirebaseAdmin } from "@/lib/admin/firebase.server";
import { authenticateFirebaseRequest, CheckoutRequestError } from "@/lib/stripe/server";
import { canPublishAnotherClip, canUsePublishingOptions, clipLimit, countPublications, effectivePlan, monthlyPeriod, type VerifiedSubscription } from "@/lib/stripe/entitlements";

const entrySchema = z.object({
  authorId: z.string(),
  clip: z.looseObject({
    id: z.string().regex(/^mine-[a-zA-Z0-9-]{1,80}$/),
    authorId: z.string(),
    productId: z.string(),
    videoUrl: z.url().max(2048),
    ageRanges: z.array(z.enum(["14-17", "18-24", "25-34", "35-44", "45-54", "55+"])).max(6).optional(),
  }),
  product: z.looseObject({
    id: z.string(),
    cta: z.enum(["buy", "book", "call", "directions", "quote", "contact", "offer"]),
  }),
  author: z.looseObject({
    username: z.string().max(150),
    displayName: z.string().max(150),
    avatarUrl: z.string().max(1000000),
    role: z.string(),
    city: z.string(),
  }),
});

async function getIdentity(request: Request) {
  const identity = await authenticateFirebaseRequest(request);
  const { auth, db } = getFirebaseAdmin();
  await auth.verifyIdToken(identity.idToken, true);
  const user = await auth.getUser(identity.uid);
  const registeredAt = Date.parse(user.metadata.creationTime);
  if (!Number.isFinite(registeredAt)) throw new Error("No se pudo determinar la fecha de registro.");
  return { uid: identity.uid, registeredAt, db };
}

async function getUsage(
  identity: Awaited<ReturnType<typeof getIdentity>>,
  now: number,
) {
  const { db, uid, registeredAt } = identity;
  const userRef = db.collection("users").doc(uid);
  const [subscriptions, clips] = await Promise.all([
    userRef.collection("verifiedSubscriptions").get(),
    db.collection("clips").where("authorId", "==", uid).get(),
  ]);
  const verified = subscriptions.docs.map((doc) => doc.data() as VerifiedSubscription);
  const entitlement = effectivePlan(verified, now);
  const period = monthlyPeriod(entitlement.anchor ?? registeredAt, now);
  const events = await userRef.collection("publicationEvents")
    .where("publishedAt", ">=", period.start).where("publishedAt", "<", period.end).get();
  const count = countPublications([
    ...events.docs.map((event) => ({ id: event.id, publishedAt: event.get("publishedAt") })),
    ...clips.docs.map((clip) => ({ id: clip.id, publishedAt: clip.get("createdAt") })),
  ], period);
  return { plan: entitlement.plan, count, limit: clipLimit(entitlement.plan), period };
}

async function deleteClip(
  identity: Awaited<ReturnType<typeof getIdentity>>,
  clipId: string,
) {
  const { db, uid } = identity;
  const ref = db.collection("clips").doc(clipId);
  const userRef = db.collection("users").doc(uid);
  const eventRef = userRef.collection("publicationEvents").doc(clipId);
  const lockRef = userRef.collection("publicationState").doc("current");
  const shouldDelete = await db.runTransaction(async (tx) => {
    const [clip, event, lock] = await Promise.all([tx.get(ref), tx.get(eventRef), tx.get(lockRef)]);
    if (!clip.exists) return false;
    if (clip.get("authorId") !== uid) throw new CheckoutRequestError("El clip no pertenece a esta cuenta.");
    if (!event.exists) {
      const createdAt = clip.get("createdAt");
      if (typeof createdAt !== "number" || !Number.isFinite(createdAt)) {
        throw new Error("No se pudo determinar la fecha de publicación.");
      }
      tx.create(eventRef, { publishedAt: createdAt });
      tx.set(lockRef, { version: (lock.get("version") ?? 0) + 1 });
    }
    return true;
  });
  if (shouldDelete) await db.recursiveDelete(ref);
}

export const Route = createFileRoute("/api/clips/publish")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const identity = await getIdentity(request);
          return Response.json(await getUsage(identity, Date.now()));
        } catch (error) {
          if (error instanceof CheckoutRequestError) {
            return Response.json({ error: error.message }, { status: 401 });
          }
          console.error("[clips] Could not load publishing access.", error);
          return Response.json({ error: "No se pudo comprobar tu plan y tus publicaciones." }, { status: 503 });
        }
      },
      POST: async ({ request }) => {
        try {
          const identity = await getIdentity(request);
          const raw: unknown = await request.json();
          const parsed = entrySchema.safeParse(raw);
          if (!parsed.success) return Response.json({ error: "Los datos del clip no son válidos." }, { status: 400 });
          const entry = parsed.data;
          if (entry.authorId !== identity.uid || entry.clip.authorId !== identity.uid
            || entry.clip.productId !== entry.clip.id || entry.product.id !== entry.clip.id) {
            return Response.json({ error: "El clip no pertenece a esta cuenta." }, { status: 403 });
          }
          const video = new URL(entry.clip.videoUrl);
          if (video.protocol !== "https:" || !video.hostname.endsWith(".public.blob.vercel-storage.com")
            || !video.pathname.startsWith(`/clips/${identity.uid}/${entry.clip.id}.`)) {
            return Response.json({ error: "El vídeo no pertenece a esta cuenta." }, { status: 400 });
          }

          const { db, uid } = identity;
          const userRef = db.collection("users").doc(uid);
          const lockRef = userRef.collection("publicationState").doc("current");
          const clipRef = db.collection("clips").doc(entry.clip.id);
          const eventRef = userRef.collection("publicationEvents").doc(entry.clip.id);
          const now = Date.now();
          await db.runTransaction(async (tx) => {
            const [lock, existing, subscriptions, clips] = await Promise.all([
              tx.get(lockRef),
              tx.get(clipRef),
              tx.get(userRef.collection("verifiedSubscriptions")),
              tx.get(db.collection("clips").where("authorId", "==", uid)),
            ]);
            if (existing.exists) throw new CheckoutRequestError("Este clip ya se publicó.");
            const entitlement = effectivePlan(
              subscriptions.docs.map((doc) => doc.data() as VerifiedSubscription),
              now,
            );
            const period = monthlyPeriod(entitlement.anchor ?? identity.registeredAt, now);
            const events = await tx.get(userRef.collection("publicationEvents")
              .where("publishedAt", ">=", period.start).where("publishedAt", "<", period.end));
            const count = countPublications([
              ...events.docs.map((event) => ({ id: event.id, publishedAt: event.get("publishedAt") })),
              ...clips.docs.map((clip) => ({ id: clip.id, publishedAt: clip.get("createdAt") })),
            ], period);
            const limit = clipLimit(entitlement.plan);
            if (!canPublishAnotherClip(entitlement.plan, count)) {
              throw new CheckoutRequestError(`Has alcanzado el límite de ${limit} clips para este periodo.`);
            }
            if (!canUsePublishingOptions(entitlement.plan, entry.clip.ageRanges ?? [], entry.product.cta)) {
              throw new CheckoutRequestError("La segmentación por edad y esta acción requieren Business o Enterprise.");
            }
            tx.create(clipRef, {
              ...entry,
              clip: { ...entry.clip, createdAt: now },
              createdAt: now,
            });
            tx.create(eventRef, { publishedAt: now });
            tx.set(lockRef, { version: (lock.get("version") ?? 0) + 1 });
          });
          return Response.json({ published: true });
        } catch (error) {
          if (error instanceof CheckoutRequestError) {
            return Response.json({ error: error.message }, { status: 400 });
          }
          console.error("[clips] Could not publish clip.", error);
          return Response.json({ error: "No se pudo publicar el clip." }, { status: 500 });
        }
      },
      DELETE: async ({ request }) => {
        try {
          const identity = await getIdentity(request);
          const { db, uid } = identity;
          const input = z.object({ clipId: z.string().regex(/^mine-[a-zA-Z0-9-]{1,80}$/).optional() }).parse(await request.json());
          if (input.clipId) {
            await deleteClip(identity, input.clipId);
          } else {
            const clips = await db.collection("clips").where("authorId", "==", uid).get();
            for (const clip of clips.docs) await deleteClip(identity, clip.id);
          }
          return Response.json({ deleted: true });
        } catch (error) {
          if (error instanceof CheckoutRequestError) {
            return Response.json({ error: error.message }, { status: 403 });
          }
          console.error("[clips] Could not delete clips.", error);
          return Response.json({ error: "No se pudieron eliminar los clips." }, { status: 500 });
        }
      },
    },
  },
});
