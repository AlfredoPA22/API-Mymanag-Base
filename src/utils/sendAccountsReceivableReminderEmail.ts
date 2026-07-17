import { sendEmailWithRetry } from "./emailTransporter";

interface SendAccountsReceivableReminderParams {
  to: string;
  clientName: string;
  companyName: string;
  orderCode: string;
  orderDate: Date;
  total: number;
  currency: string;
}

export const sendAccountsReceivableReminderEmail = async ({
  to,
  clientName,
  companyName,
  orderCode,
  orderDate,
  total,
  currency,
}: SendAccountsReceivableReminderParams) => {
  const formattedDate = new Date(orderDate).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #d97706;">💳 Recordatorio de pago pendiente</h2>
      <p>Hola <strong>${clientName}</strong>,</p>
      <p>Te escribimos de parte de <strong>${companyName}</strong> para recordarte que tienes un pago pendiente:</p>
      <ul style="line-height: 1.6;">
        <li><strong>Pedido:</strong> ${orderCode}</li>
        <li><strong>Fecha del pedido:</strong> ${formattedDate}</li>
        <li><strong>Monto:</strong> ${total.toFixed(2)} ${currency}</li>
      </ul>
      <p>Por favor, ponte en contacto para coordinar el pago a la brevedad.</p>
      <p style="font-size: 12px; color: #888; margin-top: 20px;">
        Este correo fue generado automáticamente por Inventasys en representación de ${companyName}. No respondas a este mensaje.
      </p>
    </div>
  `;

  try {
    const info = await sendEmailWithRetry({
      to,
      subject: `💳 Recordatorio de pago pendiente - Pedido ${orderCode}`,
      html: htmlContent,
    });

    const messageId = "messageId" in info ? info.messageId : info.id;
    console.log("✅ Recordatorio de cuenta por cobrar enviado:", {
      to,
      messageId,
      orderCode,
      companyName,
    });

    return info;
  } catch (error) {
    console.error("❌ Error al enviar recordatorio de cuenta por cobrar:", {
      to,
      orderCode,
      companyName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
