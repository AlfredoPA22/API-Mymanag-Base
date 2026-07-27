import { companyPlan } from "./enums/companyPlan.enum";
import { systemType } from "./enums/systemType.enum";

export const LANDING_CURRENCY = "Bs";

export const landingPlanPrices: Record<
  systemType,
  Partial<Record<companyPlan, number>>
> = {
  [systemType.MYMANAG]: {
    [companyPlan.BASIC]: 299,
    [companyPlan.PRO]: 599,
  },
  [systemType.RESERVAYA]: {
    [companyPlan.BASIC]: 199,
    [companyPlan.PRO]: 399,
  },
};

export const getLandingPlanPrice = (
  system: systemType,
  plan: companyPlan
): number => {
  const price = landingPlanPrices[system]?.[plan];
  if (!price) {
    throw new Error(`No hay un precio configurado para ${system}/${plan}`);
  }
  return price;
};
