import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import {
  IPaymentLanding,
  PaymentLandingInput,
} from "../../interfaces/paymentLanding.interface";
import { PaymentLanding } from "./payment_landing.model";
import { paymentLandingStatus } from "../../utils/enums/paymentLandingStatus.enum";
import { UserLanding } from "../user_landing/user_landing.model";
import { Company } from "../company/company.model";
import { userLandingType } from "../../utils/enums/userLandingType.enum";
import { sendPaymentApproveEmail } from "../../utils/sendPaymentApproveEmail";
import { sendPaymentRejectedEmail } from "../../utils/sendPaymentRejectEmail";
import { companyStatus } from "../../utils/enums/companyStatus.enum";
import { addMonths } from "date-fns";
import { Role } from "../role/role.model";
import { PERMISSIONS_MOCK } from "../permission/utils/permissionsMock";
import { generatePassword, generateUsername } from "../company/company.service";
import { User } from "../user/user.model";
import { sendCredentialsEmail } from "../../utils/sendCredentialsEmail";

export const createPaymentLanding = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  paymentLandingInput: PaymentLandingInput
) => {
  if (!paymentLandingInput.proof_url) {
    throw new Error("Debe subir el comprobante de pago");
  }

  const existing = await PaymentLanding.findOne({
    company: paymentLandingInput.company,
    status: paymentLandingStatus.REVIEW,
  });

  if (existing) {
    throw new Error("Ya existe un pago en revision para la empresa");
  }

  const newPayment = await PaymentLanding.create({
    company: paymentLandingInput.company,
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
  if (!user) {
    throw new Error("Usuario no encontrado");
  }
  if (user.user_type !== userLandingType.ADMIN) {
    throw new Error("No tienes permisos para aprobar pagos");
  }

  const payment = await PaymentLanding.findById(paymentId);
  if (!payment) {
    throw new Error("Pago no encontrado");
  }
  if (payment.status === paymentLandingStatus.APPROVED) {
    throw new Error("Este pago ya fue aprobado");
  }

  const paymentCreator = await UserLanding.findById(payment.created_by);
  if (!paymentCreator) {
    throw new Error("Usuario creador del pago no encontrado");
  }

  const company = await Company.findById(payment.company._id);
  if (!company) throw new Error("Empresa no encontrada");

  const companyCreator = await UserLanding.findById(company.created_by);
  if (!companyCreator) {
    throw new Error("Usuario creador de la empresa no encontrado");
  }

  payment.status = paymentLandingStatus.APPROVED;
  await payment.save();

  const isFirstTime = company.status === companyStatus.PENDING;
  const isPlanChange = company.plan !== payment.plan;

  if (isFirstTime) {
    const role = await Role.create({
      company: company._id,
      name: "Administrador",
      description: "Rol administrador",
      permission: PERMISSIONS_MOCK,
    });

    const user_name = generateUsername(company.name);
    const password = generatePassword();

    await User.create({
      company: company._id,
      user_name,
      password,
      role: role._id,
      is_global: true,
      is_admin: true,
    });

    await sendCredentialsEmail({
      to: companyCreator.email,
      user_name,
      password,
      company_name: company.name,
    });

    company.status = companyStatus.ACTIVE;
    company.plan = payment.plan;
    company.trial_expires_at = null;
    company.subscription_expires_at = addMonths(new Date(), 1);
    company.notified_before_expiration = false;
  } else {
    const today = new Date();
    const baseDate: Date =
      company.subscription_expires_at && company.subscription_expires_at > today
        ? company.subscription_expires_at
        : today;

    if (isPlanChange || payment.amount > 0) {
      company.status = companyStatus.ACTIVE;
      company.plan = payment.plan;
      company.trial_expires_at = null;
      company.subscription_expires_at = addMonths(baseDate, 1);
      company.notified_before_expiration = false;
    }
  }

  await company.save();

  const updatePayment = await PaymentLanding.findById(paymentId)
    .populate("company")
    .lean<IPaymentLanding>();

  if (!updatePayment) {
    throw new Error("Pago no encontrado");
  }

  await sendPaymentApproveEmail({
    to: paymentCreator.email,
    user_name: paymentCreator.fullName,
    payment: updatePayment,
  });

  return updatePayment;
};

export const rejectPaymentLanding = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  paymentId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IPaymentLanding> => {
  const user = await UserLanding.findById(userId);

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  if (user.user_type !== userLandingType.ADMIN) {
    throw new Error("No tienes permisos para rechazar pagos");
  }

  const payment = await PaymentLanding.findById(paymentId);

  if (!payment) {
    throw new Error("Pago no encontrado");
  }

  if (payment.status === paymentLandingStatus.APPROVED) {
    throw new Error("No se puede rechazar un pago ya aprobado");
  }

  const paymentCreator = await UserLanding.findById(payment.created_by);

  if (!paymentCreator) {
    throw new Error("Usuario creador del pago no encontrado");
  }

  payment.status = paymentLandingStatus.REJECTED;
  await payment.save();

  const updatePayment = await PaymentLanding.findById(paymentId)
    .populate("company")
    .lean<IPaymentLanding>();

  if (!updatePayment) {
    throw new Error("Pago no encontrado");
  }

  await sendPaymentRejectedEmail({
    to: paymentCreator.email,
    user_name: paymentCreator.fullName,
    payment: updatePayment,
    reason: "El pago no fue recibido o el comprobante es inválido",
  });

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
  })
    .sort({ paid_at: -1, createdAt: -1 })
    .limit(1);

  if (!lastPayment) {
    throw new Error("No se pudo determinar el último pago realizado.");
  }

  if (lastPayment._id.toString() !== payment._id.toString()) {
    throw new Error(
      "Solo puedes actualizar el comprobante del último pago realizado."
    );
  }

  payment.proof_url = proof_url;
  payment.status = paymentLandingStatus.REVIEW;

  await payment.save();

  const updatedPayment = await PaymentLanding.findById(paymentId)
    .populate("company")
    .lean<IPaymentLanding | null>();

  if (!updatedPayment) {
    throw new Error("Pago actualizado no encontrado");
  }

  return updatedPayment;
};
