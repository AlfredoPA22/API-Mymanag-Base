import { addMonths } from "date-fns";
import { IPaymentLanding } from "../../interfaces/paymentLanding.interface";
import { PaymentLanding } from "./payment_landing.model";
import { paymentLandingStatus } from "../../utils/enums/paymentLandingStatus.enum";
import { UserLanding } from "../user_landing/user_landing.model";
import { companyStatus } from "../../utils/enums/companyStatus.enum";
import { systemType } from "../../utils/enums/systemType.enum";
import { companyPlan } from "../../utils/enums/companyPlan.enum";
import { companyPlanLimits } from "../../utils/planLimits";
import {
  activateFirstMyManagUser,
  activateFirstReservaYaUser,
} from "../company/company.service";
import { User } from "../user/user.model";
import { sendPaymentApproveEmail } from "../../utils/sendPaymentApproveEmail";

/**
 * Aplica la activación/renovación de suscripción para un pago ya confirmado.
 * Compartida entre la aprobación manual (admin) y la confirmación automática
 * por webhook — no depende de qr_payment.service.ts ni de payment_landing.service.ts
 * para evitar un import circular entre ambos.
 */
export const applyPaymentLandingApproval = async (
  payment: any,
  company: any
): Promise<IPaymentLanding> => {
  const paymentCreator = await UserLanding.findById(payment.created_by);
  if (!paymentCreator) throw new Error("Usuario creador del pago no encontrado");

  const companyCreator = await UserLanding.findById(company.created_by);
  if (!companyCreator) throw new Error("Usuario creador de la empresa no encontrado");

  payment.status = paymentLandingStatus.APPROVED;
  if (!payment.paid_at) payment.paid_at = new Date();
  await payment.save();

  const paymentSystem = ((payment as any).system as systemType) || systemType.MYMANAG;
  const isMyManag = paymentSystem === systemType.MYMANAG;

  const subIndex = (company as any).subscriptions.findIndex(
    (s: any) => s.system === paymentSystem
  );

  const today = new Date();

  const existingSubStatus: string | null =
    subIndex !== -1 ? (company as any).subscriptions[subIndex].status : null;

  const existingMyManagUser = isMyManag
    ? await User.findOne({ company: company._id })
    : null;

  const isFirstActivation =
    subIndex === -1 ||
    (isMyManag && !existingMyManagUser) ||
    (!isMyManag && existingSubStatus === companyStatus.PENDING);

  if (subIndex === -1) {
    (company as any).subscriptions.push({
      system: paymentSystem,
      plan: payment.plan,
      status: companyStatus.ACTIVE,
      trial_expires_at: null,
      subscription_expires_at: addMonths(today, 1),
      notified_before_expiration: false,
    });
  } else {
    const sub = (company as any).subscriptions[subIndex];
    const baseDate =
      !isFirstActivation && sub.subscription_expires_at && sub.subscription_expires_at > today
        ? sub.subscription_expires_at
        : today;

    (company as any).subscriptions[subIndex] = {
      system: paymentSystem,
      plan: payment.plan,
      status: companyStatus.ACTIVE,
      trial_expires_at: null,
      subscription_expires_at: addMonths(baseDate, 1),
      notified_before_expiration: false,
    };
  }

  if (isFirstActivation) {
    if (isMyManag) {
      await activateFirstMyManagUser(company, companyCreator.email);
    }

    if (paymentSystem === systemType.RESERVAYA) {
      await activateFirstReservaYaUser(company, companyCreator.email);
    }
  }

  if (isMyManag) {
    const isFirstTime = company.status === companyStatus.PENDING;
    if (isFirstTime) {
      company.status = companyStatus.ACTIVE;
      company.plan = payment.plan;
      company.trial_expires_at = null;
      company.subscription_expires_at = addMonths(today, 1);
      company.notified_before_expiration = false;
    } else {
      const baseDate =
        company.subscription_expires_at && company.subscription_expires_at > today
          ? company.subscription_expires_at
          : today;
      company.status = companyStatus.ACTIVE;
      company.plan = payment.plan;
      company.trial_expires_at = null;
      company.subscription_expires_at = addMonths(baseDate, 1);
      company.notified_before_expiration = false;
    }

    if (!companyPlanLimits[payment.plan as companyPlan]?.hasStore) {
      company.store_enabled = false;
    }
  }

  (company as any).markModified("subscriptions");
  await company.save();

  const updatePayment = await PaymentLanding.findById(payment._id)
    .populate("company")
    .lean<IPaymentLanding>();

  if (!updatePayment) throw new Error("Pago no encontrado");

  try {
    await sendPaymentApproveEmail({
      to: paymentCreator.email,
      user_name: paymentCreator.fullName,
      payment: updatePayment,
      isFirstActivation,
    });
  } catch (error) {
    console.error("⚠️ No se pudo enviar correo de aprobación:", error);
  }

  return updatePayment;
};
