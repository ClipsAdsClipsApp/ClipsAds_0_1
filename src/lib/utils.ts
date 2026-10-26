import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function formatPrice(amount: number, currency: "EUR" | "USD") {
  return new Intl.NumberFormat(currency === "EUR" ? "es-ES" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function defaultAvatar(name: string) {
  const first = name.trim().charAt(0).toUpperCase();
  const letter = /^[A-Z0-9]$/.test(first) ? first : "?";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1a2a3f"/><text x="32" y="42" font-family="Arial,sans-serif" font-size="30" font-weight="700" text-anchor="middle" fill="#2ee6d6">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Los avatares demo antiguos (/avatars/*) ya no existen: se sustituyen por iniciales. */
export function resolveAvatar(url: string | null | undefined, name: string) {
  return url && !url.startsWith("/avatars/") ? url : defaultAvatar(name);
}
