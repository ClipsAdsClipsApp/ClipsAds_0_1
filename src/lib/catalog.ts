import { CREATORS, PRODUCTS } from "@/lib/seed";
import { useApp } from "@/lib/store";
import type { Clip, Creator, Disclosure, Product } from "@/lib/types";
import { percent } from "@/lib/utils";

export function creatorById(id: string) {
  return CREATORS.find((c) => c.id === id) ?? CREATORS[0];
}

export function productById(id: string, extras: Product[] = []) {
  return extras.find((p) => p.id === id) ?? PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];
}

export function clipAuthor(id: string, me?: { username: string; displayName: string; avatarUrl: string; role: Creator["role"]; city: string } | null) {
  if (id === "me-local" && me) {
    return {
      id: "me-local",
      username: me.username,
      displayName: me.displayName,
      avatarUrl: me.avatarUrl,
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
