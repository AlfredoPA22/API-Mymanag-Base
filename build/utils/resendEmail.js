"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailWithResend = exports.getResendInstance = void 0;
const resend_1 = require("resend");
let resendInstance = null;
// Función para obtener la instancia de Resend
const getResendInstance = () => {
    if (!process.env.RESEND_API_KEY) {
        return null;
    }
    if (!resendInstance) {
        resendInstance = new resend_1.Resend(process.env.RESEND_API_KEY);
    }
    return resendInstance;
};
exports.getResendInstance = getResendInstance;
// Función para enviar correo usando Resend
const sendEmailWithResend = async (to, subject, html, from) => {
    const resend = (0, exports.getResendInstance)();
    if (!resend) {
        throw new Error("RESEND_API_KEY no está configurada");
    }
    // Usar el dominio configurado o el de prueba (solo para desarrollo)
    const fromEmail = from || process.env.EMAIL_FROM || "onboarding@resend.dev";
    // Advertencia si se usa el dominio de prueba en producción
    if (!process.env.EMAIL_FROM && !from && (process.env.RENDER || process.env.VERCEL || process.env.FLY)) {
        console.warn("⚠️ Estás usando el dominio de prueba de Resend. Solo podrás enviar a tu propia dirección de correo.");
        console.warn("💡 Para enviar a cualquier destinatario, verifica un dominio en https://resend.com/domains y configura EMAIL_FROM");
    }
    const { data, error } = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html,
    });
    if (error) {
        // Mensaje de error más descriptivo
        let errorMessage = `Error al enviar correo con Resend: ${error.message}`;
        // Si el error es sobre dominio no verificado, dar instrucciones
        if (error.message.includes("testing emails") || error.message.includes("verify a domain")) {
            errorMessage += "\n\n💡 Solución: Verifica un dominio en https://resend.com/domains y configura EMAIL_FROM con ese dominio.";
        }
        throw new Error(errorMessage);
    }
    if (!data?.id) {
        throw new Error("No se recibió ID de correo de Resend");
    }
    return { id: data.id };
};
exports.sendEmailWithResend = sendEmailWithResend;
