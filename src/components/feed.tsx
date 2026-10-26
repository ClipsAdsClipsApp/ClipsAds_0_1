import { useEffect, useRef, useState, type ReactNode } from "react";
import { BarChart3, Copy, LoaderCircle, Mail, MessageCircle, Minus, Plus, Send } from "lucide-react";
import { BottomNav, LogoMark, OptionButton, Sheet, Wordmark } from "@/components/chrome";
import {
  BrandActionIcon,
  IconCart,
  IconInfo,
  IconPhone,
  IconPin,
  IconPlay,
  IconSound,
} from "@/components/icons";
import { clipStats, DISCLOSURE_HINT, DISCLOSURE_LABEL, productById, useAuthor, useProduct } from "@/lib/catalog";
import { firebaseConfigured } from "@/lib/firebase/client";
import { subscribeClipComments, subscribeClipVotes } from "@/lib/firebase/clips";
import { useApp } from "@/lib/store";
import { CommunityInsightsModal } from "@/components/product-feedback";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { Clip, CtaKind, Disclosure, Product } from "@/lib/types";
import { cn, formatCount, formatPrice } from "@/lib/utils";

export function Feed() {
  const clips = useApp((s) => s.clips);
  const hidden = useApp((s) => s.hidden);
  const user = useApp((s) => s.user);
  const feedMode = useApp((s) => s.feedMode);
  const setFeedMode = useApp((s) => s.setFeedMode);
  const setActiveClip = useApp((s) => s.setActiveClip);
  const activeClipId = useApp((s) => s.activeClipId);
  const soundOn = useApp((s) => s.soundOn);
  const toggleSound = useApp((s) => s.toggleSound);
  const setTab = useApp((s) => s.setTab);
  const scroller = useRef<HTMLDivElement>(null);

  const products = useApp((s) => s.products);
  const visible = clips.filter((c) => {
    if (hidden.includes(c.id)) return false;
    if (feedMode === "discover") return true;
    if (
      c.province &&
      user?.province &&
      (c.country !== user.country || c.province !== user.province)
    ) {
      return false;
    }
    if (c.province && c.province === user?.province) return true;
    if (c.id.startsWith("mine-")) return true;
    if (!user?.personalizeAds) return true;
    const product = productById(c.productId, products);
    if (user.interests.length && !user.interests.includes(product.category)) {
      if (user.approximateLocation && product.city === user.city) return true;
      return false;
    }
    return true;
  });

  const list = visible.length ? visible : clips.filter((c) => !hidden.includes(c.id));

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const idx = list.findIndex((c) => c.id === activeClipId);
    if (idx > 0) {
      const child = el.children[idx] as HTMLElement | undefined;
      child?.scrollIntoView({ block: "start" });
    }
  }, [list, activeClipId]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const nodes = [...el.querySelectorAll("[data-clip]")];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = (top?.target as HTMLElement | undefined)?.dataset.clip;
        if (id) setActiveClip(id);
      },
      { root: el, threshold: 0.65 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [list, setActiveClip]);

  const activeClip = list.find((c) => c.id === activeClipId) ?? list[0];
  const headerAuthor = useAuthor(activeClip?.authorId ?? "ana");
  const following = useApp((s) => s.following);
  const toggleFollow = useApp((s) => s.toggleFollow);

  return (
    <div className="relative h-full bg-black">
      <div ref={scroller} className="feed-snap scrollbar-none h-full overflow-y-auto">
        {list.map((clip) => (
          <ClipSlide key={clip.id} clip={clip} active={clip.id === activeClipId} />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[calc(8px+env(safe-area-inset-top))] z-10 px-3">
        <div className="flex items-start justify-between">
          <div className="pointer-events-auto flex items-center gap-1.5">
            <LogoMark size={34} />
            <Wordmark />
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              className="grid size-10 place-items-center rounded-full border border-line bg-bg-elevated/80 text-fg backdrop-blur-md"
              aria-label={soundOn ? "Silenciar" : "Activar sonido"}
            >
              <IconSound muted={!soundOn} size={18} />
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => setTab("profile")}
                aria-label="Abrir mi perfil"
                className="flex max-w-[150px] items-center gap-1.5 rounded-full border border-line bg-bg-elevated/80 py-1 pr-3 pl-1 backdrop-blur-md"
              >
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="size-8 shrink-0 rounded-full border-2 border-cyan object-cover"
                />
                <span className="truncate text-xs font-extrabold">@{user.username}</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="pointer-events-auto mt-1 flex justify-center">
          <div className="flex gap-1 rounded-full bg-black/35 p-1 backdrop-blur-md">
            <ModeChip on={feedMode === "for-you"} onClick={() => setFeedMode("for-you")}>
              Para ti
            </ModeChip>
            <ModeChip on={feedMode === "discover"} onClick={() => setFeedMode("discover")}>
              Descubre
            </ModeChip>
          </div>
        </div>

        {activeClip ? (
          <div className="pointer-events-auto mt-2 flex w-max max-w-[240px] items-center gap-2 rounded-full border border-line bg-bg-elevated/80 py-1 pr-2 pl-1 backdrop-blur-md">
            <img
              src={headerAuthor.avatarUrl}
              alt=""
              className="size-8 rounded-full border-2 border-cyan object-cover"
            />
            <div className="truncate text-xs font-extrabold">@{headerAuthor.username}</div>
            <button
              type="button"
              onClick={() => toggleFollow(headerAuthor.id)}
              className={cn(
                "rounded-[10px] px-2 py-1 text-[10px] font-extrabold",
                following.includes(headerAuthor.id)
                  ? "bg-fg/15 text-fg"
                  : "bg-gradient-to-br from-cyan to-mint text-bg",
              )}
            >
              {following.includes(headerAuthor.id) ? "Siguiendo" : "Seguir"}
            </button>
          </div>
        ) : null}
      </div>

      <BottomNav />
      <ClipSheets />
    </div>
  );
}

function ModeChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-bold",
        on ? "bg-fg text-bg" : "text-fg/80",
      )}
    >
      {children}
    </button>
  );
}

function ClipSlide({ clip, active }: { clip: Clip; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const soundOn = useApp((s) => s.soundOn);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !soundOn;
    if (active && !paused) {
      v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  }, [active, soundOn, paused, clip.videoUrl]);

  return (
    <section data-clip={clip.id} className="relative h-full min-h-full w-full">
      {clip.videoUrl ? (
        <video
          ref={videoRef}
          src={clip.videoUrl}
          poster={clip.posterUrl}
          loop
          playsInline
          muted={!soundOn}
          className="absolute inset-0 h-full w-full object-cover"
          onClick={() => setPaused((p) => !p)}
        />
      ) : (
        <img
          src={clip.posterUrl}
          alt=""
          className={cn("absolute inset-0 h-full w-full object-cover", active && "kenburns")}
          onClick={() => setPaused((p) => !p)}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(#000b,transparent_18%,transparent_58%,#000a_100%)]" />
      {paused ? (
        <button
          type="button"
          className="absolute left-1/2 top-1/2 z-10 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-fg"
          onClick={() => setPaused(false)}
          aria-label="Reproducir"
        >
          <IconPlay size={28} />
        </button>
      ) : null}

      <ClipOverlay clip={clip} active={active} />
    </section>
  );
}

function ClipOverlay({ clip, active }: { clip: Clip; active: boolean }) {
  const userId = useApp((s) => s.user?.id);
  const clipVotes = useApp((s) => s.clipVotes[clip.id]);
  const setClipVotes = useApp((s) => s.setClipVotes);
  const product = useProduct(clip.productId);
  const saved = useApp((s) => s.saved);
  const toggleSave = useApp((s) => s.toggleSave);
  const openSheet = useApp((s) => s.openSheet);
  const shareClip = useApp((s) => s.shareClip);
  const setUsed = useApp((s) => s.setUsed);
  const tried = useApp((s) => s.tried[clip.id]);
  const stats = clipStats({
    ...clip,
    adYes: (clip.adYes ?? 0) + (clipVotes?.adYes ?? 0),
    adNo: (clip.adNo ?? 0) + (clipVotes?.adNo ?? 0),
  });
  const voteAdLike = useApp((s) => s.voteAdLike);
  const localAd = useApp((s) => s.adLike[clip.id]);
  const myAd = clipVotes ? clipVotes.myAdLike : localAd;
  const isSaved = saved.includes(clip.id);
  const myUsed = clipVotes
    ? clipVotes.myUsed
    : tried === "casual" || tried === "verified"
      ? "yes"
      : tried === "no"
        ? "no"
        : undefined;
  const usedTotal = (clipVotes?.usedYes ?? 0) + (clipVotes?.usedNo ?? 0);
  const usedYesPct = usedTotal ? Math.round(((clipVotes?.usedYes ?? 0) / usedTotal) * 100) : 0;
  const usedNoPct = usedTotal ? 100 - usedYesPct : 0;
  const usedYes = myUsed === "yes";
  const usedNo = myUsed === "no";

  useEffect(() => {
    if (!active || !userId || !firebaseConfigured) return;
    return subscribeClipVotes(
      clip.id,
      userId,
      (summary) => setClipVotes(clip.id, summary),
      (error) => {
        console.error("[firebase] Could not load clip votes.", error);
      },
    );
  }, [active, clip.id, setClipVotes, userId]);

  return (
    <>
      <div className="absolute right-1.5 bottom-[230px] z-10 flex flex-col items-center gap-1.5">
        <Action
          name="Comentarios"
          label={formatCount(clip.comments)}
          onClick={() => openSheet("comments", clip.id)}
        >
          <BrandActionIcon kind="comment" label="Comentarios" />
        </Action>
        <Action
          name="Guardar"
          label={formatCount(clip.saves)}
          active={isSaved}
          onClick={() => toggleSave(clip.id)}
        >
          <BrandActionIcon kind="save" active={isSaved} label="Guardar" />
        </Action>
        <Action name="Compartir" label={formatCount(clip.shares)} onClick={() => void shareClip(clip.id)}>
          <BrandActionIcon kind="share" label="Compartir" />
        </Action>
        <Action name="Más opciones" label="" onClick={() => openSheet("more", clip.id)}>
          <BrandActionIcon kind="more" size={42} label="Más" />
        </Action>
      </div>

      <div className="absolute inset-x-3 bottom-[62px] z-10 rounded-[16px] border border-line bg-[#121218]/31 px-2.5 py-1 backdrop-blur-xl">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => openSheet("product", clip.id)}
        >
          <div className="truncate font-display text-[12px] font-extrabold leading-tight">
            {product.name}
          </div>
          <div className="truncate text-[9px] text-muted">
            {product.brand} · {formatPrice(product.price, product.currency)}
            {product.city ? ` · ${product.city}` : ""}
          </div>
        </button>

        <div className="mt-1 flex items-center gap-1">
          <p className="min-w-0 flex-1 text-[9px] font-extrabold leading-tight">
            ¿Te gusta este anuncio?
          </p>
          <AdVote
            label="Sí"
            pct={stats.adYesPct}
            on={myAd === "yes"}
            onClick={() => voteAdLike(clip.id, "yes")}
          />
          <AdVote
            label="No"
            pct={stats.adNoPct}
            on={myAd === "no"}
            onClick={() => voteAdLike(clip.id, "no")}
          />
        </div>

        <div className="mt-1 flex items-center gap-1">
          <p className="min-w-0 flex-1 text-[9px] font-extrabold leading-tight">
            ¿Lo usarías?
          </p>
          <Choice label={`Sí ${usedYesPct}%`} on={usedYes} onClick={() => setUsed(clip.id, "yes")} />
          <Choice label={`No ${usedNoPct}%`} on={usedNo} onClick={() => setUsed(clip.id, "no")} />
        </div>

        <button
          type="button"
          onClick={() => openSheet("cta", clip.id)}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-gradient-to-br from-mint to-cyan py-1 text-[11px] font-extrabold text-bg"
        >
          <CtaIcon kind={product.cta} />
          {product.ctaLabel}
        </button>
      </div>
    </>
  );
}

function CtaIcon({ kind }: { kind: CtaKind }) {
  if (kind === "directions") return <IconPin size={14} />;
  if (kind === "call") return <IconPhone size={14} />;
  if (kind === "book") return <IconPhone size={14} />;
  return <IconCart size={14} />;
}

function Action({
  name,
  label,
  children,
  onClick,
  active,
}: {
  name: string;
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name}
      aria-pressed={active}
      className="flex flex-col items-center gap-px text-[10px] font-extrabold text-fg"
    >
      {children}
      {label ? (
        <span className="tabular-nums drop-shadow-[0_1px_3px_#000]">{label}</span>
      ) : null}
    </button>
  );
}

function MetricChip({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: "mint" | "pink";
}) {
  return (
    <div className="min-w-[48px] rounded-[10px] bg-black/55 px-1.5 py-1 text-center">
      <b
        className={cn(
          "block text-[12px] leading-none tabular-nums",
          accent === "mint" ? "text-mint" : "text-pink",
        )}
      >
        {value}
      </b>
      <small className="text-[8px] font-bold uppercase tracking-wide text-subtle">{label}</small>
    </div>
  );
}

function Choice({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "shrink-0 rounded-full border px-3 py-0.5 text-[9px] font-extrabold",
        on ? "border-mint bg-mint text-bg" : "border-white/15 bg-black/40 text-fg",
      )}
    >
      {label}
    </button>
  );
}

function AdVote({
  label,
  pct,
  on,
  onClick,
}: {
  label: string;
  pct: number;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-extrabold tabular-nums",
        on
          ? "border-mint bg-mint text-bg"
          : "border-white/15 bg-black/40 text-fg",
      )}
    >
      {label} {pct}%
    </button>
  );
}

function ClipSheets() {
  const sheet = useApp((s) => s.sheet);
  const clipId = useApp((s) => s.sheetClipId);
  const clips = useApp((s) => s.clips);
  const closeSheet = useApp((s) => s.closeSheet);
  const clip = clips.find((c) => c.id === clipId) ?? clips[0];
  const product = useProduct(clip?.productId ?? "headphones");
  const author = useAuthor(clip?.authorId ?? "ana");
  if (!clip) return null;

  return (
    <>
      <Sheet open={sheet === "tried"} title="¿Lo has probado?" onClose={closeSheet}>
        <TriedSheet clipId={clip.id} />
      </Sheet>
      <Sheet open={sheet === "would"} title="¿Lo comprarías?" onClose={closeSheet}>
        <WouldSheet clipId={clip.id} />
      </Sheet>
      <Sheet open={sheet === "comments"} title="Comentarios" onClose={closeSheet}>
        <CommentsSheet clipId={clip.id} />
      </Sheet>
      <Sheet open={sheet === "share"} title="Compartir clip" onClose={closeSheet}>
        <ShareSheet />
      </Sheet>
      <Sheet open={sheet === "cta"} title={product.ctaLabel} onClose={closeSheet}>
        <CtaSheet clip={clip} />
      </Sheet>
      <Sheet open={sheet === "more"} title="Opciones del clip" onClose={closeSheet}>
        <MoreSheet clip={clip} />
      </Sheet>
      <Sheet open={sheet === "why"} title="¿Por qué ves este clip?" onClose={closeSheet}>
        <WhySheet clip={clip} />
      </Sheet>
      <Sheet open={sheet === "product"} title="Ficha social" onClose={closeSheet}>
        <ProductSheet clip={clip} disclosure={clip.disclosure} author={author.displayName} />
      </Sheet>
    </>
  );
}

function ShareSheet() {
  const toastMsg = useApp((s) => s.toastMsg);
  const closeSheet = useApp((s) => s.closeSheet);
  const url = typeof window === "undefined" ? "" : window.location.href;
  const message = `Mira este anuncio en ClipsApp: ${url}`;
  const options = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(message)}`,
      icon: MessageCircle,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent("Mira este anuncio en ClipsApp")}`,
      icon: Send,
    },
    {
      label: "Correo",
      href: `mailto:?subject=${encodeURIComponent("ClipsApp")}&body=${encodeURIComponent(message)}`,
      icon: Mail,
    },
  ];

  return (
    <div className="space-y-2">
      {options.map(({ label, href, icon: Icon }) => (
        <a
          key={label}
          href={href}
          target={label === "Correo" ? undefined : "_blank"}
          rel="noreferrer"
          onClick={closeSheet}
          className="flex w-full items-center gap-3 rounded-[13px] border border-line bg-surface-2 px-3.5 py-3.5 text-sm font-semibold text-fg"
        >
          <Icon size={18} />
          {label}
        </a>
      ))}
      <OptionButton
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            toastMsg("Enlace copiado");
            closeSheet();
          } catch {
            toastMsg("No se pudo copiar el enlace");
          }
        }}
      >
        <span className="flex items-center gap-3">
          <Copy size={18} /> Copiar enlace
        </span>
      </OptionButton>
    </div>
  );
}

function TriedSheet({ clipId }: { clipId: string }) {
  const setTried = useApp((s) => s.setTried);
  return (
    <>
      <OptionButton variant="primary" onClick={() => setTried(clipId, "verified")}>
        Sí, tester verificado
      </OptionButton>
      <OptionButton onClick={() => setTried(clipId, "casual")}>Sí, uso casual</OptionButton>
      <OptionButton onClick={() => setTried(clipId, "no")}>No lo he probado</OptionButton>
      <OptionButton variant="ghost" onClick={() => useApp.getState().closeSheet()}>
        Cancelar
      </OptionButton>
    </>
  );
}

function WouldSheet({ clipId }: { clipId: string }) {
  const voteWould = useApp((s) => s.voteWould);
  return (
    <>
      <p className="mb-3 text-xs text-muted">Aún no lo has usado. ¿Lo comprarías?</p>
      <OptionButton variant="primary" onClick={() => voteWould(clipId, "yes")}>
        Sí, lo compraría
      </OptionButton>
      <OptionButton onClick={() => voteWould(clipId, "no")}>No lo compraría</OptionButton>
    </>
  );
}

function CommentsSheet({ clipId }: { clipId: string }) {
  const sheet = useApp((s) => s.sheet);
  const allComments = useApp((s) => s.comments);
  const comments = allComments.filter((c) => c.clipId === clipId);
  const addComment = useApp((s) => s.addComment);
  const setSharedComments = useApp((s) => s.setSharedComments);
  const toastMsg = useApp((s) => s.toastMsg);
  const [text, setText] = useState("");

  useEffect(() => {
    if (sheet !== "comments" || !firebaseConfigured) return;
    return subscribeClipComments(
      clipId,
      (sharedComments) => setSharedComments(clipId, sharedComments),
      (error) => {
        console.error("[firebase] Could not load clip comments.", error);
        toastMsg("No se pudieron cargar los comentarios");
      },
    );
  }, [clipId, setSharedComments, sheet, toastMsg]);

  return (
    <>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          void addComment(clipId, text.trim());
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={160}
          placeholder="Escribe un comentario..."
          className="flex-1 rounded-[14px] border border-line bg-bg-elevated px-3 py-3 text-sm outline-none focus:border-cyan"
        />
        <button
          type="submit"
          className="rounded-[13px] bg-cyan px-3.5 text-sm font-extrabold text-bg"
        >
          Enviar
        </button>
      </form>
      <div className="space-y-2">
        {comments.map((c) => (
          <div key={c.id} className="rounded-xl border border-line bg-bg-elevated p-3">
            <b className="text-xs">@{c.username}</b>
            <p className="text-[12px] text-muted">{c.text}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function CtaSheet({ clip }: { clip: Clip }) {
  const product = useProduct(clip.productId);
  const toastMsg = useApp((s) => s.toastMsg);
  const closeSheet = useApp((s) => s.closeSheet);
  const author = useAuthor(clip.authorId);
  if (product.cta === "buy") {
    const external = product.purchaseMode === "external" || (!product.purchaseMode && Boolean(product.purchaseUrl));
    if (external) {
      return product.purchaseUrl ? (
        <ExternalLinkPanel url={product.purchaseUrl} label={`Tienda de ${product.brand}`} onClose={closeSheet} />
      ) : (
        <p className="py-6 text-center text-sm text-muted">El vendedor aún no añadió el enlace de compra.</p>
      );
    }
    return (
      <DirectPurchasePanel
        clip={clip}
        product={product}
        sellerConnected={Boolean(author.stripeAccountId || product.sellerStripeAccountId)}
      />
    );
  }
  if (product.cta === "book") {
    if (product.bookingUrl) {
      return <ExternalLinkPanel url={product.bookingUrl} label={`Reservas de ${product.brand}`} onClose={closeSheet} />;
    }
    return (
      <>
        <p className="py-6 text-center text-sm text-muted">
          Este comercio todavía no habilitó reservas en línea.
        </p>
        <OptionButton variant="ghost" onClick={closeSheet}>
          Cerrar
        </OptionButton>
      </>
    );
  }
  if (product.cta === "call") {
    return (
      <>
        <OptionButton
          variant="primary"
          onClick={() => {
            toastMsg(`Llamada simulada a ${product.phone}`);
            closeSheet();
          }}
        >
          Llamar {product.phone}
        </OptionButton>
        <OptionButton variant="ghost" onClick={closeSheet}>
          Cancelar
        </OptionButton>
      </>
    );
  }
  if (product.cta === "contact") {
    return product.contactUrl ? (
      <ExternalLinkPanel url={product.contactUrl} label={`Contacto de ${product.brand}`} onClose={closeSheet} />
    ) : (
      <p className="py-6 text-center text-sm text-muted">El vendedor aún no añadió un enlace de contacto.</p>
    );
  }
  if (product.cta === "offer") {
    return (
      <OfferPanel product={product} onClose={closeSheet} />
    );
  }
  return (
    <>
      <p className="mb-3 text-xs text-muted">{product.address}</p>
      <OptionButton
        variant="primary"
        onClick={() => {
          const query = [product.address, product.city].filter(Boolean).join(", ");
          window.open(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
            "_blank",
            "noopener,noreferrer",
          );
          closeSheet();
        }}
      >
        Cómo llegar
      </OptionButton>
      <OptionButton variant="ghost" onClick={closeSheet}>
        Cerrar
      </OptionButton>
    </>
  );
}

function ExternalLinkPanel({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-line bg-bg-elevated">
        <iframe
          src={url}
          title={label}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox"
          className="h-[52dvh] min-h-64 w-full bg-white"
        />
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-xs font-semibold text-muted">
        <IconInfo size={14} /> Si la tienda bloquea la vista integrada, abrir en el navegador
      </a>
      <OptionButton variant="ghost" onClick={onClose}>Volver a ClipsApp</OptionButton>
    </div>
  );
}

function DirectPurchasePanel({
  clip,
  product,
  sellerConnected,
}: {
  clip: Clip;
  product: Product;
  sellerConnected: boolean;
}) {
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    const firebaseUser = getFirebaseAuth().currentUser;
    if (!firebaseUser) {
      setError("Inicia sesión para realizar la compra.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          authorization: `Bearer ${await firebaseUser.getIdToken()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ clipId: clip.id, quantity, size }),
      });
      const result = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "No se pudo iniciar el pago.");
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar el pago seguro.");
    } finally {
      setBusy(false);
    }
  }

  const availableSizes = product.sizeOptions ?? [];
  const total = product.price * quantity;

  return (
    <div className="space-y-3">
      <div className="flex gap-3 rounded-xl border border-line bg-bg-elevated p-3">
        <img src={product.imageUrl} alt="" className="size-20 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0 self-center">
          <p className="truncate text-sm font-bold">{product.name}</p>
          <p className="text-xs text-muted">{product.brand}</p>
          <p className="mt-1 text-sm font-extrabold text-mint">{formatPrice(product.price, product.currency)}</p>
        </div>
      </div>
      {availableSizes.length ? (
        <label className="block text-xs font-bold text-muted">
          Talla u opción
          <select value={size} onChange={(event) => setSize(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-3 text-sm text-fg">
            <option value="">Selecciona una opción</option>
            {availableSizes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      ) : null}
      <div className="flex items-center justify-between rounded-xl border border-line bg-bg-elevated px-3 py-2">
        <span className="text-xs font-bold">Cantidad</span>
        <div className="flex items-center gap-3">
          <button type="button" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Reducir cantidad" className="grid size-8 place-items-center rounded-lg border border-line disabled:opacity-40"><Minus size={14} /></button>
          <span className="min-w-5 text-center text-sm font-bold tabular-nums">{quantity}</span>
          <button type="button" disabled={quantity >= 10} onClick={() => setQuantity((value) => Math.min(10, value + 1))} aria-label="Aumentar cantidad" className="grid size-8 place-items-center rounded-lg border border-line disabled:opacity-40"><Plus size={14} /></button>
        </div>
      </div>
      {!sellerConnected ? <p className="text-xs text-muted">El vendedor debe conectar Stripe Connect para aceptar pagos.</p> : null}
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
      <button
        type="button"
        onClick={() => void checkout()}
        disabled={busy || !sellerConnected || Boolean(availableSizes.length && !size)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-mint to-cyan px-3 py-3 text-sm font-extrabold text-bg disabled:opacity-45"
      >
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : <IconCart size={16} />}
        {busy ? "Conectando con Stripe…" : `Pagar ${formatPrice(total, product.currency)}`}
      </button>
      <p className="text-center text-[10px] text-subtle">Pago seguro de Stripe. Apple Pay o Google Pay aparecerán si Stripe y el dispositivo los admiten.</p>
    </div>
  );
}

function OfferPanel({ product, onClose }: { product: Product; onClose: () => void }) {
  const toastMsg = useApp((state) => state.toastMsg);
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-bg-elevated p-4 text-center">
        <p className="text-xs text-muted">{product.offerDetails || "Usa este código en el comercio"}</p>
        <p className="mt-2 font-display text-2xl font-extrabold tracking-wider text-mint">{product.offerCode || "Oferta"}</p>
      </div>
      <OptionButton variant="mint" onClick={() => {
        void navigator.clipboard.writeText(product.offerCode ?? "").then(() => toastMsg("Cupón copiado"));
      }}>
        Copiar código
      </OptionButton>
      {product.purchaseUrl ? <ExternalLinkPanel url={product.purchaseUrl} label={`Oferta de ${product.brand}`} onClose={onClose} /> : null}
      <OptionButton variant="ghost" onClick={onClose}>Cerrar</OptionButton>
    </div>
  );
}

function MoreSheet({ clip }: { clip: Clip }) {
  const hideClip = useApp((s) => s.hideClip);
  const toastMsg = useApp((s) => s.toastMsg);
  const closeSheet = useApp((s) => s.closeSheet);
  const openSheet = useApp((s) => s.openSheet);
  return (
    <>
      <OptionButton onClick={() => openSheet("why", clip.id)}>
        <span className="flex items-center gap-2">
          <IconInfo size={16} /> Por qué veo este clip
        </span>
      </OptionButton>
      <OptionButton
        onClick={() => {
          toastMsg("Marcado como interesante");
          closeSheet();
        }}
      >
        Marcar como interesante
      </OptionButton>
      <OptionButton onClick={() => hideClip(clip.id)}>No me interesa</OptionButton>
      <OptionButton
        onClick={() => {
          toastMsg("Reporte enviado");
          closeSheet();
        }}
      >
        Reportar
      </OptionButton>
      <OptionButton variant="ghost" onClick={closeSheet}>
        Cancelar
      </OptionButton>
    </>
  );
}

function WhySheet({ clip }: { clip: Clip }) {
  const user = useApp((s) => s.user);
  const product = useProduct(clip.productId);
  return (
    <ul className="space-y-2 text-sm text-muted">
      <li className="rounded-xl border border-line bg-bg-elevated p-3">
        Categoría: {product.category} · {DISCLOSURE_LABEL[clip.disclosure]}
      </li>
      <li className="rounded-xl border border-line bg-bg-elevated p-3">
        {user?.personalizeAds
          ? "Personalización activada según tus intereses."
          : "Ves el feed abierto porque desactivaste la personalización."}
      </li>
      <li className="rounded-xl border border-line bg-bg-elevated p-3">
        Ubicación aproximada: {user?.city ?? "Parla"}. Distancia estimada {product.distanceKm} km.
      </li>
      <li className="rounded-xl border border-line bg-bg-elevated p-3">
        {DISCLOSURE_HINT[clip.disclosure]}
      </li>
    </ul>
  );
}

function ProductSheet({
  clip,
  disclosure,
  author,
}: {
  clip: Clip;
  disclosure: Disclosure;
  author: string;
}) {
  const [insightsOpen, setInsightsOpen] = useState(false);
  const product = useProduct(clip.productId);
  const stats = clipStats(clip);
  return (
    <div className="space-y-3">
      <img src={product.imageUrl} alt="" className="h-36 w-full rounded-2xl object-cover" />
      <div>
        <h4 className="font-display text-lg font-bold">{product.name}</h4>
        <p className="text-sm text-muted">
          {product.brand} · {formatPrice(product.price, product.currency)}
        </p>
        <p className="mt-1 text-xs font-semibold text-cyan">
          {author} · {DISCLOSURE_LABEL[disclosure]}
        </p>
      </div>
      <p className="text-sm text-muted">{product.description}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Mini stat={`${stats.fulfills}%`} label="Cumple" />
        <Mini stat={`${stats.wouldBuy}%`} label="Compraría" />
        <Mini stat={`${product.verifiedOpinions}`} label="Verificadas" />
      </div>
      <button
        type="button"
        onClick={() => setInsightsOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-xs font-semibold text-muted transition-colors hover:text-fg"
      >
        <BarChart3 size={15} /> Opinión de la comunidad
      </button>
      <CommunityInsightsModal
        open={insightsOpen}
        productId={product.id}
        productName={product.name}
        onClose={() => setInsightsOpen(false)}
      />
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-subtle">Dónde</p>
        <ul className="space-y-1 text-sm">{product.where.map((w) => <li key={w}>{w}</li>)}</ul>
      </div>
      <button
        type="button"
        onClick={() => useApp.getState().openSheet("cta", clip.id)}
        className="w-full rounded-[13px] bg-gradient-to-br from-mint to-cyan py-3 text-sm font-extrabold text-bg"
      >
        {product.ctaLabel}
      </button>
    </div>
  );
}

function Mini({ stat, label }: { stat: string; label: string }) {
  return (
    <div className="rounded-xl bg-bg-elevated p-2">
      <b className="block text-sm tabular-nums text-mint">{stat}</b>
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  );
}
