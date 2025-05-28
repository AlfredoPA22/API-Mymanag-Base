import { format } from "date-fns";
import nodemailer from "nodemailer";
import { IPaymentLanding } from "../interfaces/paymentLanding.interface";

interface SendPaymentRejectedParams {
  to: string;
  user_name: string;
  payment: IPaymentLanding;
  reason?: string; // opcional, para dar una razón del rechazo
}

export const sendPaymentRejectedEmail = async ({
  to,
  user_name,
  payment,
  reason,
}: SendPaymentRejectedParams) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const formattedDate = format(new Date(payment.paid_at), "dd/MM/yyyy");

  const htmlContent = `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color: #dc2626;">❌ Tu pago ha sido rechazado</h2>
    <p>Hola <strong>${user_name}</strong>,</p>
    <p>Lamentamos informarte que el pago realizado para la empresa <strong>${payment.company.name}</strong> no ha sido aprobado. A continuación te mostramos los detalles:</p>

    <ul style="line-height: 1.6;">
      <li><strong>ID del Pago:</strong> ${payment._id}</li>
      <li><strong>Plan:</strong> ${payment.plan}</li>
      <li><strong>Monto:</strong> ${payment.amount} ${payment.currency}</li>
      <li><strong>Método de pago:</strong> ${payment.method}</li>
      <li><strong>Fecha de intento:</strong> ${formattedDate}</li>
    </ul>

    ${
      reason
        ? `<p><strong>Motivo del rechazo:</strong> ${reason}</p>`
        : `<p>Por favor, revisa los datos proporcionados o vuelve a intentarlo con otro método de pago.</p>`
    }

    <p><strong>🔁 Para que podamos volver a revisar tu caso, por favor sube un nuevo comprobante de pago desde la plataforma.</strong></p>

    <p>Si tienes alguna duda o necesitas ayuda, puedes responder a este correo o contactarnos a través de nuestra página.</p>

    <p style="font-size: 12px; color: #888; margin-top: 20px;">
      Este correo fue generado automáticamente. No respondas a este mensaje.
    </p>
  </div>
`;

  await transporter.sendMail({
    from: `Inventasys <${process.env.EMAIL_USER}>`,
    to,
    subject: "❌ Pago rechazado - Inventasys",
    html: htmlContent,
  });
};
