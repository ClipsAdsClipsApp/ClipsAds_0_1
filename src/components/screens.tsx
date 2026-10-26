import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { uploadPresigned } from "@vercel/blob/client";
import { CreditCard, ExternalLink, LoaderCircle, Trash2 } from "lucide-react";
import { BottomNav, OptionButton } from "@/components/chrome";
import {
  IconChart,
  IconLogout,
  IconPin,
  IconSearch,
  IconShield,
} from "@/components/icons";
import { ADULT_AGE_RANGES, clipLikes, clipStats, creatorById, DISCLOSURE_LABEL, isClipAllowedFor, productById } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/categories";
import { remoteCreators } from "@/lib/creators-registry";
import { Photo } from "@/components/photo";
import { useApp } from "@/lib/store";
import type { AgeRange, CategoryId, Clip, CtaKind, Disclosure, PurchaseMode, UserProfile } from "@/lib/types";
import { cn, formatCount, formatPrice, resolveAvatar } from "@/lib/utils";
import { UserButton } from "@/lib/auth/gates";
import { openCookieSettings } from "@/components/cookie-consent";
import { changePassword, signOut } from "@/lib/firebase/auth";
import { firebaseConfigured, getFirebaseAuth } from "@/lib/firebase/client";
import { subscribeMySharedClips } from "@/lib/firebase/clips";
import { saveMyProfile } from "@/lib/profile";

export function Explore() {
  const clips = useApp((s) => s.clips);
  const products = useApp((s) => s.products);
  const hidden = useApp((s) => s.hidden);
  const user = useApp((s) => s.user);
  const setTab = useApp((s) => s.setTab);
  const setActiveClip = useApp((s) => s.setActiveClip);
  useApp((s) => s.remote);
  const creators = [...remoteCreators.values()];
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryId | "all">("all");

  const list = clips.filter((c) => {
    if (hidden.includes(c.id) || !isClipAllowedFor(c, user)) return false;
    const p = productById(c.productId, products);
    const a = creatorById(c.authorId);
    if (cat !== "all" && p.category !== cat) return false;
    if (!q.trim()) return true;
    const hay = `${p.name} ${p.brand} ${a.username} ${c.caption} ${p.city}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const nearby = products.filter((p) => p.city === (user?.city ?? "Parla")).slice(0, 4);

  return (
    <div className="relative flex h-full flex-col bg-bg">
      <header className="px-4 pt-[calc(18px+env(safe-area-inset-top))]">
        <h1 className="font-display text-2xl font-bold">Explorar</h1>
        <p className="text-xs text-muted">Cerca de {user?.city ?? "Parla"} y por categoría.</p>
        <label className="mt-3 flex items-center gap-2 rounded-[14px] border border-line bg-bg-elevated px-3 py-2.5">
          <IconSearch size={18} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Productos, negocios, creadores"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <div className="scrollbar-none mt-3 flex gap-1.5 overflow-x-auto pb-1">
          <Chip on={cat === "all"} onClick={() => setCat("all")}>
            Todas
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>
              {c.name}
            </Chip>
          ))}
        </div>
      </header>
      <div className="scrollbar-none flex-1 overflow-y-auto px-4 pb-24 pt-4">
        <h2 className="mb-2 text-sm font-bold">Cerca de ti</h2>
        <div className="mb-5 grid gap-2">
          {nearby.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex gap-3 rounded-2xl border border-line bg-surface p-2 text-left"
              onClick={() => {
                const clip = clips.find((c) => c.productId === p.id);
                if (clip) {
                  setActiveClip(clip.id);
                  setTab("home");
                }
              }}
            >
              <Photo src={p.imageUrl} className="size-16 rounded-xl object-cover" />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{p.name}</div>
                <div className="text-xs text-muted">
                  {p.brand} · {p.distanceKm} km
                </div>
                <div className="mt-1 text-[11px] font-semibold text-mint">
                  {p.ctaLabel} · {formatPrice(p.price, p.currency)}
                </div>
              </div>
            </button>
          ))}
        </div>
        <h2 className="mb-2 text-sm font-bold">Tendencias</h2>
        <div className="grid grid-cols-2 gap-2">
          {list.map((clip) => (
            <ClipTile
              key={clip.id}
              clip={clip}
              onOpen={() => {
                setActiveClip(clip.id);
                setTab("home");
              }}
            />
          ))}
        </div>
        {creators.length ? (
          <>
            <h2 className="mb-2 mt-5 text-sm font-bold">Creadores</h2>
            <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
              {creators.map((c) => (
                <div key={c.id} className="w-28 shrink-0 rounded-2xl border border-line bg-surface p-2 text-center">
                  <img src={resolveAvatar(c.avatarUrl, c.displayName)} alt="" className="mx-auto size-12 rounded-full object-cover" />
                  <div className="mt-1 truncate text-xs font-bold">@{c.username}</div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
      <BottomNav />
    </div>
  );
}

function Chip({
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
        "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold",
        on ? "bg-cyan text-bg" : "bg-fg/8 text-muted",
      )}
    >
      {children}
    </button>
  );
}

function ClipThumb({ clip, fallback, className }: { clip: Clip; fallback?: string; className: string }) {
  if (clip.videoUrl) {
    return (
      <video
        src={`${clip.videoUrl}#t=0.1`}
        poster={clip.posterUrl?.startsWith("data:") ? clip.posterUrl : undefined}
        preload="metadata"
        muted
        playsInline
        className={cn("bg-black", className)}
      />
    );
  }
  return <Photo src={clip.posterUrl || fallback} className={className} />;
}

function resizeImage(file: File, maxSide = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No se pudo procesar la imagen."));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

function captureFrame(url: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    const done = (value?: string) => {
      v.removeAttribute("src");
      resolve(value);
    };
    v.onerror = () => done();
    v.onloadeddata = () => {
      v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
    };
    v.onseeked = () => {
      try {
        const w = 320;
        const h = Math.round((w * v.videoHeight) / (v.videoWidth || 1)) || 480;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(v, 0, 0, w, h);
        done(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        done();
      }
    };
    window.setTimeout(() => done(), 8000);
  });
}

function ClipLikes({ clip }: { clip: Clip }) {
  const votes = useApp((s) => s.clipVotes[clip.id]);
  return <>{formatCount(clipLikes(clip, votes?.adYes ?? 0))} me gusta</>;
}

function ClipTile({ clip, onOpen }: { clip: Clip; onOpen: () => void }) {
  const products = useApp((s) => s.products);
  const p = productById(clip.productId, products);
  return (
    <button type="button" onClick={onOpen} className="overflow-hidden rounded-2xl border border-line text-left">
      <div className="relative h-40">
        <ClipThumb clip={clip} className="h-full w-full object-cover" />
        <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold">
          {DISCLOSURE_LABEL[clip.disclosure]}
        </span>
      </div>
      <div className="bg-surface p-2">
        <div className="line-clamp-2 text-xs font-bold">{p.name}</div>
        <div className="text-[10px] text-muted"><ClipLikes clip={clip} /></div>
      </div>
    </button>
  );
}

export function CreateClip() {
  const user = useApp((s) => s.user);
  const publishClip = useApp((s) => s.publishClip);
  const [fileUrl, setFileUrl] = useState<string>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [posterUrl, setPosterUrl] = useState<string>();
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("19.90");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<CategoryId>("tech");
  const [disclosure, setDisclosure] = useState<Disclosure>("organic");
  const [targetAges, setTargetAges] = useState<AgeRange[]>([]);
  const [cta, setCta] = useState<CtaKind>("buy");
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("internal");
  const [purchaseUrl, setPurchaseUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [contactUrl, setContactUrl] = useState("");
  const [offerCode, setOfferCode] = useState("");
  const [offerDetails, setOfferDetails] = useState("");
  const [sizeOptionsText, setSizeOptionsText] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  async function submitClip() {
    if (!selectedFile || !name.trim()) return;
    if (cta === "directions" && !address.trim()) {
      setUploadError("Indica la dirección del local para el botón Cómo llegar.");
      return;
    }
    if (cta === "buy" && purchaseMode === "external" && !isHttpUrl(purchaseUrl)) {
      setUploadError("Pega un enlace de tienda válido que empiece por https://.");
      return;
    }
    if (cta === "book" && !isHttpUrl(bookingUrl)) {
      setUploadError("Añade un enlace de reservas válido que empiece por https://.");
      return;
    }
    if (cta === "contact" && !isHttpUrl(contactUrl)) {
      setUploadError("Añade un enlace de WhatsApp, chat o contacto que empiece por https://.");
      return;
    }
    if (cta === "offer" && !offerCode.trim()) {
      setUploadError("Indica el código de la oferta o cupón.");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    try {
      const firebaseUser = getFirebaseAuth().currentUser;
      if (!firebaseUser || firebaseUser.uid !== user?.id) {
        throw new Error("Inicia sesión de nuevo antes de subir un video.");
      }
      const maxVideoBytes = 100 * 1024 * 1024;
      if (selectedFile.size > maxVideoBytes) {
        throw new Error("El video supera el límite de 100 MB.");
      }

      const extensions: Record<string, { extension: string; contentType: string }> = {
        "video/mp4": { extension: "mp4", contentType: "video/mp4" },
        "video/webm": { extension: "webm", contentType: "video/webm" },
        "video/quicktime": { extension: "mov", contentType: "video/quicktime" },
        "video/x-m4v": { extension: "m4v", contentType: "video/x-m4v" },
        "video/ogg": { extension: "ogg", contentType: "video/ogg" },
        "video/3gpp": { extension: "3gp", contentType: "video/3gpp" },
      };
      const byMime = extensions[selectedFile.type.toLowerCase()];
      const byExtension = Object.values(extensions).find(({ extension }) =>
        selectedFile.name.toLowerCase().endsWith(`.${extension}`),
      );
      const videoType = byMime ?? byExtension;
      if (!videoType) {
        throw new Error("Formato no compatible. Usa MP4, WebM, MOV, M4V, OGG o 3GP.");
      }

      const id = `mine-${crypto.randomUUID()}`;
      const pathname = `clips/${firebaseUser.uid}/${id}.${videoType.extension}`;
      const idToken = await firebaseUser.getIdToken();
      const blob = await uploadPresigned(pathname, selectedFile, {
        access: "public",
        contentType: videoType.contentType,
        handleUploadUrl: "/api/blob/upload",
        headers: { Authorization: `Bearer ${idToken}` },
        multipart: selectedFile.size > 5 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setUploadProgress(percentage),
      });

      const parsed = Number.parseFloat(price.replace(",", ".")) || 0;
      publishClip(
        {
          id,
          videoUrl: blob.url,
          posterUrl: posterUrl ?? photoUrl ?? "",
          caption: caption || name,
          authorId: firebaseUser.uid,
          productId: id,
          disclosure,
          likes: 0,
          comments: 0,
          saves: 0,
          shares: 0,
          fulfillsYes: 1,
          fulfillsMid: 0,
          fulfillsNo: 0,
          wouldYes: 1,
          wouldNo: 0,
          adYes: 0,
          adNo: 0,
          local: cta !== "buy",
          sponsored: disclosure === "sponsored",
          ageRanges: targetAges.length ? targetAges : undefined,
          createdAt: Date.now(),
        },
        {
          id,
          name: name.trim(),
          brand: brand.trim() || "Mi marca",
          description: caption || name,
          price: parsed,
          currency: "EUR",
          category,
          imageUrl: photoUrl ?? posterUrl ?? "",
          city: user?.city ?? "Parla",
          distanceKm: 0.4,
          cta,
          purchaseMode: cta === "buy" ? purchaseMode : undefined,
          purchaseUrl: cta === "buy" && purchaseMode === "external" ? purchaseUrl.trim() : undefined,
          bookingUrl: cta === "book" ? bookingUrl.trim() || undefined : undefined,
          contactUrl: cta === "contact" ? contactUrl.trim() : undefined,
          offerCode: cta === "offer" ? offerCode.trim().slice(0, 40) : undefined,
          offerDetails: cta === "offer" ? offerDetails.trim().slice(0, 160) : undefined,
          sizeOptions: cta === "buy" && purchaseMode === "internal"
            ? sizeOptionsText.split(",").map((size) => size.trim()).filter(Boolean).slice(0, 20)
            : undefined,
          sellerStripeAccountId: user?.stripeAccountId,
          address: cta === "directions" ? address.trim() : undefined,
          ctaLabel:
            cta === "buy" ? "Comprar" : cta === "book" ? "Reservar" : cta === "directions" ? "Cómo llegar" : cta === "contact" ? "Contactar" : "Ver oferta",
          fulfills: 100,
          wouldBuy: 100,
          verifiedOpinions: 1,
          rating: 5,
          pros: ["Publicado por un usuario"],
          cons: [],
          faq: [],
          alternatives: [],
          where: [brand.trim() || "Local"],
        },
      );
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No se pudo subir el video.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative flex h-full flex-col bg-bg">
      <header className="px-4 pt-[calc(18px+env(safe-area-inset-top))]">
        <h1 className="font-display text-2xl font-bold">Publicar clip</h1>
        <p className="text-xs text-muted">Etiqueta el producto y declara si hay colaboración.</p>
      </header>
      <div className="scrollbar-none flex-1 overflow-y-auto px-4 pb-24 pt-3">
        <label className="mb-3 flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-cyan/40 bg-surface">
          {fileUrl ? (
            <video
              src={`${fileUrl}#t=0.1`}
              className="h-full w-full object-cover"
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
            />
          ) : (
            <span className="text-sm font-semibold text-muted">Selecciona un vídeo</span>
          )}
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg,video/3gpp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setSelectedFile(f);
              const url = URL.createObjectURL(f);
              setFileUrl(url);
              setPosterUrl(undefined);
              void captureFrame(url).then(setPosterUrl);
            }}
          />
        </label>
        {selectedFile ? (
          <p className="mb-3 truncate text-xs text-muted">
            {selectedFile.name} · {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
          </p>
        ) : null}
        <Field label="Producto" value={name} onChange={setName} placeholder="Nombre del producto" />
        <div className="mb-3">
          <span className="mb-1 block text-xs font-bold text-muted">Foto de la ficha social (opcional)</span>
          <div className="flex items-center gap-3">
            <label className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-cyan/40 bg-surface text-center text-[10px] font-semibold text-muted">
              {photoUrl ? (
                <img src={photoUrl} alt="Foto de la ficha" className="h-full w-full object-cover" />
              ) : (
                "Subir foto"
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setPhotoError(null);
                  if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
                    setPhotoError("Elige una imagen de hasta 15 MB.");
                    return;
                  }
                  resizeImage(file).then(setPhotoUrl, (error: unknown) =>
                    setPhotoError(error instanceof Error ? error.message : "No se pudo cargar la foto."),
                  );
                }}
              />
            </label>
            <div className="min-w-0 text-[11px] text-subtle">
              <p>Se mostrará en la ficha del producto. Si no subes una, no habrá foto.</p>
              {photoUrl ? (
                <button type="button" onClick={() => setPhotoUrl(undefined)} className="mt-1 font-bold text-cyan">
                  Quitar foto
                </button>
              ) : null}
            </div>
          </div>
          {photoError ? <p role="alert" className="mt-1 text-xs text-danger">{photoError}</p> : null}
        </div>
        <Field label="Marca o comercio" value={brand} onChange={setBrand} placeholder="SoundTech" />
        <Field label="Precio" value={price} onChange={setPrice} placeholder="19.90" />
        <Field label="Descripción del clip" value={caption} onChange={setCaption} placeholder="Qué has comprobado" />
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-bold text-muted">Categoría</span>
          <select
            className="w-full rounded-[14px] border border-line bg-bg-elevated px-3 py-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <p className="mb-1 text-xs font-bold text-muted">Transparencia</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(
            [
              ["organic", "Orgánica"],
              ["verified_purchase", "Compra verificada"],
              ["sponsored", "Patrocinado"],
              ["affiliate", "Afiliado"],
              ["gifted", "Recibido"],
              ["local", "Negocio local"],
            ] as const
          ).map(([id, label]) => (
            <Chip key={id} on={disclosure === id} onClick={() => setDisclosure(id)}>
              {label}
            </Chip>
          ))}
        </div>
        <fieldset className="mb-4">
          <legend className="mb-1 text-xs font-bold text-muted">Segmentar por edad</legend>
          <p className="mb-2 text-[11px] text-subtle">Solo verán este clip las edades que elijas.</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip on={targetAges.length === 0} onClick={() => setTargetAges([])}>
              Todas las edades
            </Chip>
            <Chip
              on={targetAges.length === ADULT_AGE_RANGES.length && ADULT_AGE_RANGES.every((a) => targetAges.includes(a))}
              onClick={() => setTargetAges(ADULT_AGE_RANGES)}
            >
              No apto para menores de 18
            </Chip>
            {(["14-17", ...ADULT_AGE_RANGES] as AgeRange[]).map((range) => (
              <Chip
                key={range}
                on={targetAges.includes(range)}
                onClick={() =>
                  setTargetAges((current) =>
                    current.includes(range) ? current.filter((a) => a !== range) : [...current, range],
                  )
                }
              >
                {range}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="mb-4">
          <legend className="mb-2 text-xs font-bold text-muted">Acción principal</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {([
              ["buy", "Comprar"],
              ["book", "Reservar"],
              ["contact", "Contactar / pedir info"],
              ["offer", "Ver oferta / cupón"],
              ["directions", "Cómo llegar"],
            ] as const).map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                aria-pressed={cta === kind}
                onClick={() => setCta(kind)}
                className={cn(
                  "min-h-10 rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
                  cta === kind ? "border-cyan bg-cyan/10 text-cyan" : "border-line bg-bg-elevated text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {cta === "buy" ? (
          <div className="mb-3 rounded-2xl border border-line bg-surface p-3">
            <p className="mb-2 text-xs font-bold">Tipo de compra</p>
            <div className="grid grid-cols-2 gap-2">
              <Chip on={purchaseMode === "internal"} onClick={() => setPurchaseMode("internal")}>
                Vender en ClipsApp
              </Chip>
              <Chip on={purchaseMode === "external"} onClick={() => setPurchaseMode("external")}>
                Tienda externa
              </Chip>
            </div>
            {purchaseMode === "external" ? (
              <div className="mt-3">
                <Field label="URL de la tienda" value={purchaseUrl} onChange={setPurchaseUrl} placeholder="https://mitienda.com/producto" />
              </div>
            ) : (
              <div className="mt-3">
                <Field label="Tallas u opciones (separadas por comas)" value={sizeOptionsText} onChange={setSizeOptionsText} placeholder="S, M, L o 38, 39, 40" />
                <p className="mt-1 text-[11px] text-subtle">El cobro directo se activa al conectar Stripe Connect.</p>
              </div>
            )}
          </div>
        ) : null}
        {cta === "book" ? (
          <Field label="Enlace de reservas" value={bookingUrl} onChange={setBookingUrl} placeholder="https://calendly.com/tu-negocio" />
        ) : null}
        {cta === "contact" ? (
          <Field label="WhatsApp, chat o contacto" value={contactUrl} onChange={setContactUrl} placeholder="https://wa.me/34600000000" />
        ) : null}
        {cta === "offer" ? (
          <>
            <Field label="Código de oferta o cupón" value={offerCode} onChange={setOfferCode} placeholder="CLIPS10" />
            <Field label="Detalle de la oferta (opcional)" value={offerDetails} onChange={setOfferDetails} placeholder="10% de descuento hasta fin de mes" />
          </>
        ) : null}
        {cta === "directions" ? (
          <Field
            label="Dirección del local"
            value={address}
            onChange={setAddress}
            placeholder="Calle, número, ciudad"
          />
        ) : null}
        <button
          type="button"
          disabled={!name.trim() || !selectedFile || uploading}
          onClick={() => void submitClip()}
          className="w-full rounded-[15px] bg-gradient-to-br from-cyan to-mint py-3.5 text-sm font-extrabold text-bg disabled:opacity-40"
        >
          {uploading ? `Subiendo ${uploadProgress}%` : "Publicar"}
        </button>
        {uploadError ? <p className="mt-2 text-center text-xs text-danger">{uploadError}</p> : null}
        <p className="mt-2 text-center text-[11px] text-subtle">
          El video se guardará en Vercel Blob y estará disponible en tus dispositivos.
        </p>
      </div>
      <BottomNav />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-bold text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[14px] border border-line bg-bg-elevated px-3 py-3 text-sm outline-none focus:border-cyan"
      />
    </label>
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function Library() {
  const clips = useApp((s) => s.clips);
  const products = useApp((s) => s.products);
  const userId = useApp((s) => s.user?.id);
  const saved = useApp((s) => s.saved);
  const setTab = useApp((s) => s.setTab);
  const setActiveClip = useApp((s) => s.setActiveClip);
  const deletePublishedClip = useApp((s) => s.deletePublishedClip);
  const deleteAllPublishedClips = useApp((s) => s.deleteAllPublishedClips);
  const [mode, setMode] = useState<"published" | "saved">("published");
  const [remoteMine, setRemoteMine] = useState<
    { authorId: string; clip: Clip; product: ReturnType<typeof productById> }[]
  >([]);
  useEffect(() => {
    if (!firebaseConfigured || !userId) {
      setRemoteMine([]);
      return;
    }
    return subscribeMySharedClips(
      userId,
      (docs) =>
        setRemoteMine(
          docs.map((entry) => ({
            authorId: entry.authorId,
            clip: entry.clip,
            product: entry.product,
          })),
        ),
      (error) => {
        console.error("[firebase] Could not load my clips.", error);
        useApp.getState().toastMsg("No se pudieron cargar tus clips");
      },
    );
  }, [userId]);
  const currentRemoteMine = remoteMine.filter((entry) => entry.authorId === userId);
  const remoteIds = new Set(currentRemoteMine.map((entry) => entry.clip.id));
  const mine = [
    ...currentRemoteMine,
    ...clips
      .filter((clip) => clip.authorId === userId && !remoteIds.has(clip.id))
      .map((clip) => ({ clip, product: productById(clip.productId, products) })),
  ];
  const savedClips = clips.filter((c) => saved.includes(c.id));

  return (
    <div className="relative flex h-full flex-col bg-bg">
      <header className="px-4 pt-[calc(18px+env(safe-area-inset-top))]">
        <h1 className="font-display text-2xl font-bold">Mis clips</h1>
        <p className="text-xs text-muted">Tus publicaciones y clips guardados.</p>
        <div className="mt-3 flex gap-1 rounded-[14px] bg-fg/5 p-1">
          <Chip on={mode === "published"} onClick={() => setMode("published")}>
            Publicados
          </Chip>
          <Chip on={mode === "saved"} onClick={() => setMode("saved")}>
            Guardados
          </Chip>
        </div>
        {mode === "published" ? (
          <button
            type="button"
            disabled={!mine.length}
            onClick={() => {
              if (window.confirm(`¿Eliminar tus ${mine.length} clips publicados? Esta acción no se puede deshacer.`)) {
                void deleteAllPublishedClips();
              }
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] border border-danger/40 px-3 py-2 text-xs font-bold text-danger disabled:opacity-40"
          >
            <Trash2 size={15} /> Eliminar todos mis clips
          </button>
        ) : null}
      </header>
      <div className="scrollbar-none flex-1 overflow-y-auto px-4 pb-24 pt-4">
        {(mode === "saved" ? savedClips.length : mine.length) === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            Todavía no hay clips en esta lista.
          </p>
        ) : (
          <div className="space-y-2">
            {(mode === "saved"
              ? savedClips.map((clip) => ({ clip, product: productById(clip.productId, products) }))
              : mine
            ).map(({ clip, product }) => {
              const stats = clipStats(clip);
              return (
                <div key={clip.id} className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 gap-3 text-left"
                    onClick={() => {
                      setActiveClip(clip.id);
                      setTab("home");
                    }}
                  >
                    <ClipThumb clip={clip} fallback={product.imageUrl} className="h-16 w-20 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1 self-center">
                      <div className="truncate text-sm font-bold">{product.name}</div>
                      <div className="text-[11px] text-muted">
                        <ClipLikes clip={clip} /> · {stats.wouldBuy}% lo compraría
                      </div>
                    </div>
                  </button>
                  {mode === "published" ? (
                    <button
                      type="button"
                      aria-label={`Eliminar ${product.name}`}
                      title="Eliminar clip"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar “${product.name}”? Esta acción no se puede deshacer.`)) {
                          void deletePublishedClip(clip.id);
                        }
                      }}
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-danger hover:bg-danger/10"
                    >
                      <Trash2 size={18} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export function Profile() {
  const user = useApp((s) => s.user);
  const updateUser = useApp((s) => s.updateUser);
  const logout = useApp((s) => s.logout);
  const setSigningOut = useApp((s) => s.setSigningOut);
  const adLike = useApp((s) => s.adLike);
  const saved = useApp((s) => s.saved);
  const following = useApp((s) => s.following);
  const toastMsg = useApp((s) => s.toastMsg);
  const [panel, setPanel] = useState<"profile" | "business">("profile");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [passwordPanelOpen, setPasswordPanelOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  async function persist(patch: Partial<UserProfile>) {
    if (!user) return;
    const next = { ...user, ...patch };
    updateUser(patch);
    setSaving(true);
    try {
      await saveMyProfile({
        data: {
          username: next.username,
          displayName: next.displayName,
          bio: next.bio ?? "",
          city: next.city,
          avatarUrl: next.avatarUrl,
          role: next.role,
          ageRange: next.ageRange,
          stripeAccountId: next.stripeAccountId,
        },
      });
      toastMsg("Perfil guardado");
    } catch {
      toastMsg("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordNotice(null);
    if (newPassword.length < 8) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setPasswordBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordNotice("Contraseña actualizada.");
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setPasswordError("La contraseña actual no es correcta.");
      } else {
        setPasswordError(error instanceof Error ? error.message : "No se pudo cambiar la contraseña.");
      }
    } finally {
      setPasswordBusy(false);
    }
  }

  function pickPhoto(file: File) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      const data = canvas.toDataURL("image/jpeg", 0.72);
      URL.revokeObjectURL(url);
      void persist({ avatarUrl: data });
    };
    img.src = url;
  }

  return (
    <div className="relative flex h-full flex-col bg-bg">
      <header className="px-4 pt-[calc(18px+env(safe-area-inset-top))]">
        <div className="mb-3 flex items-center justify-end">
          <UserButton />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative"
            onClick={() => fileRef.current?.click()}
          >
            <img src={resolveAvatar(user.avatarUrl, user.displayName)} alt="" className="size-16 rounded-full border-2 border-cyan object-cover" />
            <span className="absolute -bottom-1 -right-1 rounded-full bg-cyan px-1.5 py-0.5 text-[9px] font-extrabold text-bg">
              Foto
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickPhoto(f);
            }}
          />
          <div>
            <h1 className="font-display text-xl font-bold">@{user.username}</h1>
            <p className="text-xs text-muted">
              {user.city} · {user.role}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat n={Object.values(adLike).filter((v) => v === "yes").length} label="Me gusta" />
          <Stat n={saved.length} label="Guardados" />
          <Stat n={following.length} label="Siguiendo" />
        </div>
        <div className="mt-3 flex gap-1 rounded-[14px] bg-fg/5 p-1">
          <Chip on={panel === "profile"} onClick={() => setPanel("profile")}>
            Perfil
          </Chip>
          <Chip on={panel === "business"} onClick={() => setPanel("business")}>
            Empresa
          </Chip>
        </div>
      </header>
      <div className="scrollbar-none flex-1 overflow-y-auto px-4 pb-24 pt-4">
        {panel === "profile" ? (
          <>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-bold text-muted">Nombre</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => {
                  if (displayName.trim() && displayName !== user.displayName) {
                    void persist({ displayName: displayName.trim() });
                  }
                }}
                className="w-full rounded-[14px] border border-line bg-bg-elevated px-3 py-3 text-sm outline-none"
              />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-bold text-muted">Bio</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                onBlur={() => {
                  if (bio !== user.bio) void persist({ bio });
                }}
                rows={3}
                className="w-full rounded-[14px] border border-line bg-bg-elevated px-3 py-3 text-sm outline-none"
                placeholder="Quién eres y qué pruebas"
              />
            </label>
            <p className="mb-2 text-xs font-bold text-muted">Intereses</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const on = user.interests.includes(c.id);
                return (
                  <Chip
                    key={c.id}
                    on={on}
                    onClick={() =>
                      updateUser({
                        interests: on
                          ? user.interests.filter((id) => id !== c.id)
                          : [...user.interests, c.id],
                      })
                    }
                  >
                    {c.name}
                  </Chip>
                );
              })}
            </div>
            <PrivacyRow
              icon={<IconShield size={18} />}
              title="Personalización publicitaria"
              on={user.personalizeAds}
              onToggle={() => updateUser({ personalizeAds: !user.personalizeAds })}
            />
            <PrivacyRow
              icon={<IconPin size={18} />}
              title="Ubicación aproximada"
              on={user.approximateLocation}
              onToggle={() => updateUser({ approximateLocation: !user.approximateLocation })}
            />
            <button
              type="button"
              onClick={openCookieSettings}
              className="mt-4 flex w-full items-center justify-between rounded-[14px] border border-line bg-surface px-3 py-3 text-left text-sm font-bold"
            >
              Preferencias de cookies
            </button>
            <button
              type="button"
              aria-expanded={passwordPanelOpen}
              onClick={() => {
                setPasswordPanelOpen((open) => !open);
                setPasswordError(null);
                setPasswordNotice(null);
              }}
              className="mt-4 flex w-full items-center justify-between rounded-[14px] border border-line bg-surface px-3 py-3 text-left text-sm font-bold"
            >
              Cambiar contraseña
              <span className="text-muted">{passwordPanelOpen ? "−" : "+"}</span>
            </button>
            {passwordPanelOpen ? (
              <form onSubmit={(event) => void submitPasswordChange(event)} className="mt-2 space-y-2 rounded-[14px] border border-line bg-surface p-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-muted">Contraseña actual</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                    className="w-full rounded-[14px] border border-line bg-bg-elevated px-3 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-muted">Nueva contraseña</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={8}
                    required
                    className="w-full rounded-[14px] border border-line bg-bg-elevated px-3 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-muted">Confirmar nueva contraseña</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    minLength={8}
                    required
                    className="w-full rounded-[14px] border border-line bg-bg-elevated px-3 py-3 text-sm outline-none"
                  />
                </label>
                {passwordError ? <p role="alert" className="text-xs text-danger">{passwordError}</p> : null}
                {passwordNotice ? <p role="status" className="text-xs text-cyan">{passwordNotice}</p> : null}
                <button
                  type="submit"
                  disabled={passwordBusy || !currentPassword || newPassword.length < 8 || !confirmNewPassword}
                  className="w-full rounded-[14px] bg-[linear-gradient(90deg,#2ee6d6,#7cffb2)] py-3 text-sm font-extrabold text-bg disabled:opacity-40"
                >
                  {passwordBusy ? "Actualizando…" : "Guardar nueva contraseña"}
                </button>
              </form>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setSigningOut(true);
                logout();
                void signOut().catch(() => {
                  setSigningOut(false);
                  toastMsg("No se pudo cerrar sesión. Inténtalo de nuevo.");
                });
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] border border-line bg-surface py-3 text-sm font-bold"
            >
              <IconLogout size={16} /> Cerrar sesión
            </button>
            {saving ? <p className="mt-2 text-center text-[11px] text-muted">Guardando…</p> : null}
          </>
        ) : (
          <BusinessPanel />
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-surface py-2">
      <b className="block tabular-nums">{n}</b>
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  );
}

function PrivacyRow({
  icon,
  title,
  on,
  onToggle,
}: {
  icon: ReactNode;
  title: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-3 text-left"
    >
      <span className="text-cyan">{icon}</span>
      <span className="flex-1 text-sm font-semibold">{title}</span>
      <span className={cn("text-xs font-extrabold", on ? "text-mint" : "text-muted")}>
        {on ? "On" : "Off"}
      </span>
    </button>
  );
}

function BusinessPanel() {
  const metrics = useMemo(
    () => [
      { k: "Reproducciones", v: "18.4K" },
      { k: "Guardados", v: "1.2K" },
      { k: "Clics a ficha", v: "640" },
      { k: "Reservas / compras", v: "92" },
    ],
    [],
  );
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <IconChart size={16} className="text-cyan" /> Panel de comercio
      </div>
      <StripeConnectCard />
      <div className="mb-4 grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <div key={m.k} className="rounded-2xl border border-line bg-surface p-3">
            <div className="text-[11px] text-muted">{m.k}</div>
            <div className="font-display text-xl font-bold tabular-nums text-mint">{m.v}</div>
          </div>
        ))}
      </div>
      <p className="mb-2 text-xs font-bold text-muted">Campañas locales</p>
      <div className="space-y-2">
        <Campaign name="Café Nexo · Parla 2 km" status="Activa" />
        <Campaign name="Barbería Sur · fade 18€" status="Pausada" />
      </div>
      <p className="mt-4 text-xs text-muted">
        Las empresas no pueden borrar críticas legítimas. Solo responder.
      </p>
    </div>
  );
}

function StripeConnectCard() {
  const user = useApp((state) => state.user);
  const updateUser = useApp((state) => state.updateUser);
  const toastMsg = useApp((state) => state.toastMsg);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connected = Boolean(user?.stripeAccountId);

  async function connect() {
    if (!user) return;
    const firebaseUser = getFirebaseAuth().currentUser;
    if (!firebaseUser || firebaseUser.uid !== user.id) {
      setError("Inicia sesión para configurar los cobros del negocio.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: {
          authorization: `Bearer ${await firebaseUser.getIdToken()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ country: user.country || "ES" }),
      });
      const result = (await response.json()) as {
        error?: string;
        ready?: boolean;
        stripeAccountId?: string;
        url?: string;
      };
      if (!response.ok) throw new Error(result.error || "No se pudo iniciar Stripe Connect.");
      if (result.stripeAccountId) {
        updateUser({ stripeAccountId: result.stripeAccountId });
        await saveMyProfile({ data: {
          username: user.username,
          displayName: user.displayName,
          bio: user.bio,
          city: user.city,
          avatarUrl: user.avatarUrl,
          role: user.role,
          stripeAccountId: result.stripeAccountId,
        } });
      }
      if (result.ready) {
        toastMsg("Stripe Connect está listo para recibir pagos");
      } else if (result.url) {
        window.location.assign(result.url);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo configurar Stripe Connect.";
      setError(message);
      toastMsg(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-4 rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan/10 text-cyan">
          <CreditCard size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold">Cobros de ClipsApp</h3>
          <p className="mt-1 text-xs text-muted">
            {connected
              ? "Cuenta Stripe Connect vinculada. Stripe confirma la habilitación para cobrar."
              : "Conecta Stripe para recibir directamente los pagos de tus ventas."}
          </p>
        </div>
        <span className={cn("shrink-0 text-[10px] font-bold", connected ? "text-mint" : "text-muted")}>
          {connected ? "Vinculada" : "Pendiente"}
        </span>
      </div>
      <button
        type="button"
        onClick={() => void connect()}
        disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-xs font-bold disabled:opacity-50"
      >
        {busy ? <LoaderCircle size={15} className="animate-spin" /> : <ExternalLink size={15} />}
        {busy ? "Conectando…" : connected ? "Continuar configuración de Stripe" : "Configurar pagos con Stripe"}
      </button>
      {error ? <p role="alert" className="mt-2 text-xs text-danger">{error}</p> : null}
    </section>
  );
}

function Campaign({ name, status }: { name: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-surface px-3 py-3">
      <span className="text-sm font-semibold">{name}</span>
      <span className={cn("text-[11px] font-extrabold", status === "Activa" ? "text-mint" : "text-muted")}>
        {status}
      </span>
    </div>
  );
}
