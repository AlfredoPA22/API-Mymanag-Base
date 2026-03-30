import cron from "node-cron";
import { Company } from "../modules/company/company.model";
import { companyPlan } from "../utils/enums/companyPlan.enum";
import { companyStatus } from "../utils/enums/companyStatus.enum";
import { systemType } from "../utils/enums/systemType.enum";
import { sendExpirationWarningEmail } from "../utils/sendExpirationWarningEmail";
import { sendExpiredEmail } from "../utils/sendExpiredEmail";
import { UserLanding } from "../modules/user_landing/user_landing.model";

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

export const checkCompanyExpirations = async () => {
  const today = new Date();

  const companies = await Company.find({});

  for (const company of companies) {
    const creator = await UserLanding.findById(company.created_by);
    if (!creator) continue;

    // Check legacy top-level fields (MyManag backward compat)
    const legacyExpiration =
      company.plan === companyPlan.FREE
        ? company.trial_expires_at
        : company.subscription_expires_at;

    if (legacyExpiration && company.status !== companyStatus.EXPIRED) {
      const diffDays = Math.ceil(
        (legacyExpiration.getTime() - today.getTime()) / MILLISECONDS_IN_DAY
      );
      if (diffDays <= 3 && diffDays >= 0 && !company.notified_before_expiration) {
        console.log(`📨 Enviando aviso de expiración a ${company.name} (MyManag)`);
        await sendExpirationWarningEmail(creator.email, company.name, legacyExpiration);
        company.notified_before_expiration = true;
        await company.save();
      }
      if (legacyExpiration <= today) {
        company.status = companyStatus.EXPIRED;
        await company.save();
        console.log(`❌ Empresa expirada (MyManag): ${company.name}`);
        await sendExpiredEmail(creator.email, company.name);
      }
    }

    // Check subscriptions (multi-system)
    const subscriptions = (company as any).subscriptions as any[];
    if (!subscriptions || subscriptions.length === 0) continue;

    let modified = false;

    for (const sub of subscriptions) {
      // Skip MyManag - already handled by legacy fields above
      if (sub.system === systemType.MYMANAG) continue;
      if (sub.status === companyStatus.EXPIRED) continue;

      const expirationDate =
        sub.plan === companyPlan.FREE ? sub.trial_expires_at : sub.subscription_expires_at;

      if (!expirationDate) continue;

      const diffDays = Math.ceil(
        (new Date(expirationDate).getTime() - today.getTime()) / MILLISECONDS_IN_DAY
      );

      if (diffDays <= 3 && diffDays >= 0 && !sub.notified_before_expiration) {
        console.log(`📨 Enviando aviso de expiración a ${company.name} (${sub.system})`);
        await sendExpirationWarningEmail(creator.email, company.name, new Date(expirationDate));
        sub.notified_before_expiration = true;
        modified = true;
      }

      if (new Date(expirationDate) <= today) {
        sub.status = companyStatus.EXPIRED;
        modified = true;
        console.log(`❌ Suscripción expirada (${sub.system}): ${company.name}`);
        await sendExpiredEmail(creator.email, company.name);
      }
    }

    if (modified) {
      (company as any).markModified("subscriptions");
      await company.save();
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
