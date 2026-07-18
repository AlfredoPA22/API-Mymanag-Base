export enum companyPlan {
  FREE = "prueba",
  BASIC = "basico",
  PRO = "profesional",
}

export const PLAN_LABELS: Record<companyPlan, string> = {
  [companyPlan.FREE]: "Prueba",
  [companyPlan.BASIC]: "Básico",
  [companyPlan.PRO]: "Profesional",
};
