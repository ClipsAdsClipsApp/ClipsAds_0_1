import { remoteCreators } from "@/lib/creators-registry";
import { useApp } from "@/lib/store";
import type { AgeRange, Clip, Creator, Disclosure, Product } from "@/lib/types";
import { percent, resolveAvatar } from "@/lib/utils";

const EMPTY_PRODUCT: Product = {
  id: "",
  name: "Producto no disponible",
  brand: "",
  description: "",
  price: 0,
  currency: "EUR",
  category: "tech",
  city: "",
  distanceKm: 0,
  imageUrl: "",
  cta: "buy",
  ctaLabel: "Comprar",
  fulfills: 0,
  wouldBuy: 0,
  verifiedOpinions: 0,
  rating: 0,
  pros: [],
  cons: [],
  faq: [],
  alternatives: [],
  where: [],
};

export function creatorById(id: string) {
  const creator = remoteCreators.get(id);
  return {
    id,
    username: creator?.username ?? "usuario",
    displayName: creator?.displayName ?? "Usuario",
    avatarUrl: resolveAvatar(creator?.avatarUrl, creator?.displayName ?? "Usuario"),
    role: creator?.role ?? "user",
    city: creator?.city ?? "",
    bio: creator?.bio ?? "",
    followers: creator?.followers ?? 0,
    verified: creator?.verified ?? false,
    stripeAccountId: creator?.stripeAccountId,
  } satisfies Creator;
}

export function productById(id: string, extras: Product[] = []) {
  return extras.find((p) => p.id === id) ?? EMPTY_PRODUCT;
}

export function clipAuthor(id: string, me?: { id: string; username: string; displayName: string; avatarUrl: string; role: Creator["role"]; city: string } | null) {
  if (me && (id === "me-local" || id === me.id)) {
    return {
      id,
      username: me.username,
      displayName: me.displayName,
      avatarUrl: resolveAvatar(me.avatarUrl, me.displayName),
      role: me.role,
      city: me.city,
      bio: "Tu cuenta",
      followers: 0,
      verified: false,
    } satisfies Creator;
  }
  return creatorById(id);
}


export function useProduct(id: string) {
  const extras = useApp((s) => s.products);
  return productById(id, extras);
}

export function useAuthor(id: string) {
  const user = useApp((s) => s.user);
  return clipAuthor(id, user);
}

export function clipStats(clip: Clip) {
  const fTotal = clip.fulfillsYes + clip.fulfillsMid + clip.fulfillsNo;
  const wTotal = clip.wouldYes + clip.wouldNo;
  const adYes = clip.adYes ?? 0;
  const adNo = clip.adNo ?? 0;
  const adTotal = adYes + adNo;
  const adYesPct = adTotal ? Math.round((adYes / adTotal) * 100) : 0;
  return {
    fulfills: percent(clip.fulfillsYes + clip.fulfillsMid * 0.5, fTotal),
    wouldBuy: percent(clip.wouldYes, wTotal),
    verifiedWeight: fTotal,
    adYesPct,
    adNoPct: adTotal ? 100 - adYesPct : 0,
  };
}

export const ADULT_AGE_RANGES: AgeRange[] = ["18-24", "25-34", "35-44", "45-54", "55+"];

/** Los "me gusta" son los Sí a «¿Te gusta este anuncio?». */
export function clipLikes(clip: Clip, liveYes = 0) {
  return (clip.adYes ?? 0) + liveYes;
}

export function isClipAllowedFor(clip: Clip, viewer?: { id: string; ageRange: AgeRange } | null) {
  if (!clip.ageRanges?.length || !viewer) return true;
  return clip.authorId === viewer.id || clip.ageRanges.includes(viewer.ageRange);
}

export const DISCLOSURE_LABEL: Record<Disclosure, string> = {
  organic: "Opinión orgánica",
  verified_purchase: "Compra verificada",
  sponsored: "Contenido patrocinado",
  affiliate: "Enlace de afiliado",
  gifted: "Producto recibido",
  local: "Negocio local",
};

export const DISCLOSURE_HINT: Record<Disclosure, string> = {
  organic: "Nadie pagó esta reseña.",
  verified_purchase: "La compra o el ticket está comprobado.",
  sponsored: "La marca pagó este clip.",
  affiliate: "Si compras, la creadora puede recibir comisión.",
  gifted: "La marca envió el producto sin cobro.",
  local: "Comercio de proximidad verificado.",
};
