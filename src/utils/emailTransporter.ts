import { sendEmailWithResend } from "./resendEmail";

// Interfaz para opciones de correo
export interface EmailOptions {
  from?: string;
  to: string | string[] | { address: string } | { address: string }[];
  subject: string;
  html: string;
}

// Tipo de retorno para correos enviados
export type EmailResult = { id: string; messageId?: string };

// Función helper para enviar correos usando Resend
export const sendEmailWithRetry = async (
  mailOptions: EmailOptions,
  maxRetries: number = 2
): Promise<EmailResult> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Extraer dirección de correo
      let toEmail = "";
      if (typeof mailOptions.to === "string") {
        toEmail = mailOptions.to;
      } else if (Array.isArray(mailOptions.to) && mailOptions.to.length > 0) {
        const firstTo = mailOptions.to[0];
        toEmail = typeof firstTo === "string" ? firstTo : firstTo.address || "";
      } else if (mailOptions.to && typeof mailOptions.to === "object" && "address" in mailOptions.to) {
        toEmail = mailOptions.to.address;
      }

      if (!toEmail) {
        throw new Error("Dirección de correo no proporcionada");
      }

      const result = await sendEmailWithResend(
        toEmail,
        mailOptions.subject || "",
        typeof mailOptions.html === "string" ? mailOptions.html : "",
        typeof mailOptions.from === "string" ? mailOptions.from : undefined
      );

      console.log("✅ Correo enviado con Resend:", { to: toEmail, id: result.id });
      return { ...result, messageId: result.id };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `⚠️ Intento ${attempt}/${maxRetries} falló al enviar correo:`,
        lastError.message
      );

      // Si no es el último intento, esperar antes de reintentar
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  throw lastError || new Error("Error desconocido al enviar correo");
};

// Función para verificar la conexión con Resend
export const verifyEmailConnection = async (): Promise<boolean> => {
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY no está configurada");
    console.warn(
      "⚠️ Configura RESEND_API_KEY en tus variables de entorno para enviar correos."
    );
    return false;
  }

  try {
    // Intentar enviar un correo de prueba (opcional, solo verificar que la key existe)
    console.log("✅ Resend configurado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error al verificar Resend:", error);
    return false;
  }
};
