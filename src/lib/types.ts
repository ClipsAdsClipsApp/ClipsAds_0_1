export type Role = "user" | "creator" | "business";
export type Gender = "woman" | "man" | "nonbinary" | "prefer_not";
export type AgeRange = "18-24" | "25-34" | "35-44" | "45-54" | "55+";
export type Currency = "EUR" | "USD";
export type Tab = "home" | "explore" | "create" | "clips" | "profile";
export type FeedMode = "for-you" | "discover";
export type CtaKind = "buy" | "book" | "call" | "directions" | "quote";
export type Disclosure =
  | "organic"
  | "verified_purchase"
  | "sponsored"
  | "affiliate"
  | "gifted"
  | "local";

export type CategoryId =
  | "tech"
  | "food"
  | "beauty"
  | "baby"
  | "home"
  | "leisure"
  | "sport"
  | "restaurants"
  | "fashion";

export type SheetKind =
  | "comments"
  | "tried"
  | "would"
  | "cta"
  | "more"
  | "why"
  | "product"
  | "privacy"
  | null;

export interface Category {
  id: CategoryId;
  name: string;
  blurb: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  role: Role;
  bio: string;
  ageRange: AgeRange;
  gender: Gender;
  city: string;
  interests: CategoryId[];
  personalizeAds: boolean;
  approximateLocation: boolean;
}

export interface Creator {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  role: Role;
  city: string;
  bio: string;
  followers: number;
  verified: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  currency: Currency;
  category: CategoryId;
  city: string;
  distanceKm: number;
  imageUrl: string;
  purchaseUrl?: string;
  address?: string;
  phone?: string;
  cta: CtaKind;
  ctaLabel: string;
  fulfills: number;
  wouldBuy: number;
  verifiedOpinions: number;
  rating: number;
  pros: string[];
  cons: string[];
  faq: { q: string; a: string }[];
  alternatives: string[];
  where: string[];
}

export interface Comment {
  id: string;
  clipId: string;
  username: string;
  text: string;
  createdAt: number;
}

export interface Clip {
  id: string;
  videoUrl?: string;
  posterUrl: string;
  caption: string;
  authorId: string;
  productId: string;
  disclosure: Disclosure;
  daysUsed?: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  fulfillsYes: number;
  fulfillsMid: number;
  fulfillsNo: number;
  wouldYes: number;
  wouldNo: number;
  adYes?: number;
  adNo?: number;
  local: boolean;
  sponsored: boolean;
  createdAt: number;
}

export interface Review {
  id: string;
  productId: string;
  username: string;
  rating: number;
  text: string;
  verified: boolean;
  daysUsed?: number;
}
