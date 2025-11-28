import { sendEmailWithRetry } from "./emailTransporter";
import { format } from "date-fns";

export const sendExpiredEmail = async (to: string, companyName: string) => {
  try {
    const todayFormatted = format(new Date(), "dd/MM/yyyy");

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #dc2626;">❌ Tu empresa ha sido desactivada</h2>
      <p>Hola <strong>${companyName}</strong>,</p>
      <p>Te informamos que tu plan en <strong>Inventasys</strong> ha expirado el <strong>${todayFormatted}</strong>.</p>

      <p>Actualmente no puedes acceder a las funcionalidades del sistema hasta que realices el pago correspondiente.</p>

      <p>Para reactivar tu cuenta, por favor inicia sesión en el sistema y registra el pago.</p>

      <p style="font-size: 12px; color: #888; margin-top: 20px;">
        Este correo fue generado automáticamente. No respondas a este mensaje.
      </p>
    </div>
  `;

    const info = await sendEmailWithRetry({
      from: `Inventasys <${process.env.EMAIL_USER}>`,
      to,
      subject: "❌ Plan expirado - Inventasys",
      html: htmlContent,
    });

    console.log("✅ Correo de plan expirado enviado:", {
      to,
      messageId: info.messageId,
      companyName,
    });

    return info;
  } catch (error) {
    console.error("❌ Error al enviar correo de plan expirado:", {
      to,
      companyName,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
