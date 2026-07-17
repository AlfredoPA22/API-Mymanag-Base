import cron from "node-cron";
import { Company } from "../modules/company/company.model";
import { SaleOrder } from "../modules/sale_order/sale_order.model";
import { companyStatus } from "../utils/enums/companyStatus.enum";
import { paymentMethod } from "../utils/enums/saleOrderPaymentMethod";
import { saleOrderStatus } from "../utils/enums/saleOrderStatus.enum";
import { sendAccountsReceivableReminderEmail } from "../utils/sendAccountsReceivableReminderEmail";
import { createNotification } from "../modules/notification/notification.service";

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
const FIRST_REMINDER_AFTER_DAYS = 7;
const REMIND_AGAIN_AFTER_DAYS = 7;

export const checkAccountsReceivable = async () => {
  const now = new Date();
  const companies = await Company.find({ status: companyStatus.ACTIVE }).lean();

  let totalRecordatorios = 0;

  for (const company of companies) {
    try {
      const orders = await SaleOrder.find({
        company: company._id,
        status: saleOrderStatus.APROBADO,
        payment_method: paymentMethod.CREDITO,
        is_paid: false,
      }).populate("client");

      for (const order of orders) {
        try {
          const orderAgeDays = (now.getTime() - order.date.getTime()) / MILLISECONDS_IN_DAY;
          if (orderAgeDays < FIRST_REMINDER_AFTER_DAYS) continue;

          const lastReminder = (order as any).payment_reminder_sent_at as Date | null;
          if (lastReminder) {
            const daysSinceReminder = (now.getTime() - lastReminder.getTime()) / MILLISECONDS_IN_DAY;
            if (daysSinceReminder < REMIND_AGAIN_AFTER_DAYS) continue;
          }

          const client = (order as any).client;
          if (!client?.email) continue;

          await sendAccountsReceivableReminderEmail({
            to: client.email,
            clientName: client.fullName,
            companyName: (company as any).name,
            orderCode: order.code,
            orderDate: order.date,
            total: order.total,
            currency: (company as any).currency || "Bs",
          });

          (order as any).payment_reminder_sent_at = now;
          await order.save();

          await createNotification(company._id, {
            type: "payment_reminder",
            title: "Recordatorio de pago enviado",
            message: `Se envió un recordatorio de pago a ${client.fullName} por el pedido ${order.code}.`,
            link: `/ventas/detalle/${order._id}`,
          });

          totalRecordatorios++;
        } catch (error) {
          console.error(
            `❌ Error enviando recordatorio de pago para orden ${order.code}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    } catch (error) {
      console.error(
        `❌ Error procesando cuentas por cobrar para empresa ${(company as any).name}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  if (totalRecordatorios === 0) {
    console.log("✅ Verificación de cuentas por cobrar completada — ningún recordatorio enviado");
  } else {
    console.log(
      `✅ Verificación de cuentas por cobrar completada — ${totalRecordatorios} recordatorio${totalRecordatorios > 1 ? "s" : ""} enviado${totalRecordatorios > 1 ? "s" : ""}`
    );
  }
};

// Ejecutar todos los días a las 09:00 am
export const initAccountsReceivableCron = () => {
  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log("🕘 Ejecutando verificación de cuentas por cobrar...");
      await checkAccountsReceivable();
    },
    {
      timezone: "America/La_Paz",
    }
  );
};
