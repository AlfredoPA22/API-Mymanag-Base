import { format } from "date-fns";
import nodemailer from "nodemailer";
import { IPaymentLanding } from "../interfaces/paymentLanding.interface";

interface SendPaymentApproveParams {
  to: string;
  user_name: string;
  payment: IPaymentLanding;
}

export const sendPaymentApproveEmail = async ({
  to,
  user_name,
  payment,
}: SendPaymentApproveParams) => {
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
      <h2 style="color: #16a34a;">✅ ¡Tu pago ha sido aprobado!</h2>
      <p>Hola <strong>${user_name}</strong>,</p>
      <p>Nos complace informarte que el pago asociado a la empresa <strong>${payment.company.name}</strong> ha sido aprobado exitosamente. Aquí tienes los detalles:</p>

      <ul style="line-height: 1.6;">
        <li><strong>ID del Pago:</strong> ${payment._id}</li>
        <li><strong>Plan:</strong> ${payment.plan}</li>
        <li><strong>Monto:</strong> ${payment.amount} ${payment.currency}</li>
        <li><strong>Método de pago:</strong> ${payment.method}</li>
        <li><strong>Fecha de pago:</strong> ${formattedDate}</li>
      </ul>

      <p>Datos de facturación:</p>
      <ul style="line-height: 1.6;">
        <li><strong>Nombre:</strong> ${payment.billing_info.name}</li>
        <li><strong>NIT:</strong> ${payment.billing_info.nit}</li>
        <li><strong>Email:</strong> ${payment.billing_info.email}</li>
      </ul>

      <p>Tu empresa ahora está activa y puedes comenzar a utilizar el sistema Inventasys.</p>
        <p>📩 En un siguiente correo te enviaremos tus credenciales de acceso para que puedas iniciar sesión.</p>

      <p style="font-size: 12px; color: #888; margin-top: 20px;">
        Este correo fue generado automáticamente. No respondas a este mensaje.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `Inventasys <${process.env.EMAIL_USER}>`,
    to,
    subject: "✅ Confirmación de pago aprobado - Inventasys",
    html: htmlContent,
  });
};
