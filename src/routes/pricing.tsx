import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SubscriptionPlans, SubscriptionSuccessModal, SubscriptionCancelledModal } from "@/components/subscription-plans";

export const Route = createFileRoute("/pricing")({
  validateSearch: (search: Record<string, unknown>) => ({
    subscription: typeof search.subscription === "string" ? search.subscription : undefined,
  }),
  component: PricingPage,
});

function PricingPage() {
  const { subscription } = Route.useSearch();

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-fg/5"
        >
          <ArrowLeft size={16} />
          Volver al inicio
        </Link>
        {subscription === "success" && <SubscriptionSuccessModal />}
        {subscription === "cancelled" && <SubscriptionCancelledModal />}
        
        <SubscriptionPlans />
      </div>
    </div>
  );
}
