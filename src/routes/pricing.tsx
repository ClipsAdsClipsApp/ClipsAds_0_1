import { createFileRoute } from "@tanstack/react-router";
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
        {subscription === "success" && <SubscriptionSuccessModal />}
        {subscription === "cancelled" && <SubscriptionCancelledModal />}
        
        <SubscriptionPlans />
      </div>
    </div>
  );
}
