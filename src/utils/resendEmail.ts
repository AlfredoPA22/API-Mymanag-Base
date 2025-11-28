import { Resend } from "resend";

let resendInstance: Resend | null = null;

// Función para obtener la instancia de Resend
export const getResendInstance = (): Resend | null => {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }

  return resendInstance;
};

// Función para enviar correo usando Resend
export const sendEmailWithResend = async (
  to: string,
  subject: string,
  html: string,
  from?: string
): Promise<{ id: string }> => {
  const resend = getResendInstance();

  if (!resend) {
    throw new Error("RESEND_API_KEY no está configurada");
  }

  const fromEmail = from || process.env.EMAIL_FROM || `Inventasys <noreply@${process.env.RESEND_DOMAIN || "inventasys.com"}>`;

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Error al enviar correo con Resend: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("No se recibió ID de correo de Resend");
  }

  return { id: data.id };
};

