import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionPlans, SubscriptionSuccessModal, SubscriptionCancelledModal } from "@/components/subscription-plans";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function PricingPage() {
  const search = new URL(window.location.href).searchParams;
  const subscription = search.get("subscription");

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
