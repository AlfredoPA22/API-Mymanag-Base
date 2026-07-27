import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import {
  IPaymentLanding,
  PaymentLandingInput,
} from "../../interfaces/paymentLanding.interface";
import { PaymentLanding } from "./payment_landing.model";
import { paymentLandingStatus } from "../../utils/enums/paymentLandingStatus.enum";
import { paymentLandingMethod } from "../../utils/enums/paymentLandingMethod.enum";
import { UserLanding } from "../user_landing/user_landing.model";
import { Company } from "../company/company.model";
import { userLandingType } from "../../utils/enums/userLandingType.enum";
import { sendPaymentRejectedEmail } from "../../utils/sendPaymentRejectEmail";
import { systemType } from "../../utils/enums/systemType.enum";
import { companyPlan } from "../../utils/enums/companyPlan.enum";
import { sendAdminNewPaymentEmail } from "../../utils/sendAdminNotificationEmail";
import { applyPaymentLandingApproval } from "./payment_landing.activation";
import { getLandingPlanPrice, LANDING_CURRENCY } from "../../utils/landingPlanPrices";
import {
  generateDepositQrForLandingPayment,
} from "../qr_payment/qr_payment.service";
import { GenerateDepositQrResult } from "../../utils/mesaDePagosClient";

export const createPaymentLanding = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  paymentLandingInput: PaymentLandingInput
) => {
  if (!paymentLandingInput.proof_url) {
    throw new Error("Debe subir el comprobante de pago");
  }

  const system = (paymentLandingInput.system as systemType) || systemType.MYMANAG;

  const existing = await PaymentLanding.findOne({
    company: paymentLandingInput.company,
    system,
    status: paymentLandingStatus.REVIEW,
  });

  if (existing) {
    throw new Error("Ya existe un pago en revision para esta empresa y sistema");
  }

  const newPayment = await PaymentLanding.create({
    company: paymentLandingInput.company,
    system,
    plan: paymentLandingInput.plan,
    amount: paymentLandingInput.amount,
    currency: paymentLandingInput.currency,
    method: paymentLandingInput.method,
    proof_url: paymentLandingInput.proof_url || "",
    paid_at: new Date(),
    billing_info: {
      name: paymentLandingInput.billing_name || "",
      nit: paymentLandingInput.billing_nit || "",
      email: paymentLandingInput.billing_email || "",
    },
    created_by: userId,
  });

  const populatedPayment = await PaymentLanding.findById(
    newPayment._id
  ).populate("company");

  // Notificar al administrador de Inventasys
  const companyDoc = await Company.findById(paymentLandingInput.company);
  const userDoc = await UserLanding.findById(userId);
  if (companyDoc && userDoc) {
    await sendAdminNewPaymentEmail({
      company_name: companyDoc.name as string,
      user_name: userDoc.fullName,
      user_email: userDoc.email,
      plan: paymentLandingInput.plan,
      system: (paymentLandingInput.system as string) || systemType.MYMANAG,
      amount: paymentLandingInput.amount,
      currency: paymentLandingInput.currency,
      method: paymentLandingInput.method,
    });
  }

  return populatedPayment;
};

export const listPaymentLandingByCompany = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IPaymentLanding[]> => {
  const foundUser = await UserLanding.findById(userId);

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const isAdmin = foundUser.user_type === userLandingType.ADMIN;

  if (!isAdmin) {
    const company = await Company.findOne({
      _id: companyId,
      created_by: userId,
    });

    if (!company) {
      throw new Error("Empresa no encontrada o no pertenece al usuario");
    }
  }

  const listPaymentLanding = await PaymentLanding.find({
    company: companyId,
  })
    .populate("company")
    .lean<IPaymentLanding[]>();

  return listPaymentLanding;
};

export const approvePaymentLanding = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  paymentId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IPaymentLanding> => {
  const user = await UserLanding.findById(userId);
  if (!user) throw new Error("Usuario no encontrado");
  if (user.user_type !== userLandingType.ADMIN) {
    throw new Error("No tienes permisos para aprobar pagos");
  }

  const payment = await PaymentLanding.findById(paymentId);
  if (!payment) throw new Error("Pago no encontrado");
  if (payment.status === paymentLandingStatus.APPROVED) {
    throw new Error("Este pago ya fue aprobado");
  }

  const company = await Company.findById(payment.company);
  if (!company) throw new Error("Empresa no encontrada");

  return applyPaymentLandingApproval(payment, company);
};

export const generateDepositQrForLanding = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  companyId: string,
  plan: companyPlan,
  system: systemType = systemType.MYMANAG,
  billing?: { name?: string; nit?: string; email?: string }
): Promise<GenerateDepositQrResult> => {
  const user = await UserLanding.findById(userId);
  if (!user) throw new Error("Usuario no encontrado");

  const isAdmin = user.user_type === userLandingType.ADMIN;
  const company = isAdmin
    ? await Company.findById(companyId)
    : await Company.findOne({ _id: companyId, created_by: userId });
  if (!company) throw new Error("Empresa no encontrada o no pertenece al usuario");

  if (plan !== companyPlan.BASIC && plan !== companyPlan.PRO) {
    throw new Error("Plan inválido para pago");
  }

  const price = getLandingPlanPrice(system, plan);

  let payment = await PaymentLanding.findOne({
    company: companyId,
    system,
    status: paymentLandingStatus.REVIEW,
  });

  if (payment && payment.method !== paymentLandingMethod.QR) {
    throw new Error(
      "Ya tienes un pago en revisión para esta empresa y sistema. Contacta a soporte."
    );
  }

  if (!payment) {
    payment = await PaymentLanding.create({
      company: companyId,
      system,
      plan,
      amount: price,
      currency: LANDING_CURRENCY,
      method: paymentLandingMethod.QR,
      status: paymentLandingStatus.REVIEW,
      proof_url: "",
      paid_at: null,
      billing_info: {
        name: billing?.name || "",
        nit: billing?.nit || "",
        email: billing?.email || user.email,
      },
      created_by: userId,
    });
  } else if (payment.plan !== plan) {
    payment.plan = plan;
    payment.amount = price;
    await payment.save();
  }

  return generateDepositQrForLandingPayment(
    payment,
    `Suscripción ${system} — plan ${plan}`
  );
};

export const rejectPaymentLanding = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  paymentId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IPaymentLanding> => {
  const user = await UserLanding.findById(userId);

  if (!user) throw new Error("Usuario no encontrado");
  if (user.user_type !== userLandingType.ADMIN) {
    throw new Error("No tienes permisos para rechazar pagos");
  }

  const payment = await PaymentLanding.findById(paymentId);
  if (!payment) throw new Error("Pago no encontrado");
  if (payment.status === paymentLandingStatus.APPROVED) {
    throw new Error("No se puede rechazar un pago ya aprobado");
  }

  const paymentCreator = await UserLanding.findById(payment.created_by);
  if (!paymentCreator) throw new Error("Usuario creador del pago no encontrado");

  payment.status = paymentLandingStatus.REJECTED;
  await payment.save();

  const updatePayment = await PaymentLanding.findById(paymentId)
    .populate("company")
    .lean<IPaymentLanding>();

  if (!updatePayment) throw new Error("Pago no encontrado");

  try {
    await sendPaymentRejectedEmail({
      to: paymentCreator.email,
      user_name: paymentCreator.fullName,
      payment: updatePayment,
      reason: "El pago no fue recibido o el comprobante es inválido",
    });
  } catch (error) {
    console.error("⚠️ No se pudo enviar correo de rechazo de pago:", error);
  }

  return updatePayment;
};

export const updatePaymentLanding = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  paymentId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  proof_url: string
): Promise<IPaymentLanding> => {
  const payment = await PaymentLanding.findById(paymentId);

  if (!payment) throw new Error("Pago no encontrado");

  if (!payment.created_by.equals(new MongooseTypes.ObjectId(`${userId}`))) {
    throw new Error("No tienes permisos para modificar este pago");
  }

  if (
    payment.status !== paymentLandingStatus.REJECTED &&
    payment.status !== paymentLandingStatus.REVIEW
  ) {
    throw new Error("Solo puedes actualizar pagos rechazados o pendientes");
  }

  const lastPayment = await PaymentLanding.findOne({
    company: payment.company,
    system: payment.system,
  })
    .sort({ paid_at: -1, createdAt: -1 })
    .limit(1);

  if (!lastPayment) throw new Error("No se pudo determinar el último pago realizado.");

  if (lastPayment._id.toString() !== payment._id.toString()) {
    throw new Error("Solo puedes actualizar el comprobante del último pago realizado.");
  }

  payment.proof_url = proof_url;
  payment.status = paymentLandingStatus.REVIEW;
  await payment.save();

  const updatedPayment = await PaymentLanding.findById(paymentId)
    .populate("company")
    .lean<IPaymentLanding | null>();

  if (!updatedPayment) throw new Error("Pago actualizado no encontrado");

  return updatedPayment;
};
