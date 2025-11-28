import { getEmailTransporter } from "./emailTransporter";
import { format } from "date-fns";

export const sendExpirationWarningEmail = async (
  to: string,
  companyName: string,
  expirationDate: Date
) => {
  try {
    const formattedDate = format(expirationDate, "dd/MM/yyyy");
    const transporter = getEmailTransporter();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #eab308;">⚠️ Tu plan está por vencer</h2>
      <p>Hola <strong>${companyName}</strong>,</p>
      <p>Este es un recordatorio de que tu plan actual en <strong>Inventasys</strong> vencerá el día <strong>${formattedDate}</strong>.</p>

      <p>Para evitar la interrupción del servicio, te recomendamos realizar el pago correspondiente antes de esa fecha.</p>

      <p>Puedes iniciar sesión en la plataforma para registrar el pago o revisar los detalles de tu cuenta.</p>

      <p style="font-size: 12px; color: #888; margin-top: 20px;">
        Este correo fue generado automáticamente. No respondas a este mensaje.
      </p>
    </div>
  `;

    const info = await transporter.sendMail({
      from: `Inventasys <${process.env.EMAIL_USER}>`,
      to,
      subject: "⚠️ Tu plan vence pronto - Inventasys",
      html: htmlContent,
    });

    console.log("✅ Correo de advertencia de expiración enviado:", {
      to,
      messageId: info.messageId,
      companyName,
      expirationDate: formattedDate,
    });

    return info;
  } catch (error) {
    console.error("❌ Error al enviar correo de advertencia de expiración:", {
      to,
      companyName,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
