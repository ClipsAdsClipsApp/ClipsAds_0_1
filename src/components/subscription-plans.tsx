import { useState, type ReactNode } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { SUBSCRIPTION_PRICES } from "@/lib/stripe/plans";

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
    price: SUBSCRIPTION_PRICES.business.monthly / 100,
    currency: "EUR",
    interval: "/mes",
    features: [
      "Hasta 10 clips al mes",
      "Panel y métricas de empresa",
      "Segmentación por edad y todas las acciones",
    ],
  },
  {
    plan: "annual",
    role: "business",
    price: SUBSCRIPTION_PRICES.business.annual / 100,
    currency: "EUR",
    interval: "/año",
    features: [
      "Hasta 10 clips al mes",
      "Panel y métricas de empresa",
      "Segmentación por edad y todas las acciones",
      "Ahorro frente al pago mensual",
    ],
    highlighted: true,
  },
  {
    plan: "monthly",
    role: "enterprise",
    price: SUBSCRIPTION_PRICES.enterprise.monthly / 100,
    currency: "EUR",
    interval: "/mes",
    features: [
      "Clips ilimitados",
      "Panel y métricas de empresa",
      "Segmentación por edad y todas las acciones",
    ],
  },
  {
    plan: "annual",
    role: "enterprise",
    price: SUBSCRIPTION_PRICES.enterprise.annual / 100,
    currency: "EUR",
    interval: "/año",
    features: [
      "Clips ilimitados",
      "Panel y métricas de empresa",
      "Segmentación por edad y todas las acciones",
      "Ahorro frente al pago mensual",
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
            {new Intl.NumberFormat("es-ES", { style: "currency", currency: option.currency }).format(option.price)}
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
        Estamos confirmando tu pago. Las funciones de tu plan se activarán al recibir la confirmación de Stripe.
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
      <h3 className="font-display text-lg font-bold">Pago cancelado</h3>
      <p className="mt-2 text-muted">
        No se realizó el pago. Puedes intentarlo de nuevo en cualquier momento.
      </p>
    </div>
  );
}
