import { useState, type ReactNode } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFirebaseAuth } from "@/lib/firebase/client";

type SubscriptionPlan = "monthly" | "annual";
type UserRole = "business" | "enterprise";

interface SubscriptionOption {
  plan: SubscriptionPlan;
  role: UserRole;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  highlighted?: boolean;
}

const SUBSCRIPTION_OPTIONS: SubscriptionOption[] = [
  {
    plan: "monthly",
    role: "business",
    price: 29.99,
    currency: "USD",
    interval: "/mes",
    features: [
      "Hasta 10 clips al mes",
      "Analytics básicos",
      "Soporte por email",
      "Insignia de empresa verificada",
    ],
  },
  {
    plan: "annual",
    role: "business",
    price: 299.9,
    currency: "USD",
    interval: "/año",
    features: [
      "Hasta 10 clips al mes",
      "Analytics básicos",
      "Soporte prioritario",
      "Insignia de empresa verificada",
      "Descuento 17% vs mensual",
    ],
    highlighted: true,
  },
  {
    plan: "monthly",
    role: "enterprise",
    price: 99.99,
    currency: "USD",
    interval: "/mes",
    features: [
      "Clips ilimitados",
      "Analytics avanzados",
      "Soporte 24/7",
      "API access",
      "Team management",
      "Custom branding",
    ],
  },
  {
    plan: "annual",
    role: "enterprise",
    price: 999.9,
    currency: "USD",
    interval: "/año",
    features: [
      "Clips ilimitados",
      "Analytics avanzados",
      "Soporte 24/7",
      "API access",
      "Team management",
      "Custom branding",
      "Descuento 17% vs mensual",
    ],
    highlighted: true,
  },
];

export function SubscriptionPlans() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<{
    plan: SubscriptionPlan;
    role: UserRole;
  } | null>(null);

  async function handleSubscribe(option: SubscriptionOption) {
    setLoading(true);
    setError(null);
    setSelectedPlan({ plan: option.plan, role: option.role });

    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Por favor inicia sesión primero.");
      }

      const idToken = await user.getIdToken();

      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          plan: option.plan,
          role: option.role,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "No se pudo procesar la suscripción.");
      }

      const data = (await response.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No se recibió URL de pago.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error desconocido");
      setLoading(false);
      setSelectedPlan(null);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h2 className="font-display text-3xl font-bold">Planes de suscripción</h2>
        <p className="mt-2 text-lg text-muted">Elige el plan perfecto para tu negocio</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-pink bg-pink/10 p-4 text-sm text-pink">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {SUBSCRIPTION_OPTIONS.map((option) => (
          <SubscriptionCard
            key={`${option.role}-${option.plan}`}
            option={option}
            loading={
              loading &&
              selectedPlan?.plan === option.plan &&
              selectedPlan?.role === option.role
            }
            onSubscribe={() => handleSubscribe(option)}
          />
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-line bg-surface-2 p-6">
        <h3 className="font-display text-lg font-bold">¿Tienes dudas?</h3>
        <p className="mt-2 text-muted">
          Contacta a nuestro equipo de ventas para más información sobre planes personalizados.
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-cyan px-6 py-2 font-semibold text-bg"
        >
          Contactar ventas
        </button>
      </div>
    </div>
  );
}

interface SubscriptionCardProps {
  option: SubscriptionOption;
  loading: boolean;
  onSubscribe: () => void;
}

function SubscriptionCard({ option, loading, onSubscribe }: SubscriptionCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 transition-all",
        option.highlighted
          ? "border-cyan bg-cyan/5 ring-2 ring-cyan"
          : "border-line bg-surface"
      )}
    >
      {option.highlighted && (
        <div className="absolute -top-3 left-6 inline-block rounded-full bg-cyan px-3 py-1 text-xs font-bold text-bg">
          Más popular
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-display text-xl font-bold">
          {option.role === "enterprise" ? "Enterprise" : "Business"}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {option.plan === "annual" ? "Facturación anual" : "Facturación mensual"}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-4xl font-bold">
            ${option.price.toFixed(2)}
          </span>
          <span className="text-sm text-muted">{option.interval}</span>
        </div>
      </div>

      <ul className="mb-6 space-y-3 flex-1">
        {option.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <Check size={18} className="shrink-0 text-mint" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSubscribe}
        disabled={loading}
        className={cn(
          "w-full rounded-lg py-3 font-bold transition-all disabled:opacity-50",
          option.highlighted
            ? "bg-gradient-to-r from-cyan to-mint text-bg hover:shadow-lg"
            : "border border-line bg-surface-2 hover:bg-fg/5"
        )}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <LoaderCircle size={16} className="animate-spin" />
            Procesando...
          </span>
        ) : (
          "Comenzar ahora"
        )}
      </button>

      <p className="mt-3 text-center text-xs text-muted">
        {option.plan === "annual"
          ? "Cancela en cualquier momento"
          : "Período de prueba: 7 días"}
      </p>
    </div>
  );
}

export function SubscriptionSuccessModal() {
  return (
    <div className="rounded-lg border border-mint bg-mint/10 p-6 text-center">
      <div className="mb-4 inline-block rounded-full bg-mint/20 p-3">
        <Check size={24} className="text-mint" />
      </div>
      <h3 className="font-display text-lg font-bold">¡Suscripción completada!</h3>
      <p className="mt-2 text-muted">
        Tu cuenta ha sido actualizada. Accede a todas las funciones premium ahora.
      </p>
    </div>
  );
}

export function SubscriptionCancelledModal() {
  return (
    <div className="rounded-lg border border-pink bg-pink/10 p-6 text-center">
      <div className="mb-4 inline-block rounded-full bg-pink/20 p-3">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="font-display text-lg font-bold">Suscripción cancelada</h3>
      <p className="mt-2 text-muted">
        No se realizó el pago. Puedes intentarlo de nuevo en cualquier momento.
      </p>
    </div>
  );
}
