import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/admin-login")({ component: AdminLogin });

function AdminLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function continueToAdmin() {
    setBusy(true);
    setError("");
    try {
      await signIn("clipsapp-google", { callbackURL: "/admin" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar sesión.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-5 py-10">
      <section className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        <div className="mb-5 grid size-12 place-items-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan">
          <ShieldCheck size={23} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan">ClipsAds · Acceso restringido</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold">Administración</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Accede con la cuenta del propietario. El servidor comprobará el correo autorizado antes de mostrar el panel.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void continueToAdmin()}
          className="mt-6 min-h-12 w-full rounded-xl bg-cyan px-4 font-bold text-bg disabled:opacity-60"
        >
          {busy ? "Conectando…" : "Continuar con Google"}
        </button>
        {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}
        <p className="mt-5 text-xs leading-5 text-muted">
          También necesitas una sesión activa de ClipsAds.{" "}
          <Link to="/login" className="font-bold text-cyan underline underline-offset-4">Iniciar sesión en ClipsAds</Link>
        </p>
        <Link to="/" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-muted">
          <ArrowLeft size={14} /> Volver a la app
        </Link>
      </section>
    </main>
  );
}
