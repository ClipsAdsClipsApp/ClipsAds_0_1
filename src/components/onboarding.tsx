import { useState, type FormEvent } from "react";
import { CATEGORIES } from "@/lib/seed";
import { useApp } from "@/lib/store";
import type { AgeRange, CategoryId, Gender, Role, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/chrome";
import { IconCheck } from "@/components/icons";
import {
  authEnabled,
  FIREBASE_PROVIDERS,
  firebaseConfigured,
  registerWithEmail,
  signIn,
  signInWithEmail,
} from "@/lib/firebase/auth";
import { saveMyProfile } from "@/lib/profile";
import type { AppUser } from "@/lib/auth/use-current-user";

const AGES: AgeRange[] = ["18-24", "25-34", "35-44", "45-54", "55+"];
const GENDERS: { id: Gender; label: string }[] = [
  { id: "woman", label: "Mujer" },
  { id: "man", label: "Hombre" },
  { id: "nonbinary", label: "No binario" },
  { id: "prefer_not", label: "Prefiero no decirlo" },
];
const CITIES = ["Parla", "Madrid", "Leganés", "Getafe", "Fuenlabrada"];
const ROLES: { id: Role; label: string; hint: string }[] = [
  { id: "user", label: "Usuario", hint: "Descubrir y opinar" },
  { id: "creator", label: "Creador", hint: "Publicar reseñas" },
  { id: "business", label: "Empresa", hint: "Llegar a tu barrio" },
];

export function Onboarding({ session }: { session?: AppUser | null }) {
  const login = useApp((s) => s.login);
  const [mode, setMode] = useState<"login" | "register">("register");
  const [step, setStep] = useState<"auth" | "prefs">(session ? "prefs" : "auth");
  const [email, setEmail] = useState(session?.primaryEmail ?? "");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(
    session?.displayName?.replace(/\s/g, "").toLowerCase() ?? "",
  );
  const [role, setRole] = useState<Role>("user");
  const [ageRange, setAgeRange] = useState<AgeRange>("25-34");
  const [gender, setGender] = useState<Gender>("prefer_not");
  const [city, setCity] = useState("Parla");
  const [interests, setInterests] = useState<CategoryId[]>(["tech", "restaurants"]);
  const [personalizeAds, setPersonalizeAds] = useState(true);
  const [approximateLocation, setApproximateLocation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitAuth(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!authEnabled) {
        throw new Error("Firebase no está configurado para esta aplicación.");
      }
      if (mode === "login") {
        await signInWithEmail(email, password);
        window.location.assign("/");
        return;
      }
      await registerWithEmail(
        email,
        password,
        username || email.split("@")[0] || "usuario",
      );
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de acceso");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    const name = username.replace(/^@/, "") || email.split("@")[0] || "usuario";
    setBusy(true);
    setError(null);
    try {
      const saved = await saveMyProfile({
        data: {
          username: name,
          displayName: name,
          bio: "Nuevo en ClipsAds",
          city,
          avatarUrl: session?.profileImageUrl || "/avatars/user.jpg",
          role,
        },
      });
      const user: UserProfile = {
        id: session?.id ?? "me",
        username: saved.username,
        displayName: saved.displayName,
        email: email || session?.primaryEmail || `${name}@clips.app`,
        avatarUrl: saved.avatarUrl || "/avatars/user.jpg",
        role: saved.role as Role,
        bio: saved.bio,
        ageRange,
        gender,
        city: saved.city,
        interests,
        personalizeAds,
        approximateLocation,
      };
      login(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el perfil");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboarding-frame flex h-full flex-col justify-between bg-[radial-gradient(circle_at_50%_0,#15223a,var(--color-bg)_62%)] px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(28px+env(safe-area-inset-top))]">
      <div className="onboarding-content min-h-0 w-full max-w-md self-center overflow-y-auto scrollbar-none">
        <div className="onboarding-header mb-7 text-center">
          <div className="onboarding-logo mx-auto mb-3.5">
            <LogoMark size={72} />
          </div>
          <Wordmark className="text-[34px] leading-none" />
          <p className="mt-2 text-sm text-muted">Descubre, Elige, Opina y Compra Mejor.</p>
        </div>

        {step === "auth" ? (
          <form onSubmit={submitAuth} className="onboarding-form space-y-2.5">
            <div className="mb-1 grid grid-cols-2 gap-1 rounded-[14px] bg-fg/5 p-1">
              <TabBtn on={mode === "register"} onClick={() => setMode("register")}>
                Crear cuenta
              </TabBtn>
              <TabBtn on={mode === "login"} onClick={() => setMode("login")}>
                Entrar
              </TabBtn>
            </div>
            {!firebaseConfigured ? (
              <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
                Falta configurar Firebase para activar el registro y el inicio de sesión.
              </p>
            ) : null}
            {mode === "register" ? (
              <Field
                label="Usuario"
                value={username}
                onChange={setUsername}
                placeholder="@tu.nombre"
              />
            ) : null}
            <Field label="Correo" value={email} onChange={setEmail} placeholder="tu@correo.com" type="email" />
            <Field
              label="Contraseña"
              value={password}
              onChange={setPassword}
              placeholder="Mínimo 8 caracteres"
              type="password"
            />
            {error ? <p className="text-xs text-red-400">{error}</p> : null}
            <button
              type="submit"
              disabled={!authEnabled || busy || !email || password.length < 8}
              className="onboarding-submit mt-1 w-full rounded-[14px] bg-[linear-gradient(90deg,#2ee6d6,#7cffb2)] py-3 text-sm font-extrabold text-bg disabled:opacity-40"
            >
              {busy ? "…" : mode === "register" ? "Continuar" : "Entrar"}
            </button>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {FIREBASE_PROVIDERS.map((p) => (
                <button
                  key={p.providerId}
                  type="button"
                  disabled={!authEnabled}
                  onClick={() => void signIn(p.providerId).catch((err) => {
                    setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
                  })}
                  className="rounded-[14px] border border-line bg-surface py-2.5 text-xs font-bold"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold">Tu perfil</p>
            <Field label="Usuario" value={username} onChange={setUsername} placeholder="@usuario" />
            <p className="text-xs font-bold text-muted">Rol</p>
            <div className="grid grid-cols-3 gap-1.5">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-left",
                    role === r.id ? "border-cyan bg-cyan/10" : "border-line bg-surface",
                  )}
                >
                  <div className="text-xs font-extrabold">{r.label}</div>
                  <div className="text-[10px] text-muted">{r.hint}</div>
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-muted">Ciudad</p>
            <div className="flex flex-wrap gap-1.5">
              {CITIES.map((c) => (
                <Chip key={c} on={city === c} onClick={() => setCity(c)}>
                  {c}
                </Chip>
              ))}
            </div>
            <p className="text-xs font-bold text-muted">Edad</p>
            <div className="flex flex-wrap gap-1.5">
              {AGES.map((a) => (
                <Chip key={a} on={ageRange === a} onClick={() => setAgeRange(a)}>
                  {a}
                </Chip>
              ))}
            </div>
            <p className="text-xs font-bold text-muted">Género</p>
            <div className="flex flex-wrap gap-1.5">
              {GENDERS.map((g) => (
                <Chip key={g.id} on={gender === g.id} onClick={() => setGender(g.id)}>
                  {g.label}
                </Chip>
              ))}
            </div>
            <p className="text-xs font-bold text-muted">Intereses</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  on={interests.includes(c.id)}
                  onClick={() =>
                    setInterests((cur) =>
                      cur.includes(c.id) ? cur.filter((id) => id !== c.id) : [...cur, c.id],
                    )
                  }
                >
                  {c.name}
                </Chip>
              ))}
            </div>
            {error ? <p className="text-xs text-red-400">{error}</p> : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void finish()}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(90deg,#2ee6d6,#7cffb2)] py-3 text-sm font-extrabold text-bg"
            >
              <IconCheck size={16} /> {busy ? "Guardando…" : "Empezar en ClipsAds"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[14px] border border-line bg-bg-elevated px-3 py-3 text-sm outline-none"
      />
    </label>
  );
}

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-[10px] py-2 text-xs font-extrabold", on ? "bg-cyan text-bg" : "text-muted")}
    >
      {children}
    </button>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-bold",
        on ? "bg-cyan text-bg" : "bg-fg/8 text-muted",
      )}
    >
      {children}
    </button>
  );
}
