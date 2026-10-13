import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { useApp } from "@/lib/store";
import type { Clip, CtaKind, Disclosure } from "@/lib/types";
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
            <button
              type="button"
              onClick={() => setTab("create")}
              className="rounded-full bg-gradient-to-br from-cyan to-mint px-3 py-2 text-[11px] font-extrabold text-bg"
            >
              + Subir Clip
            </button>
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

        <div className="pointer-events-auto mt-2 flex justify-center">
          <div className="flex gap-1 rounded-full bg-black/35 p-1 backdrop-blur-md">
            <ModeChip on={feedMode === "for-you"} onClick={() => setFeedMode("for-you")}>
              Para ti
            </ModeChip>
            <ModeChip on={feedMode === "discover"} onClick={() => setFeedMode("discover")}>
              Descubre
            </ModeChip>
          </div>
        </div>
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

      <ClipOverlay clip={clip} />
    </section>
  );
}

function ClipOverlay({ clip }: { clip: Clip }) {
  const product = useProduct(clip.productId);
  const saved = useApp((s) => s.saved);
  const toggleSave = useApp((s) => s.toggleSave);
  const openSheet = useApp((s) => s.openSheet);
  const shareClip = useApp((s) => s.shareClip);
  const setUsed = useApp((s) => s.setUsed);
  const tried = useApp((s) => s.tried[clip.id]);
  const stats = clipStats(clip);
  const voteAdLike = useApp((s) => s.voteAdLike);
  const myAd = useApp((s) => s.adLike[clip.id]);
  const isSaved = saved.includes(clip.id);
  const usedYes = tried === "casual" || tried === "verified";
  const usedNo = tried === "no";

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

      <div className="absolute inset-x-3 bottom-[62px] z-10 rounded-[16px] border border-line bg-[#121218]/78 px-2.5 py-2 backdrop-blur-xl">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => openSheet("product", clip.id)}
        >
          <div className="truncate font-display text-[13px] font-extrabold leading-tight">
            {product.name}
          </div>
          <div className="truncate text-[10px] text-muted">
            {product.brand} · {formatPrice(product.price, product.currency)}
            {product.city ? ` · ${product.city}` : ""}
          </div>
        </button>

        <div className="mt-1.5 flex items-center gap-1.5">
          <p className="min-w-0 flex-1 text-[10px] font-extrabold leading-tight">
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

        <div className="mt-1.5 flex items-center gap-1.5">
          <p className="min-w-0 flex-1 text-[10px] font-extrabold leading-tight">
            ¿Lo has usado?
          </p>
          <Choice label="Sí" on={usedYes} onClick={() => setUsed(clip.id, "yes")} />
          <Choice label="No" on={usedNo} onClick={() => setUsed(clip.id, "no")} />
        </div>

        <button
          type="button"
          onClick={() => openSheet("cta", clip.id)}
          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-gradient-to-br from-mint to-cyan py-2 text-[12px] font-extrabold text-bg"
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
        "shrink-0 rounded-full border px-3 py-1 text-[10px] font-extrabold",
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
        "shrink-0 rounded-full border px-2 py-1 text-[10px] font-extrabold tabular-nums",
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
  const allComments = useApp((s) => s.comments);
  const comments = allComments.filter((c) => c.clipId === clipId);
  const addComment = useApp((s) => s.addComment);
  const [text, setText] = useState("");
  return (
    <>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          addComment(clipId, text.trim());
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
  if (product.cta === "buy") {
    return (
      <>
        <p className="mb-3 text-center text-xs text-muted">
          Demo de compra. Código <b className="text-fg">CLIPS10</b> — 10% dto.
        </p>
        <OptionButton
          variant="mint"
          onClick={() => {
            toastMsg("Demo: redirección a tienda simulada");
            closeSheet();
          }}
        >
          Ir a la tienda
        </OptionButton>
        <OptionButton variant="ghost" onClick={closeSheet}>
          Seguir viendo
        </OptionButton>
      </>
    );
  }
  if (product.cta === "book") {
    return (
      <>
        <p className="mb-3 text-xs text-muted">
          {product.address}. Reserva simulada para hoy.
        </p>
        <OptionButton
          variant="primary"
          onClick={() => {
            toastMsg("Reserva enviada (demo)");
            closeSheet();
          }}
        >
          Confirmar reserva
        </OptionButton>
        <OptionButton variant="ghost" onClick={closeSheet}>
          Cancelar
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
  return (
    <>
      <p className="mb-3 text-xs text-muted">{product.address}</p>
      <OptionButton
        variant="primary"
        onClick={() => {
          toastMsg("Abrir mapas (demo)");
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
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-subtle">Ventajas</p>
        <ul className="space-y-1 text-sm">
          {product.pros.map((p) => (
            <li key={p}>· {p}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-subtle">Problemas repetidos</p>
        <ul className="space-y-1 text-sm text-muted">
          {product.cons.map((p) => (
            <li key={p}>· {p}</li>
          ))}
        </ul>
      </div>
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
