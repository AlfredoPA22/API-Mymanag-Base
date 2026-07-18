import { companyPlan, PLAN_LABELS } from "./enums/companyPlan.enum";

// Valida un límite del plan y arma un mensaje de error claro. Si `currentCount`
// ya supera el límite (no solo lo alcanza), es porque la empresa bajó de plan
// teniendo más recursos de los que el plan nuevo permite — se lo explicita en
// el mensaje en vez de mostrar el mismo error genérico de "límite alcanzado".
export const assertPlanLimit = (
  plan: companyPlan,
  resourceLabelPlural: string,
  currentCount: number,
  limit: number,
  opts?: { perMonth?: boolean }
) => {
  if (!limit || limit === Infinity || currentCount < limit) return;

  const planLabel = PLAN_LABELS[plan] ?? plan;
  const period = opts?.perMonth ? " por mes" : "";

  if (currentCount > limit) {
    const hint = opts?.perMonth
      ? "Espera al próximo mes o actualiza tu plan para seguir registrando."
      : "Elimina algunos o actualiza tu plan para poder seguir agregando.";
    throw new Error(
      `Tu plan actual (${planLabel}) permite hasta ${limit} ${resourceLabelPlural}${period}, pero ya tenés ${currentCount} (probablemente por un cambio de plan). ${hint}`
    );
  }

  throw new Error(
    `Tu plan actual (${planLabel}) solo permite hasta ${limit} ${resourceLabelPlural}${period}.`
  );
};
