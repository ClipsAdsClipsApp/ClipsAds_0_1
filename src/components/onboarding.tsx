import { useEffect, useState, type FormEvent } from "react";
import { CATEGORIES } from "@/lib/categories";
import { useApp } from "@/lib/store";
import type { AgeRange, CategoryId, Gender, Role, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/chrome";
import { IconCheck } from "@/components/icons";
import {
  authEnabled,
  FIREBASE_PROVIDERS,
  firebaseConfigured,
  refreshEmailVerification,
  registerWithEmail,
  resendVerificationEmail,
  sendPasswordReset,
  signIn,
  signInWithEmail,
  signOut,
} from "@/lib/firebase/auth";
import { saveMyProfile } from "@/lib/profile";
import { COUNTRIES, DEFAULT_LOCATION, citiesOf, provincesOf } from "@/lib/locations";
import type { AppUser } from "@/lib/auth/use-current-user";

const AGES: AgeRange[] = ["14-17", "18-24", "25-34", "35-44", "45-54", "55+"];
const GENDERS: { id: Gender; label: string }[] = [
  { id: "woman", label: "Mujer" },
  { id: "man", label: "Hombre" },
  { id: "nonbinary", label: "No binario" },
  { id: "prefer_not", label: "Prefiero no decirlo" },
];
const ROLES: { id: Role; label: string; hint: string }[] = [
  { id: "user", label: "Usuario", hint: "Descubrir y opinar" },
  { id: "creator", label: "Creador", hint: "Publicar reseñas" },
  { id: "business", label: "Empresa", hint: "Llegar a tu barrio" },
];

export function Onboarding({ session }: { session?: AppUser | null }) {
  const login = useApp((s) => s.login);
  const [mode, setMode] = useState<"login" | "register">("register");
  const [step, setStep] = useState<"auth" | "verify" | "prefs">(
    session ? (session.emailVerified ? "prefs" : "verify") : "auth",
  );
  const [email, setEmail] = useState(session?.primaryEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState(
    session?.displayName?.replace(/\s/g, "").toLowerCase() ?? "",
  );
  const [role, setRole] = useState<Role>("user");
  const [ageRange, setAgeRange] = useState<AgeRange>("25-34");
  const [gender, setGender] = useState<Gender>("prefer_not");
  const [country, setCountry] = useState(DEFAULT_LOCATION.country);
  const [province, setProvince] = useState(DEFAULT_LOCATION.province);
  const [city, setCity] = useState(DEFAULT_LOCATION.city);
  const [interests, setInterests] = useState<CategoryId[]>(["tech", "restaurants"]);
  const [personalizeAds, setPersonalizeAds] = useState(true);
  const [approximateLocation, setApproximateLocation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    setEmail(session.primaryEmail ?? "");
    setStep(session.emailVerified ? "prefs" : "verify");
  }, [session?.id, session?.primaryEmail, session?.emailVerified]);

  async function submitAuth(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === "register" && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      if (!authEnabled) {
        throw new Error("Firebase no está configurado para esta aplicación.");
      }
      if (mode === "login") {
        const user = await signInWithEmail(email, password);
        if (!user.emailVerified) {
          setStep("verify");
          setNotice("Confirma tu correo antes de crear el perfil.");
          return;
        }
        window.location.assign("/");
        return;
      }
      await registerWithEmail(
        email,
        password,
        username || email.split("@")[0] || "usuario",
      );
      setStep("verify");
      setNotice("Te enviamos un enlace seguro para verificar tu correo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de acceso");
    } finally {
      setBusy(false);
    }
  }

  async function recoverPassword() {
    if (!email.trim()) {
      setError("Escribe tu correo para enviarte el enlace de recuperación.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await sendPasswordReset(email);
      setNotice("Si existe una cuenta con ese correo, recibirás un enlace seguro para restablecer la contraseña.");
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? err.code : null;
      if (code === "auth/user-not-found") {
        setNotice("Si existe una cuenta con ese correo, recibirás un enlace seguro para restablecer la contraseña.");
      } else if (code === "auth/invalid-email") {
        setError("Escribe un correo válido.");
      } else {
        setError("No se pudo enviar el enlace. Inténtalo de nuevo más tarde.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function checkEmailVerification() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const user = await refreshEmailVerification();
      if (!user.emailVerified) {
        setError("Aún no vemos la verificación. Abre el enlace del correo y vuelve a intentarlo.");
        return;
      }
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo comprobar el correo.");
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await resendVerificationEmail();
      setNotice("Te reenviamos el enlace de verificación.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reenviar el enlace.");
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
          phone,
          ageRange,
          bio: "Nuevo en ClipsApp",
          country,
          province,
          city,
          avatarUrl: session?.profileImageUrl || "",
          role,
        },
      });
      const user: UserProfile = {
        id: session?.id ?? "me",
        username: saved.username,
        displayName: saved.displayName,
        email: email || session?.primaryEmail || `${name}@clips.app`,
        phone: saved.phone || "",
        avatarUrl: saved.avatarUrl || "",
        role: saved.role as Role,
        bio: saved.bio,
        ageRange,
        gender,
        city: saved.city,
        country,
        province,
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
              <TabBtn
                on={mode === "register"}
                onClick={() => {
                  setMode("register");
                  setError(null);
                  setNotice(null);
                  setConfirmPassword("");
                }}
              >
                Crear cuenta
              </TabBtn>
              <TabBtn
                on={mode === "login"}
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setNotice(null);
                  setConfirmPassword("");
                }}
              >
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
            {mode === "register" ? (
              <Field
                label="Confirmar contraseña"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repite tu contraseña"
                type="password"
              />
            ) : null}
            {notice ? <p role="status" className="text-xs text-cyan">{notice}</p> : null}
            {error ? <p className="text-xs text-red-400">{error}</p> : null}
            <button
              type="submit"
              disabled={!authEnabled || busy || !email || password.length < 8}
              className="onboarding-submit mt-1 w-full rounded-[14px] bg-[linear-gradient(90deg,#2ee6d6,#7cffb2)] py-3 text-sm font-extrabold text-bg disabled:opacity-40"
            >
              {busy ? "…" : mode === "register" ? "Continuar" : "Entrar"}
            </button>
            {mode === "login" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void recoverPassword()}
                className="w-full py-1 text-xs font-bold text-cyan disabled:opacity-50"
              >
                ¿Olvidaste tu contraseña?
              </button>
            ) : null}
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
        ) : step === "verify" ? (
          <div className="space-y-3">
            <p className="text-sm font-bold">Verifica tu correo</p>
            <p className="text-sm text-muted">
              Enviamos un enlace seguro a <strong>{email || session?.primaryEmail}</strong>. Ábrelo y vuelve aquí para continuar.
            </p>
            {notice ? <p role="status" className="text-xs text-cyan">{notice}</p> : null}
            {error ? <p className="text-xs text-red-400">{error}</p> : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void checkEmailVerification()}
              className="w-full rounded-[14px] bg-[linear-gradient(90deg,#2ee6d6,#7cffb2)] py-3 text-sm font-extrabold text-bg disabled:opacity-50"
            >
              {busy ? "Comprobando…" : "Ya verifiqué mi correo"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void resendVerification()}
              className="w-full rounded-[14px] border border-line bg-surface py-3 text-sm font-bold disabled:opacity-50"
            >
              Reenviar enlace
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void signOut()}
              className="w-full py-2 text-xs font-bold text-muted disabled:opacity-50"
            >
              Cambiar de cuenta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold">Tu perfil</p>
            <Field label="Usuario" value={username} onChange={setUsername} placeholder="@usuario" />
            <Field label="Teléfono" value={phone} onChange={setPhone} placeholder="+34 600 000 000" type="tel" />
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
            <p className="text-xs font-bold text-muted">Ubicación</p>
            <div className="grid gap-2">
              <LocationSelect
                label="País"
                value={country}
                options={COUNTRIES}
                onChange={(v) => {
                  const p = provincesOf(v)[0] ?? "";
                  setCountry(v);
                  setProvince(p);
                  setCity(citiesOf(v, p)[0] ?? "");
                }}
              />
              <LocationSelect
                label="Provincia"
                value={province}
                options={provincesOf(country)}
                onChange={(v) => {
                  setProvince(v);
                  setCity(citiesOf(country, v)[0] ?? "");
                }}
              />
              <LocationSelect
                label="Ciudad"
                value={city}
                options={citiesOf(country, province)}
                onChange={setCity}
              />
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
              <IconCheck size={16} /> {busy ? "Guardando…" : "Empezar en ClipsApp"}
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

function LocationSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-cyan"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
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
