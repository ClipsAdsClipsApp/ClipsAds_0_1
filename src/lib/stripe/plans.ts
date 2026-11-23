/**
 * Plan limits and configuration for ClipsAds subscription system
 */

export type PlanType = "free" | "business" | "enterprise";
export type PaidPlan = Exclude<PlanType, "free">;
export type BillingInterval = "monthly" | "annual";

export const SUBSCRIPTION_PRICES: Record<PaidPlan, Record<BillingInterval, number>> = {
  business: { monthly: 999, annual: 9999 },
  enterprise: { monthly: 2999, annual: 29990 },
};

export interface PlanConfig {
  id: PlanType;
  name: string;
  monthlyClipLimit: number;
  canAccessEnterprise: boolean;
  features: string[];
}

export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    id: "free",
    name: "Libre",
    monthlyClipLimit: 2,
    canAccessEnterprise: false,
    features: [
      "2 clips por mes",
      "Perfil básico",
      "Acceso a exploración",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    monthlyClipLimit: 10,
    canAccessEnterprise: true,
    features: [
      "10 clips por mes",
      "Perfil de empresa",
      "Métricas de empresa",
      "Segmentación por edad y todas las acciones",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthlyClipLimit: Infinity,
    canAccessEnterprise: true,
    features: [
      "Clips ilimitados",
      "Acceso empresa",
      "Métricas de empresa",
      "Segmentación por edad y todas las acciones",
    ],
  },
};

export function getPlanType(planString: string | undefined): PlanType {
  if (planString === "business" || planString === "enterprise") {
    return planString as PlanType;
  }
  return "free";
}

export function getPlanConfig(planType: PlanType): PlanConfig {
  return PLANS[planType];
}

export function getMonthlyClipLimit(planType: PlanType): number {
  return PLANS[planType].monthlyClipLimit;
}

export function canAccessEnterprise(planType: PlanType): boolean {
  return PLANS[planType].canAccessEnterprise;
}
