import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  IconClips,
  IconClose,
  IconCompass,
  IconHome,
  IconPlusBox,
  IconUser,
} from "@/components/icons";
import { useApp } from "@/lib/store";
import type { Tab } from "@/lib/types";

export function LogoMark({ size = 38 }: { size?: number }) {
  return (
    <img
      src="/logo.jpg"
      alt="ClipsAds"
      width={size}
      height={size}
      className="rounded-[12px] border border-cyan/40 object-cover shadow-[0_4px_16px_rgb(0_229_255_/_0.28)]"
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-lg font-extrabold tracking-tight", className)}>
      clips<span className="text-cyan">Ads</span>
    </span>
  );
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-viewport">
      <div className="app-shell">
        {children}
      </div>
    </div>
  );
}

export function ToastHost() {
  const toast = useApp((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="toast-in pointer-events-none absolute bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-[12px] bg-fg px-3.5 py-2.5 text-center text-xs font-extrabold text-bg">
      {toast}
    </div>
  );
}

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="absolute inset-0 z-40 flex items-end bg-black/55 backdrop-blur-[4px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="rise-in max-h-[82%] w-full overflow-auto rounded-t-[25px] bg-surface px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-fg/20" />
        <div className="mb-3 flex items-center justify-between">
          {title ? <h3 className="font-display text-base font-semibold">{title}</h3> : <span />}
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-muted hover:bg-fg/5"
            aria-label="Cerrar"
          >
            <IconClose size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const NAV: { id: Tab; label: string; icon: typeof IconHome }[] = [
  { id: "home", label: "Inicio", icon: IconHome },
  { id: "explore", label: "Explorar", icon: IconCompass },
  { id: "create", label: "Publicar", icon: IconPlusBox },
  { id: "clips", label: "Mis clips", icon: IconClips },
  { id: "profile", label: "Perfil", icon: IconUser },
];

export function BottomNav() {
  const tab = useApp((s) => s.tab);
  const setTab = useApp((s) => s.setTab);
  return (
    <nav className="absolute bottom-0 left-1/2 z-20 flex w-[65%] -translate-x-1/2 justify-around rounded-t-[18px] border border-line border-b-0 bg-bg/36 px-1 pb-[calc(6px+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl">
      {NAV.map((item) => {
        const on = tab === item.id;
        const Icon = item.icon;
        const isCreate = item.id === "create";
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-1 text-[10px] font-semibold",
              on ? "text-fg" : "text-subtle",
            )}
          >
            <span
              className={cn(
                "grid size-10 place-items-center rounded-[14px]",
                isCreate && "border border-cyan text-cyan",
                on && !isCreate && "text-cyan",
              )}
            >
              <Icon size={isCreate ? 22 : 21} />
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export function OptionButton({
  children,
  onClick,
  variant = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "default" | "primary" | "mint" | "ghost";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-2 w-full rounded-[13px] px-3.5 py-3.5 text-left text-sm font-semibold transition-transform duration-150 active:scale-[0.98]",
        variant === "default" && "border border-line bg-surface-2 text-fg",
        variant === "primary" && "bg-cyan text-bg",
        variant === "mint" && "bg-mint text-bg",
        variant === "ghost" && "bg-fg/5 text-muted",
      )}
    >
      {children}
    </button>
  );
}
