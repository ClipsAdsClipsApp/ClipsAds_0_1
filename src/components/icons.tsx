import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
  size?: number;
}

function Svg({
  className,
  size = 22,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconHome(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 10.5 12 4l8 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20z" />
      <path d="M9.5 21.5v-7h5v7" />
    </Svg>
  );
}

export function IconCompass(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.6 8.4-2 6.2-6.2 2 2-6.2z" />
    </Svg>
  );
}

export function IconPlusBox(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </Svg>
  );
}

export function IconClips(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="6" width="12" height="12" rx="3.2" />
      <rect x="8" y="8.5" width="12" height="12" rx="3.2" opacity=".45" />
      <path d="m10.6 10.8 4.4 2.6-4.4 2.6z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconUser(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8.2" r="3.2" />
      <path d="M5.5 19.2c1.2-3.1 3.4-4.6 6.5-4.6s5.3 1.5 6.5 4.6" />
    </Svg>
  );
}

/** Pulse spark — like / me gusta (not a heart). */
export function IconHeart({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...p}>
      <path
        d="M12 3.2 13.7 9.4 20 12 13.7 14.6 12 20.8 10.3 14.6 4 12 10.3 9.4z"
        fill={filled ? "currentColor" : "none"}
      />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Stacked clip-cards with dots — comments. */
export function IconComment(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4.2" y="7.2" width="12.2" height="11" rx="3.2" />
      <rect x="8" y="4.4" width="12.2" height="11" rx="3.2" opacity=".5" />
      <path
        d="M10.4 13.2h.2M13.1 13.2h.2M15.8 13.2h.2"
        strokeWidth="2.4"
      />
    </Svg>
  );
}

/** Paperclip — save / clip it. */
export function IconBookmark({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...p}>
      <path
        d="M9 10.2v5.4a3 3 0 0 0 6 0V8.4a2.2 2.2 0 1 0-4.4 0v6.8a1.15 1.15 0 0 0 2.3 0V10"
        strokeWidth={filled ? 2.4 : 1.75}
      />
    </Svg>
  );
}

/** Play-tile launching an arrow — share. */
export function IconShare(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.6" y="9.2" width="8.6" height="8.6" rx="2.4" />
      <path d="m10.8 10.6 8-8" />
      <path d="M13.2 2.6h6.2V8.8" />
    </Svg>
  );
}

export function IconMore(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="6" cy="12" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.35" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconCart(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 6.5h1.6l1.4 9.2h9.7l1.6-6.6H8" />
      <circle cx="10" cy="18.6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16.2" cy="18.6" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconSound({ muted, ...p }: IconProps & { muted?: boolean }) {
  return (
    <Svg {...p}>
      <path d="M4.5 9.5h3.2L12 6v12l-4.3-3.5H4.5z" />
      {muted ? (
        <path d="m16 10 4 4m0-4-4 4" />
      ) : (
        <>
          <path d="M15.3 9.2a3.4 3.4 0 0 1 0 5.6" />
          <path d="M17.6 7a6 6 0 0 1 0 10" />
        </>
      )}
    </Svg>
  );
}

export function IconPlay(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9 7.5 9 4.5-9 4.5z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m5.5 12.5 4.2 4.2 8.8-9.4" />
    </Svg>
  );
}

export function IconFlask(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 4h6M10 4v4.2L6.4 18.2A2.2 2.2 0 0 0 8.4 21h7.2a2.2 2.2 0 0 0 2-2.8L14 8.2V4" />
      <path d="M8.4 15h7.2" />
    </Svg>
  );
}

export function IconTarget(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconPin(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21s6.5-5.4 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.6 12 21 12 21z" />
      <circle cx="12" cy="10.4" r="2" />
    </Svg>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.2" />
      <path d="m16 16 3.4 3.4" />
    </Svg>
  );
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function IconShield(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5 19.5 6v6.2c0 4.4-3 6.8-7.5 8.3C8 19 5.5 16.6 5.5 12.2V6z" />
      <path d="m9 12 2.1 2.1L15.4 10" />
    </Svg>
  );
}

export function IconStar({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...p}>
      <path
        d="m12 3.6 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.3 7.2 18.5l.9-5.4-3.9-3.8 5.4-.8z"
        fill={filled ? "currentColor" : "none"}
      />
    </Svg>
  );
}

export function IconFlag(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 4v16M6 5h10l-2 3.5L16 12H6" />
    </Svg>
  );
}

export function IconEyeOff(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 12s3.2-6 8-6 8 6 8 6-3.2 6-8 6-8-6-8-6z" />
      <circle cx="12" cy="12" r="2.3" />
      <path d="m5 19 14-14" />
    </Svg>
  );
}

export function IconInfo(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8.2v.2" />
    </Svg>
  );
}

export function IconPhone(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 3.5h8A2.5 2.5 0 0 1 18.5 6v12a2.5 2.5 0 0 1-2.5 2.5H8A2.5 2.5 0 0 1 5.5 18V6A2.5 2.5 0 0 1 8 3.5z" />
      <path d="M10 18.5h4" />
    </Svg>
  );
}

export function IconChart(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 19h14" />
      <path d="M7 16v-4M12 16V8M17 16v-7" />
    </Svg>
  );
}

export function IconLogout(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 5h3.5A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M11 12H4.5M7 8.5 4.5 12 7 15.5" />
    </Svg>
  );
}

export function IconSpark(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5 13.6 9l5.9 1.6L13.6 12.2 12 17.5 10.4 12.2 4.5 10.6 10.4 9z" />
    </Svg>
  );
}

const ACTION_ICONS = {
  like: "/icons/like.png",
  comment: "/icons/comment.png",
  save: "/icons/save.png",
  share: "/icons/share.png",
  more: "/icons/more.png",
} as const;

export type ActionIconKind = keyof typeof ACTION_ICONS;

/** 3D glossy tile matching the clipsapp logo. */
export function BrandActionIcon({
  kind,
  active,
  size = 46,
  label,
}: {
  kind: ActionIconKind;
  active?: boolean;
  size?: number;
  label: string;
}) {
  return (
    <span
      className={cn(
        "relative grid place-items-center transition-transform duration-150",
        active && "scale-[1.05]",
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={ACTION_ICONS[kind]}
        alt={label}
        width={size}
        height={size}
        draggable={false}
        className={cn(
          "pointer-events-none size-full object-contain",
          active
            ? "drop-shadow-[0_0_12px_rgb(0_255_136_/_0.7)]"
            : "drop-shadow-[0_4px_10px_rgb(0_229_255_/_0.32)]",
        )}
      />
      {active ? (
        <span className="absolute right-0.5 bottom-0.5 grid size-3.5 place-items-center rounded-full bg-mint text-bg shadow-[0_0_8px_rgb(0_255_136_/_0.75)]">
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m5 12.5 4.2 4.2 9.2-10" />
          </svg>
        </span>
      ) : null}
    </span>
  );
}
