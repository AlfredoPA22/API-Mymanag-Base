import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import {
  generateDepositQr as generateDepositQrClient,
  GenerateDepositQrResult,
} from "../../utils/mesaDePagosClient";
import { QrPayment } from "./qr_payment.model";
import { SaleOrder } from "../sale_order/sale_order.model";
import { Company } from "../company/company.model";
import { approve as approveSaleOrder } from "../sale_order/saleOrder.service";
import { saleOrderStatus } from "../../utils/enums/saleOrderStatus.enum";
import { createPayment } from "../sale_payment/salePayment.service";
import { createNotification } from "../notification/notification.service";
import { emitQrPaymentUpdate, emitSaleOrderPaymentUpdate } from "../../socket";
import { round2 } from "../../utils/money";
import { PaymentLanding } from "../payment_landing/payment_landing.model";
import { paymentLandingStatus } from "../../utils/enums/paymentLandingStatus.enum";
import { applyPaymentLandingApproval } from "../payment_landing/payment_landing.activation";
import {
  sendAdminAutoActivatedEmail,
  sendAdminDoublePaymentAlertEmail,
} from "../../utils/sendAdminNotificationEmail";
import { LANDING_CURRENCY } from "../../utils/landingPlanPrices";

export interface GenerateDepositQrInput {
  amount: number;
  referenceId: string;
  description?: string;
  saleOrderId: string;
  type: "venta_contado" | "abono_credito";
}

const requestQrForSaleOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrder: any,
  input: GenerateDepositQrInput,
  owner: { created_by?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId; client?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId }
): Promise<GenerateDepositQrResult> => {
  if (!input.amount || input.amount <= 0) {
    throw new Error("El monto debe ser mayor a 0");
  }

  if (!input.referenceId) {
    throw new Error("Falta la referencia del cobro");
  }

  if (input.type === "venta_contado" && saleOrder.is_paid) {
    throw new Error("Esta venta ya está pagada, no se puede generar otro QR.");
  }

  const company = await Company.findById(companyId);
  const companyCurrency = company?.currency || "Bs";

  let fiatAmountBob = input.amount;
  let exchangeRateUsed: number | undefined;

  if (companyCurrency === "$") {
    if (!company?.exchange_rate || company.exchange_rate <= 0) {
      throw new Error(
        "Configura el tipo de cambio de la empresa en Ajustes antes de generar un QR."
      );
    }
    exchangeRateUsed = company.exchange_rate;
    fiatAmountBob = round2(input.amount * exchangeRateUsed);
  }

  const result = await generateDepositQrClient({
    fiatAmount: fiatAmountBob,
    fiatCurrency: "BOB",
    referenceId: input.referenceId,
    description: input.description,
  });

  await QrPayment.create({
    company: companyId,
    sale_order: input.saleOrderId,
    created_by: owner.created_by,
    client: owner.client,
    type: input.type,
    transactionId: result.transactionId,
    referenceId: result.referenceId,
    amount: input.amount,
    currency: companyCurrency,
    amount_bob: fiatAmountBob,
    exchange_rate: exchangeRateUsed,
    status: result.transactionStatus,
  });

  return result;
};

export const generateDepositQr = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  input: GenerateDepositQrInput
): Promise<GenerateDepositQrResult> => {
  const saleOrder = await SaleOrder.findOne({
    _id: input.saleOrderId,
    company: companyId,
  });

  if (!saleOrder) {
    throw new Error("Venta no encontrada");
  }

  // Solo para ventas creadas por staff: generar un QR antes de aprobar la
  // venta dejaría abierta la misma situación que arreglamos (Borrador
  // marcada como pagada si la aprobación automática falla al confirmarse
  // el pago). La tienda sí puede generar QR en Borrador — ahí el flujo es
  // al revés a propósito (se cobra primero, se aprueba después).
  if (saleOrder.status !== saleOrderStatus.APROBADO) {
    throw new Error("Solo se puede generar un QR de cobro para una venta ya aprobada.");
  }

  return requestQrForSaleOrder(companyId, saleOrder, input, { created_by: userId });
};

export const generateDepositQrForClient = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  input: GenerateDepositQrInput
): Promise<GenerateDepositQrResult> => {
  const saleOrder = await SaleOrder.findOne({
    _id: input.saleOrderId,
    company: companyId,
    client: clientId,
  });

  if (!saleOrder) {
    throw new Error("Venta no encontrada");
  }

  return requestQrForSaleOrder(companyId, saleOrder, input, { client: clientId });
};

export const generateDepositQrForLandingPayment = async (
  payment: any,
  description?: string
): Promise<GenerateDepositQrResult> => {
  const referenceId = `LANDING-${payment._id}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const result = await generateDepositQrClient({
    fiatAmount: payment.amount,
    fiatCurrency: "BOB",
    referenceId,
    description: description || `Suscripción ${payment.system} — plan ${payment.plan}`,
  });

  await QrPayment.create({
    company: payment.company,
    payment_landing: payment._id,
    type: "landing_subscription",
    transactionId: result.transactionId,
    referenceId: result.referenceId,
    amount: payment.amount,
    currency: LANDING_CURRENCY,
    status: result.transactionStatus,
  });

  return result;
};

const handleLandingQrConfirmed = async (qrPayment: any): Promise<void> => {
  const payment = await PaymentLanding.findById(qrPayment.payment_landing);
  if (!payment) {
    console.warn(
      `⚠️ QrPayment ${qrPayment.transactionId} sin PaymentLanding asociado`
    );
    return;
  }

  if (payment.status === paymentLandingStatus.APPROVED) {
    console.warn(
      `⚠️ Pago QR ${qrPayment.transactionId} confirmado pero PaymentLanding ${payment._id} ya estaba aprobado — posible doble pago.`
    );
    await sendAdminDoublePaymentAlertEmail({
      paymentId: payment._id.toString(),
      transactionId: qrPayment.transactionId,
      amount: qrPayment.amount,
    });
    return;
  }

  const company = await Company.findById(payment.company);
  if (!company) {
    console.warn(`⚠️ Empresa no encontrada para PaymentLanding ${payment._id}`);
    return;
  }

  payment.paid_at = new Date();
  payment.status = paymentLandingStatus.APPROVED;
  await payment.save();

  await applyPaymentLandingApproval(payment, company);

  await sendAdminAutoActivatedEmail({
    company_name: company.name as string,
    plan: payment.plan,
    system: (payment as any).system || "MYMANAG",
    amount: payment.amount,
    currency: payment.currency,
    transactionId: qrPayment.transactionId,
  });
};

export const handleMesaDePagosWebhook = async (input: {
  status: string;
  transactionId?: string;
  externalReference?: string;
}) => {
  const { status, transactionId, externalReference } = input;

  if (!transactionId && !externalReference) {
    console.warn("⚠️ Webhook de Mesa de Pagos sin transactionId ni externalReference, se ignora.");
    return;
  }

  const qrPayment = await QrPayment.findOne(
    transactionId ? { transactionId } : { referenceId: externalReference }
  );

  if (!qrPayment) {
    console.warn(
      `⚠️ Webhook de Mesa de Pagos: no se encontró QrPayment (transactionId=${transactionId}, externalReference=${externalReference})`
    );
    return;
  }

  if (qrPayment.processed) {
    console.warn(
      `⚠️ Webhook de Mesa de Pagos ignorado: QrPayment ${qrPayment.transactionId} ya estaba procesado (status recibido: ${status}).`
    );
    return;
  }

  qrPayment.status = status;

  try {
    if (status !== "completed_transaction" || qrPayment.processed) {
      await qrPayment.save();
      return;
    }

    if (qrPayment.type === "landing_subscription") {
      await handleLandingQrConfirmed(qrPayment);
    } else {
      const saleOrder = await SaleOrder.findById(qrPayment.sale_order);
      if (!saleOrder) {
        await qrPayment.save();
        return;
      }

      if (qrPayment.type === "abono_credito") {
        try {
          await createPayment(qrPayment.company as any, qrPayment.created_by as any, {
            sale_order: saleOrder._id.toString(),
            date: new Date(),
            amount: qrPayment.amount,
            payment_method: "QR",
            note: `Pago automático vía QR — transacción ${qrPayment.transactionId}`,
          });
        } catch (error) {
          console.error(
            `⚠️ No se pudo registrar automáticamente el pago QR ${qrPayment.transactionId} para la venta ${saleOrder.code}:`,
            error
          );
          await createNotification(qrPayment.company as any, {
            type: "qr_payment_error",
            title: "Pago QR sin aplicar",
            message: `Se confirmó un pago por QR de ${qrPayment.amount} ${qrPayment.currency} para la venta ${saleOrder.code}, pero no se pudo registrar automáticamente. Revísalo manualmente.`,
            link: `/ventas/detalle/${saleOrder._id}`,
          });
        }
      } else {
        if (saleOrder.status === saleOrderStatus.BORRADOR) {
          try {
            await approveSaleOrder(qrPayment.company as any, saleOrder._id);
          } catch (error) {
            console.error(
              `⚠️ No se pudo aprobar automáticamente la venta ${saleOrder.code} tras el pago QR:`,
              error
            );
            await createNotification(qrPayment.company as any, {
              type: "qr_payment_error",
              title: "Venta pagada por QR sin aprobar",
              message: `Se confirmó el pago por QR de la venta ${saleOrder.code}, pero no se pudo aprobar automáticamente. Revísala manualmente.`,
              link: `/ventas/editar-venta/${saleOrder._id}`,
            });
          }
        }

        await SaleOrder.updateOne({ _id: saleOrder._id }, { $set: { is_paid: true } });

        await createNotification(qrPayment.company as any, {
          type: "qr_payment_completed",
          title: "QR de cobro pagado",
          message: `Se confirmó el pago por QR de la venta ${saleOrder.code} (${qrPayment.amount} ${qrPayment.currency}).`,
          link: `/ventas/detalle/${saleOrder._id}`,
        });
      }
    }

    qrPayment.processed = true;
    await qrPayment.save();
  } finally {
    emitQrPaymentUpdate(qrPayment.transactionId, status);
    if (qrPayment.sale_order) {
      emitSaleOrderPaymentUpdate(qrPayment.sale_order.toString(), status);
    }
  }
};
