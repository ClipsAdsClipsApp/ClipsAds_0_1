import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!authEnabled) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "register") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0] || "usuario",
        });
        if (err) throw new Error(err.message || "No se pudo crear la cuenta");
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message || "Correo o contraseña incorrectos");
      }
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de acceso");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#07080d] p-6 text-[#f4f7fb]">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <img src="/logo.jpg" alt="" className="mx-auto size-16 rounded-2xl object-cover" />
          <h1 className="mt-3 font-display text-2xl font-extrabold">
            Clips<span className="text-[#2ee6d6]">App</span>
          </h1>
          <p className="text-sm text-[#9aa7b5]">Crea tu cuenta para publicar y guardar clips.</p>
        </div>
        {authEnabled ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {GROK_PROVIDERS.map((p) => (
                <button
                  key={p.providerId}
                  type="button"
                  onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <form onSubmit={onSubmit} className="space-y-2">
              {mode === "register" ? (
                <input
                  className="w-full rounded-xl border border-white/10 bg-[#1a1f2a] px-3 py-3 text-sm outline-none"
                  placeholder="Nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              ) : null}
              <input
                className="w-full rounded-xl border border-white/10 bg-[#1a1f2a] px-3 py-3 text-sm outline-none"
                placeholder="Correo"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-white/10 bg-[#1a1f2a] px-3 py-3 text-sm outline-none"
                placeholder="Contraseña (mín. 8)"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error ? <p className="text-xs text-red-400">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-gradient-to-r from-[#2ee6d6] to-[#7cffb2] py-3 text-sm font-extrabold text-[#07080d]"
              >
                {busy ? "…" : mode === "register" ? "Crear cuenta" : "Entrar"}
              </button>
            </form>
            <button
              type="button"
              className="w-full text-center text-xs text-[#9aa7b5]"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Entra"}
            </button>
          </>
        ) : (
          <p className="text-sm text-[#9aa7b5]">El registro está desactivado.</p>
        )}
        <Link to="/" className="block text-center text-xs text-[#2ee6d6]">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
