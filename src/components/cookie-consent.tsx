import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const KEY = "clipsapp-cookie-consent-v1";
const OPEN_EVENT = "clipsapp:open-cookie-settings";

type Consent = { necessary: true; preferences: boolean; analytics: boolean; ts: number };

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const saved = readConsent();
    if (!saved) setOpen(true);
    const reopen = () => {
      const current = readConsent();
      setPreferences(current?.preferences ?? false);
      setAnalytics(current?.analytics ?? false);
      setCustom(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  function save(next: { preferences: boolean; analytics: boolean }) {
    const consent: Consent = { necessary: true, ...next, ts: Date.now() };
    try {
      localStorage.setItem(KEY, JSON.stringify(consent));
    } catch {
      /* storage blocked: the banner will show again next visit */
    }
    setOpen(false);
    setCustom(false);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-title"
      className="fixed inset-x-0 bottom-0 z-[100] flex justify-center p-3 pb-[calc(12px+env(safe-area-inset-bottom))]"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-bg-elevated p-4 shadow-2xl">
        <h2 id="cookie-title" className="font-display text-base font-bold">
          Tu privacidad y las cookies
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Usamos cookies técnicas necesarias para que ClipsApp funcione. Con tu permiso, también
          cookies de preferencias y analítica. Puedes aceptar, rechazar o elegir, y cambiarlo
          cuando quieras desde tu perfil, conforme al RGPD y a la LSSI de España.
        </p>
        {custom ? (
          <div className="mt-3 space-y-2">
            <ToggleRow title="Necesarias" hint="Sesión y seguridad. Siempre activas." on disabled />
            <ToggleRow
              title="Preferencias"
              hint="Recuerdan tus ajustes y personalización."
              on={preferences}
              onToggle={() => setPreferences((v) => !v)}
            />
            <ToggleRow
              title="Analítica"
              hint="Estadísticas de uso para mejorar la app."
              on={analytics}
              onToggle={() => setAnalytics((v) => !v)}
            />
            <button
              type="button"
              onClick={() => save({ preferences, analytics })}
              className="w-full rounded-[14px] border border-line bg-surface py-2.5 text-sm font-bold"
            >
              Guardar mi elección
            </button>
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => save({ preferences: false, analytics: false })}
            className="rounded-[14px] border border-line bg-surface py-2.5 text-sm font-bold"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => save({ preferences: true, analytics: true })}
            className="rounded-[14px] border border-line bg-surface py-2.5 text-sm font-bold"
          >
            Aceptar
          </button>
        </div>
        {!custom ? (
          <button
            type="button"
            onClick={() => setCustom(true)}
            className="mt-2 w-full py-1 text-xs font-bold text-cyan"
          >
            Configurar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  hint,
  on,
  disabled,
  onToggle,
}: {
  title: string;
  hint: string;
  on: boolean;
  disabled?: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-left disabled:opacity-70"
    >
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-[11px] text-muted">{hint}</span>
      </span>
      <span className={cn("h-5 w-9 rounded-full p-0.5 transition", on ? "bg-cyan" : "bg-fg/20")}>
        <span className={cn("block size-4 rounded-full bg-white transition", on && "translate-x-4")} />
      </span>
    </button>
  );
}
