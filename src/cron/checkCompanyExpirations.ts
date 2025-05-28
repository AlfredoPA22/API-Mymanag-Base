import cron from "node-cron";
import { Company } from "../modules/company/company.model";
import { companyPlan } from "../utils/enums/companyPlan.enum";
import { companyStatus } from "../utils/enums/companyStatus.enum";
import { sendExpirationWarningEmail } from "../utils/sendExpirationWarningEmail";
import { sendExpiredEmail } from "../utils/sendExpiredEmail";
import { UserLanding } from "../modules/user_landing/user_landing.model";

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

export const checkCompanyExpirations = async () => {
  const today = new Date();

  const companies = await Company.find({
    status: { $ne: companyStatus.EXPIRED },
  });

  for (const company of companies) {
    const expirationDate =
      company.plan === companyPlan.FREE
        ? company.trial_expires_at
        : company.subscription_expires_at;

    if (!expirationDate) continue;

    const creator = await UserLanding.findById(company.created_by);
    if (!creator) continue;

    const diffDays = Math.ceil(
      (expirationDate.getTime() - today.getTime()) / MILLISECONDS_IN_DAY
    );
    if (diffDays <= 3 && diffDays >= 0 && !company.notified_before_expiration) {
      console.log(`📨 Enviando aviso de expiración a ${company.name}`);
      await sendExpirationWarningEmail(
        creator.email,
        company.name,
        expirationDate
      );
      company.notified_before_expiration = true;
      await company.save();
    }
    if (expirationDate <= today) {
      company.status = companyStatus.EXPIRED;
      await company.save();
      console.log(`❌ Empresa expirada: ${company.name}`);
      await sendExpiredEmail(creator.email, company.name);
    }
  }

  console.log("✅ Verificación de expiraciones completada");
};

// Ejecutar todos los días a la 01:00 am
export const initCompanyExpirationCron = () => {
  cron.schedule(
    "00 1 * * *",
    async () => {
      console.log("🕐 Ejecutando verificación de expiraciones...");
      await checkCompanyExpirations();
    },
    {
      timezone: "America/La_Paz",
    }
  );
};
