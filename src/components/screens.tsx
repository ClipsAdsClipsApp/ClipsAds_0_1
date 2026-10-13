import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { uploadPresigned } from "@vercel/blob/client";
import { BottomNav, OptionButton } from "@/components/chrome";
import {
  IconChart,
  IconCheck,
  IconLogout,
  IconPin,
  IconSearch,
  IconShield,
  IconStar,
} from "@/components/icons";
import { clipStats, creatorById, DISCLOSURE_LABEL, productById } from "@/lib/catalog";
import { CATEGORIES, CREATORS, REVIEWS } from "@/lib/seed";
import { useApp } from "@/lib/store";
import type { CategoryId, Clip, Disclosure, UserProfile } from "@/lib/types";
import { cn, formatCount, formatPrice } from "@/lib/utils";
import { UserButton } from "@/lib/auth/gates";
import { signOut } from "@/lib/firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { saveMyProfile } from "@/lib/profile";

export function Explore() {
  const clips = useApp((s) => s.clips);
  const products = useApp((s) => s.products);
  const hidden = useApp((s) => s.hidden);
  const user = useApp((s) => s.user);
  const setTab = useApp((s) => s.setTab);
  const setActiveClip = useApp((s) => s.setActiveClip);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryId | "all">("all");

  const list = clips.filter((c) => {
    if (hidden.includes(c.id)) return false;
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
              <img src={p.imageUrl} alt="" className="size-16 rounded-xl object-cover" />
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
        <h2 className="mb-2 mt-5 text-sm font-bold">Creadores</h2>
        <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
          {CREATORS.map((c) => (
            <div key={c.id} className="w-28 shrink-0 rounded-2xl border border-line bg-surface p-2 text-center">
              <img src={c.avatarUrl} alt="" className="mx-auto size-12 rounded-full object-cover" />
              <div className="mt-1 truncate text-xs font-bold">@{c.username}</div>
              <div className="text-[10px] text-muted">{formatCount(c.followers)}</div>
            </div>
          ))}
        </div>
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
        poster={clip.posterUrl.startsWith("data:") ? clip.posterUrl : undefined}
        preload="metadata"
        muted
        playsInline
        className={cn("bg-black", className)}
      />
    );
  }
  return <img src={clip.posterUrl || fallback} alt="" className={className} />;
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
        <div className="text-[10px] text-muted">{formatCount(clip.likes)} me gusta</div>
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("19.90");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<CategoryId>("tech");
  const [disclosure, setDisclosure] = useState<Disclosure>("organic");
  const [cta, setCta] = useState<"buy" | "book" | "directions">("buy");
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
          posterUrl: posterUrl ?? "/images/headphones.jpg",
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
          imageUrl: posterUrl ?? "/images/headphones.jpg",
          city: user?.city ?? "Parla",
          distanceKm: 0.4,
          cta,
          address: cta === "directions" ? address.trim() : undefined,
          ctaLabel:
            cta === "buy" ? "Comprar ahora" : cta === "book" ? "Reservar ahora" : "Cómo llegar",
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
        <p className="mb-1 text-xs font-bold text-muted">Acción</p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Chip on={cta === "buy"} onClick={() => setCta("buy")}>
            Comprar
          </Chip>
          <Chip on={cta === "book"} onClick={() => setCta("book")}>
            Reservar
          </Chip>
          <Chip on={cta === "directions"} onClick={() => setCta("directions")}>
            Cómo llegar
          </Chip>
        </div>
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

export function Library() {
  const clips = useApp((s) => s.clips);
  const products = useApp((s) => s.products);
  const saved = useApp((s) => s.saved);
  const setTab = useApp((s) => s.setTab);
  const setActiveClip = useApp((s) => s.setActiveClip);
  const [mode, setMode] = useState<"published" | "saved">("published");
  const mine = clips.filter(
    (c) => c.id.startsWith("mine-") || c.authorId === "me-local",
  );
  const savedClips = clips.filter((c) => saved.includes(c.id));
  const list = mode === "saved" ? savedClips : mine;

  return (
    <div className="relative flex h-full flex-col bg-bg">
      <header className="px-4 pt-[calc(18px+env(safe-area-inset-top))]">
        <h1 className="font-display text-2xl font-bold">Mis clips</h1>
        <p className="text-xs text-muted">Publicados en esta demo y guardados.</p>
        <div className="mt-3 flex gap-1 rounded-[14px] bg-fg/5 p-1">
          <Chip on={mode === "published"} onClick={() => setMode("published")}>
            Publicados
          </Chip>
          <Chip on={mode === "saved"} onClick={() => setMode("saved")}>
            Guardados
          </Chip>
        </div>
      </header>
      <div className="scrollbar-none flex-1 overflow-y-auto px-4 pb-24 pt-4">
        {list.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            Todavía no hay clips en esta lista.
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((c) => {
              const p = productById(c.productId, products);
              const stats = clipStats(c);
              return (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full gap-3 rounded-2xl border border-line bg-surface p-2 text-left"
                  onClick={() => {
                    setActiveClip(c.id);
                    setTab("home");
                  }}
                >
                  <ClipThumb clip={c} fallback={p.imageUrl} className="h-16 w-20 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{p.name}</div>
                    <div className="text-[11px] text-muted">
                      {formatCount(c.likes)} me gusta · {stats.wouldBuy}% lo compraría
                    </div>
                  </div>
                </button>
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
  const liked = useApp((s) => s.liked);
  const saved = useApp((s) => s.saved);
  const following = useApp((s) => s.following);
  const toastMsg = useApp((s) => s.toastMsg);
  const [panel, setPanel] = useState<"profile" | "business">("profile");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saving, setSaving] = useState(false);
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
        },
      });
      toastMsg("Perfil guardado");
    } catch {
      toastMsg("No se pudo guardar");
    } finally {
      setSaving(false);
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
            <img src={user.avatarUrl} alt="" className="size-16 rounded-full border-2 border-cyan object-cover" />
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
          <Stat n={liked.length} label="Me gusta" />
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
              onClick={() => {
                logout();
                void signOut().catch(() => undefined);
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
      {REVIEWS.slice(0, 2).map((r) => (
        <div key={r.id} className="mt-2 rounded-2xl border border-line bg-surface p-3">
          <div className="flex items-center gap-1 text-mint">
            {Array.from({ length: r.rating }).map((_, i) => (
              <IconStar key={i} size={12} filled />
            ))}
            {r.verified ? (
              <span className="ml-2 flex items-center gap-1 text-[10px] font-bold text-cyan">
                <IconCheck size={12} /> verificada
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm">{r.text}</p>
          <OptionButton
            variant="ghost"
            onClick={() => useApp.getState().toastMsg("Respuesta enviada (demo)")}
          >
            Responder
          </OptionButton>
        </div>
      ))}
    </div>
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
