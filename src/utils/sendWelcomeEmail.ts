import { sendEmailWithRetry } from "./emailTransporter";

interface SendWelcomeEmailParams {
  to: string;
  company_name: string;
  plan: string;
}

export const sendWelcomeEmail = async ({
  to,
  company_name,
  plan,
}: SendWelcomeEmailParams) => {
  try {
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #1d4ed8;">¡Bienvenido a Inventasys!</h2>
      <p>Hola,</p>
      <p>Nos complace darte la bienvenida a <strong>Inventasys</strong>. Tu empresa <strong>${company_name}</strong> ha sido registrada exitosamente con el plan <strong>${plan}</strong>.</p>
      <p>Estamos emocionados de tenerte como parte de nuestra comunidad y esperamos que nuestra plataforma te ayude a gestionar tu negocio de manera eficiente.</p>
      ${
        plan === "FREE"
          ? '<p>Como tienes el plan gratuito, recibirás tus credenciales de acceso en un momento.</p>'
          : '<p>Una vez que tu pago sea aprobado por nuestro equipo, recibirás tus credenciales de acceso para comenzar a utilizar el sistema.</p>'
      }
      <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.</p>
      <p style="margin-top: 30px;">¡Gracias por confiar en nosotros!</p>
      <p style="font-size: 12px; color: #888; margin-top: 20px;">Este correo fue generado automáticamente. No respondas a este mensaje.</p>
    </div>
  `;

    const info = await sendEmailWithRetry({
      from: `Inventasys <${process.env.EMAIL_USER}>`,
      to,
      subject: "¡Bienvenido a Inventasys!",
      html: htmlContent,
    });

    const messageId = "messageId" in info ? info.messageId : info.id;
    console.log("✅ Correo de bienvenida enviado:", {
      to,
      messageId,
      company_name,
    });

    return info;
  } catch (error) {
    console.error("❌ Error al enviar correo de bienvenida:", {
      to,
      company_name,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // No lanzar el error para que no rompa el flujo de creación de empresa
    // pero sí registrarlo para debugging
    throw error;
  }
};

