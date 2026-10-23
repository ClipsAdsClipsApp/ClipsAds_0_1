import { create } from "zustand";
import { DEMO_USER, CLIPS, COMMENTS, PRODUCTS } from "@/lib/seed";
import type {
  Clip,
  Comment,
  FeedMode,
  Product,
  SheetKind,
  Tab,
  UserProfile,
} from "@/lib/types";
import { firebaseConfigured } from "@/lib/firebase/client";
import {
  deleteAllSharedClips,
  deleteSharedClip,
  publishClipComment,
  publishSharedClip,
  saveClipVote,
  type ClipVoteSummary,
  type SharedClipDoc,
} from "@/lib/firebase/clips";
import { remoteCreators } from "@/lib/creators-registry";
import { loadUserAppState, saveUserAppState } from "@/lib/firebase/user-state";

const KEY = "clipsapp-state-v2";

const isShared = (id: string) => id.startsWith("mine-");

function mergeRemote(
  clips: Clip[],
  products: Product[],
  docs: SharedClipDoc[],
): { clips: Clip[]; products: Product[] } {
  const clipIds = new Set(docs.map((d) => d.clip.id));
  const productIds = new Set(docs.map((d) => d.product?.id).filter(Boolean));
  for (const d of docs) {
    remoteCreators.set(d.authorId, {
      id: d.authorId,
      username: d.author.username,
      displayName: d.author.displayName,
      avatarUrl: d.author.avatarUrl,
      role: d.author.role,
      city: d.author.city,
      stripeAccountId: d.author.stripeAccountId,
      bio: "",
      followers: 0,
      verified: false,
    });
  }
  return {
    clips: [
      ...docs.map((d) => d.clip),
      ...clips.filter((c) => !clipIds.has(c.id) && !isShared(c.id)),
    ],
    products: [
      ...docs.flatMap((d) => (d.product ? [d.product] : [])),
      ...products.filter((p) => !productIds.has(p.id) && !isShared(p.id)),
    ],
  };
}

interface Persisted {
  user: UserProfile | null;
  clips: Clip[];
  products: Product[];
  comments: Comment[];
  liked: string[];
  saved: string[];
  following: string[];
  hidden: string[];
  tried: Record<string, "verified" | "casual" | "no">;
  would: Record<string, "yes" | "no">;
  fulfills: Record<string, "yes" | "mid" | "no">;
  adLike: Record<string, "yes" | "no">;
}

interface AppState extends Persisted {
  ready: boolean;
  signingOut: boolean;
  setSigningOut: (value: boolean) => void;
  remote: SharedClipDoc[];
  clipVotes: Record<string, ClipVoteSummary>;
  setRemote: (docs: SharedClipDoc[]) => void;
  setClipVotes: (clipId: string, summary: ClipVoteSummary) => void;
  setSharedComments: (clipId: string, comments: Comment[]) => void;
  tab: Tab;
  feedMode: FeedMode;
  activeClipId: string;
  sheet: SheetKind;
  sheetClipId: string | null;
  toast: string | null;
  soundOn: boolean;
  hydrate: (userId: string | null) => Promise<void>;
  persist: () => void;
  toastMsg: (msg: string) => void;
  login: (user: UserProfile, opts?: { silent?: boolean }) => void;
  logout: () => void;
  updateUser: (patch: Partial<UserProfile>) => void;
  setTab: (tab: Tab) => void;
  setFeedMode: (mode: FeedMode) => void;
  setActiveClip: (id: string) => void;
  openSheet: (sheet: SheetKind, clipId?: string) => void;
  closeSheet: () => void;
  toggleSound: () => void;
  toggleLike: (clipId: string) => void;
  toggleSave: (clipId: string) => void;
  toggleFollow: (authorId: string) => void;
  addComment: (clipId: string, text: string) => Promise<void>;
  setTried: (clipId: string, value: "verified" | "casual" | "no") => void;
  setUsed: (clipId: string, value: "yes" | "no") => void;
  voteWould: (clipId: string, value: "yes" | "no") => void;
  voteAdLike: (clipId: string, value: "yes" | "no") => void;
  voteFulfills: (clipId: string, value: "yes" | "mid" | "no") => void;
  hideClip: (clipId: string) => void;
  deletePublishedClip: (clipId: string) => Promise<void>;
  deleteAllPublishedClips: () => Promise<void>;
  shareClip: (clipId: string) => Promise<void>;
  publishClip: (clip: Clip, product?: Product) => void;
}

function save(part: Persisted) {
  if (typeof window === "undefined") return;
  const userId = part.user?.id ?? null;
  const data: Persisted = {
    user: part.user,
    clips: part.clips.filter((c) => !isShared(c.id)),
    products: part.products.filter((p) => !isShared(p.id)),
    comments: part.comments,
    liked: part.liked,
    saved: part.saved,
    following: part.following,
    hidden: part.hidden,
    tried: part.tried,
    would: part.would,
    fulfills: part.fulfills,
    adLike: part.adLike,
  };
  localStorage.setItem(`${KEY}:${userId ?? "guest"}`, JSON.stringify(data));
  if (userId && firebaseConfigured) {
    const previous = cloudSaves.get(userId) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(() => saveUserAppState(userId, data))
      .catch((error: unknown) => {
        console.error("[firebase] Could not sync account state.", error);
      });
    cloudSaves.set(userId, current);
  }
}

const cloudSaves = new Map<string, Promise<void>>();

const empty: Persisted = {
  user: null,
  clips: CLIPS,
  products: PRODUCTS,
  comments: COMMENTS,
  liked: [],
  saved: [],
  following: [],
  hidden: [],
  tried: {},
  would: {},
  fulfills: {},
  adLike: {},
};

export const useApp = create<AppState>((set, get) => ({
  ...empty,
  ready: false,
  signingOut: false,
  setSigningOut: (signingOut) => set({ signingOut }),
  remote: [],
  clipVotes: {},
  tab: "home",
  feedMode: "for-you",
  activeClipId: CLIPS[0]?.id ?? "c1",
  sheet: null,
  sheetClipId: null,
  toast: null,
  soundOn: false,

  hydrate: async (userId) => {
    let loaded = empty;
    try {
      const raw = localStorage.getItem(`${KEY}:${userId ?? "guest"}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        loaded = {
          ...empty,
          ...parsed,
          clips: (parsed.clips?.length ? parsed.clips : CLIPS).map((c) => {
            const seed = CLIPS.find((s) => s.id === c.id);
            return {
              ...c,
              adYes: c.adYes ?? seed?.adYes ?? 24,
              adNo: c.adNo ?? seed?.adNo ?? 16,
            };
          }),
          products: parsed.products?.length ? parsed.products : PRODUCTS,
          comments: parsed.comments?.length ? parsed.comments : COMMENTS,
          adLike: parsed.adLike ?? {},
        };
      }
    } catch {
      loaded = empty;
    }

    if (userId && firebaseConfigured) {
      try {
        const remote = await loadUserAppState<Partial<Persisted>>(userId);
        if (remote) {
          loaded = {
            ...loaded,
            ...remote,
            user: remote.user?.id === userId ? remote.user : loaded.user,
          };
        }
      } catch (error) {
        console.error("[firebase] Could not load account state.", error);
      }
    }

    const base = {
      clips: loaded.clips.filter((c) => !isShared(c.id)),
      products: loaded.products.filter((p) => !isShared(p.id)),
    };
    set({
      ...loaded,
      clipVotes: {},
      ...mergeRemote(
        base.clips.length ? base.clips : CLIPS,
        base.products.length ? base.products : PRODUCTS,
        get().remote,
      ),
      ready: true,
    });
  },

  setRemote: (docs) => {
    set((s) => ({ remote: docs, ...mergeRemote(s.clips, s.products, docs) }));
  },

  setClipVotes: (clipId, summary) =>
    set((s) => ({ clipVotes: { ...s.clipVotes, [clipId]: summary } })),

  setSharedComments: (clipId, sharedComments) => {
    const seeded = COMMENTS.filter((comment) => comment.clipId === clipId);
    const comments = [
      ...sharedComments,
      ...seeded.filter((comment) => !sharedComments.some((entry) => entry.id === comment.id)),
    ];
    const count = sharedComments.length + seeded.length;
    set((s) => ({
      comments: [...comments, ...s.comments.filter((comment) => comment.clipId !== clipId)],
      clips: s.clips.map((clip) => (clip.id === clipId ? { ...clip, comments: count } : clip)),
    }));
  },

  persist: () => {
    const s = get();
    save(s);
  },

  toastMsg: (msg) => {
    set({ toast: msg });
    window.setTimeout(() => {
      if (get().toast === msg) set({ toast: null });
    }, 1800);
  },

  login: (user, opts) => {
    void opts;
    const same = get().user?.id === user.id;
    set({ user, clipVotes: same ? get().clipVotes : {}, tab: same ? get().tab : "home" });
    get().persist();
  },

  logout: () => {
    set({ user: null, clipVotes: {}, tab: "home", sheet: null });
    get().persist();
  },

  updateUser: (patch) => {
    const user = get().user;
    if (!user) return;
    set({ user: { ...user, ...patch } });
    get().persist();
  },

  setTab: (tab) => set({ tab, sheet: null }),
  setFeedMode: (feedMode) => set({ feedMode }),
  setActiveClip: (activeClipId) => set({ activeClipId }),
  openSheet: (sheet, clipId) =>
    set({ sheet, sheetClipId: clipId ?? get().activeClipId }),
  closeSheet: () => set({ sheet: null }),
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),

  toggleLike: (clipId) => {
    const liked = new Set(get().liked);
    const clips = get().clips.map((c) => {
      if (c.id !== clipId) return c;
      const on = liked.has(clipId);
      if (on) liked.delete(clipId);
      else liked.add(clipId);
      return { ...c, likes: c.likes + (on ? -1 : 1) };
    });
    set({ liked: [...liked], clips });
    get().persist();
  },

  toggleSave: (clipId) => {
    const saved = new Set(get().saved);
    const on = saved.has(clipId);
    if (on) saved.delete(clipId);
    else saved.add(clipId);
    const clips = get().clips.map((c) =>
      c.id === clipId ? { ...c, saves: c.saves + (on ? -1 : 1) } : c,
    );
    set({ saved: [...saved], clips });
    get().persist();
    get().toastMsg(on ? "Quitado de guardados" : "Clip guardado");
  },

  toggleFollow: (authorId) => {
    const following = new Set(get().following);
    const on = following.has(authorId);
    if (on) following.delete(authorId);
    else following.add(authorId);
    set({ following: [...following] });
    get().persist();
    get().toastMsg(on ? "Has dejado de seguir" : "Ahora sigues esta cuenta");
  },

  addComment: async (clipId, text) => {
    const user = get().user;
    if (!user) return;
    if (firebaseConfigured) {
      try {
        await publishClipComment(clipId, user.id, user.username, text);
        get().toastMsg("Comentario publicado");
      } catch (error) {
        console.error("[firebase] Could not publish comment.", error);
        get().toastMsg("No se pudo publicar el comentario");
      }
      return;
    }
    const comment: Comment = {
      id: `cm-${Date.now()}`,
      clipId,
      username: user.username,
      text,
      createdAt: Date.now(),
    };
    const comments = [comment, ...get().comments];
    const clips = get().clips.map((c) =>
      c.id === clipId ? { ...c, comments: c.comments + 1 } : c,
    );
    set({ comments, clips });
    get().persist();
    get().toastMsg("Comentario publicado");
  },

  setTried: (clipId, value) => {
    set({ tried: { ...get().tried, [clipId]: value }, sheet: null });
    get().persist();
    get().toastMsg(
      value === "verified"
        ? "Tester verificado"
        : value === "casual"
          ? "Marcado como probado"
          : "Marcado como no probado",
    );
  },

  setUsed: (clipId, value) => {
    const user = get().user;
    set({
      tried: { ...get().tried, [clipId]: value === "yes" ? "casual" : "no" },
      sheet: null,
    });
    get().persist();
    if (firebaseConfigured && user) {
      void saveClipVote(clipId, user.id, { used: value }).catch((error: unknown) => {
        console.error("[firebase] Could not save clip survey vote.", error);
        get().toastMsg("No se pudo guardar tu respuesta");
      });
    }
  },

  voteWould: (clipId, value) => {
    const prev = get().would[clipId];
    const clips = get().clips.map((c) => {
      if (c.id !== clipId) return c;
      let wouldYes = c.wouldYes;
      let wouldNo = c.wouldNo;
      if (prev === "yes") wouldYes -= 1;
      if (prev === "no") wouldNo -= 1;
      if (value === "yes") wouldYes += 1;
      else wouldNo += 1;
      return { ...c, wouldYes, wouldNo };
    });
    set({ would: { ...get().would, [clipId]: value }, clips, sheet: null });
    get().persist();
    get().toastMsg("Voto registrado");
  },

  voteAdLike: (clipId, value) => {
    const user = get().user;
    if (firebaseConfigured && user) {
      set({ adLike: { ...get().adLike, [clipId]: value } });
      get().persist();
      void saveClipVote(clipId, user.id, { adLike: value }).catch((error: unknown) => {
        console.error("[firebase] Could not save ad survey vote.", error);
        get().toastMsg("No se pudo guardar tu respuesta");
      });
      return;
    }
    const prev = get().adLike[clipId];
    if (prev === value) return;
    const clips = get().clips.map((c) => {
      if (c.id !== clipId) return c;
      let adYes = c.adYes ?? 0;
      let adNo = c.adNo ?? 0;
      if (prev === "yes") adYes = Math.max(0, adYes - 1);
      if (prev === "no") adNo = Math.max(0, adNo - 1);
      if (value === "yes") adYes += 1;
      else adNo += 1;
      return { ...c, adYes, adNo };
    });
    set({ adLike: { ...get().adLike, [clipId]: value }, clips });
    get().persist();
  },

  voteFulfills: (clipId, value) => {
    const prev = get().fulfills[clipId];
    const weight = get().tried[clipId] === "verified" ? 3 : 1;
    const clips = get().clips.map((c) => {
      if (c.id !== clipId) return c;
      const next = { ...c };
      const sub = (k: "fulfillsYes" | "fulfillsMid" | "fulfillsNo") => {
        next[k] = Math.max(0, next[k] - weight);
      };
      if (prev === "yes") sub("fulfillsYes");
      if (prev === "mid") sub("fulfillsMid");
      if (prev === "no") sub("fulfillsNo");
      if (value === "yes") next.fulfillsYes += weight;
      if (value === "mid") next.fulfillsMid += weight;
      if (value === "no") next.fulfillsNo += weight;
      return next;
    });
    set({ fulfills: { ...get().fulfills, [clipId]: value }, clips, sheet: null });
    get().persist();
    get().toastMsg(
      get().tried[clipId] === "verified"
        ? "Veredicto con peso de tester"
        : "Veredicto registrado",
    );
  },

  hideClip: (clipId) => {
    set({
      hidden: [...new Set([...get().hidden, clipId])],
      sheet: null,
    });
    get().persist();
    get().toastMsg("Clip ocultado");
  },

  deletePublishedClip: async (clipId) => {
    const user = get().user;
    const clip = get().clips.find((entry) => entry.id === clipId);
    if (!user || (clip && clip.authorId !== user.id)) return;
    if (!clip && !firebaseConfigured) return;
    try {
      if (firebaseConfigured) await deleteSharedClip(clipId);
      set((s) => ({
        clips: s.clips.filter((entry) => entry.id !== clipId),
        products: s.products.filter((entry) => entry.id !== (clip?.productId ?? clipId)),
        remote: s.remote.filter((entry) => entry.clip.id !== clipId),
        comments: s.comments.filter((entry) => entry.clipId !== clipId),
        sheet: null,
      }));
      get().persist();
      get().toastMsg("Clip eliminado");
    } catch (error) {
      console.error("[firebase] Could not delete clip.", error);
      get().toastMsg("No se pudo eliminar el clip; revisa las reglas de Firestore");
    }
  },

  deleteAllPublishedClips: async () => {
    const user = get().user;
    if (!user) return;
    try {
      if (firebaseConfigured) await deleteAllSharedClips(user.id);
      const clipIds = new Set(
        get().clips.filter((clip) => clip.authorId === user.id).map((clip) => clip.id),
      );
      set((s) => ({
        clips: s.clips.filter((clip) => clip.authorId !== user.id),
        products: s.products.filter((product) => !clipIds.has(product.id)),
        remote: s.remote.filter((entry) => entry.authorId !== user.id),
        comments: s.comments.filter((comment) => !clipIds.has(comment.clipId)),
        sheet: null,
      }));
      get().persist();
      get().toastMsg("Tus clips publicados se eliminaron");
    } catch (error) {
      console.error("[firebase] Could not delete all clips.", error);
      get().toastMsg("No se pudieron eliminar tus clips; revisa las reglas de Firestore");
    }
  },

  shareClip: async (clipId) => {
    const clips = get().clips.map((c) =>
      c.id === clipId ? { ...c, shares: c.shares + 1 } : c,
    );
    set({ clips });
    get().persist();
    try {
      if (navigator.share) {
        await navigator.share({
          title: "clipsapp",
          text: "Mira este anuncio en clipsapp",
          url: location.href,
        });
      } else {
        set({ sheet: "share", sheetClipId: clipId });
      }
    } catch {
      get().toastMsg("Compartir cancelado");
    }
  },

  publishClip: (clip, product) => {
    const user = get().user;
    const located: Clip = { ...clip, country: user?.country, province: user?.province };
    set({
      clips: [located, ...get().clips],
      products: product ? [product, ...get().products] : get().products,
      activeClipId: clip.id,
      tab: "home",
      sheet: null,
    });
    get().persist();
    if (user && product && firebaseConfigured) {
      const avatar = user.avatarUrl;
      void publishSharedClip({
        authorId: user.id,
        clip: located,
        product,
        author: {
          username: user.username,
          displayName: user.displayName,
          avatarUrl: avatar || "/avatars/user.jpg",
          role: user.role,
          city: user.city,
          stripeAccountId: user.stripeAccountId,
        },
        createdAt: clip.createdAt,
      }).catch((error: unknown) => {
        console.error("[firebase] Could not share clip.", error);
        const code = (error as { code?: string }).code;
        get().toastMsg(
          code === "permission-denied"
            ? "Firebase rechazó el clip: publica las reglas de Firestore"
            : `No se pudo compartir el clip${code ? ` (${code})` : ""}`,
        );
      });
    }
    get().toastMsg("Clip publicado");
  },
}));

export { DEMO_USER };
