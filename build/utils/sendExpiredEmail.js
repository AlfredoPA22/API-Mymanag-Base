"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendExpiredEmail = void 0;
const emailTransporter_1 = require("./emailTransporter");
const date_fns_1 = require("date-fns");
const sendExpiredEmail = async (to, companyName) => {
    try {
        const todayFormatted = (0, date_fns_1.format)(new Date(), "dd/MM/yyyy");
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
        const info = await (0, emailTransporter_1.sendEmailWithRetry)({
            to,
            subject: "❌ Plan expirado - Inventasys",
            html: htmlContent,
        });
        const messageId = "messageId" in info ? info.messageId : info.id;
        console.log("✅ Correo de plan expirado enviado:", {
            to,
            messageId,
            companyName,
        });
        return info;
    }
    catch (error) {
        console.error("❌ Error al enviar correo de plan expirado:", {
            to,
            companyName,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
};
exports.sendExpiredEmail = sendExpiredEmail;
