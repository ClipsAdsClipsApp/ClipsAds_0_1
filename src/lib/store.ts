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
import { publishSharedClip, type SharedClipDoc } from "@/lib/firebase/clips";
import { remoteCreators } from "@/lib/creators-registry";
import { loadUserAppState, saveUserAppState } from "@/lib/firebase/user-state";

const KEY = "ClipsAds-state-v2";

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
  remote: SharedClipDoc[];
  setRemote: (docs: SharedClipDoc[]) => void;
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
  addComment: (clipId: string, text: string) => void;
  setTried: (clipId: string, value: "verified" | "casual" | "no") => void;
  setUsed: (clipId: string, value: "yes" | "no") => void;
  voteWould: (clipId: string, value: "yes" | "no") => void;
  voteAdLike: (clipId: string, value: "yes" | "no") => void;
  voteFulfills: (clipId: string, value: "yes" | "mid" | "no") => void;
  hideClip: (clipId: string) => void;
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
  remote: [],
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
    set({ user, tab: same ? get().tab : "home" });
    get().persist();
  },

  logout: () => {
    set({ user: null, tab: "home", sheet: null });
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

  addComment: (clipId, text) => {
    const user = get().user;
    if (!user) return;
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
    set({
      tried: { ...get().tried, [clipId]: value === "yes" ? "casual" : "no" },
      sheet: value === "no" ? "would" : null,
      sheetClipId: clipId,
    });
    get().persist();
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

  shareClip: async (clipId) => {
    const clips = get().clips.map((c) =>
      c.id === clipId ? { ...c, shares: c.shares + 1 } : c,
    );
    set({ clips });
    get().persist();
    try {
      if (navigator.share) {
        await navigator.share({
          title: "ClipsAds",
          text: "Mira este anuncio en ClipsAds",
          url: location.href,
        });
      } else {
        await navigator.clipboard.writeText(location.href);
        get().toastMsg("Enlace copiado");
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
          avatarUrl: /^(\/|https?:)/.test(avatar) ? avatar : "/avatars/user.jpg",
          role: user.role,
          city: user.city,
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
