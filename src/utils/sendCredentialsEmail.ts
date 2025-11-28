import { sendEmailWithRetry } from "./emailTransporter";

interface SendCredentialsParams {
  to: string;
  user_name: string;
  password: string;
  company_name: string;
}

export const sendCredentialsEmail = async ({
  to,
  user_name,
  password,
  company_name,
}: SendCredentialsParams) => {
  try {
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #1d4ed8;">Bienvenido ${company_name}</h2>
      <p>Gracias por registrarte en nuestro sistema. Estas son tus credenciales para iniciar sesión:</p>
      <ul>
        <li><strong>Usuario:</strong> ${user_name}</li>
        <li><strong>Contraseña:</strong> ${password}</li>
      </ul>
      <p>Puedes cambiar tu contraseña luego de iniciar sesión.</p>
      <a href="https://mymanag.vercel.app" style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:#fff;border-radius:5px;text-decoration:none;">Iniciar sesión</a>
      <p style="font-size: 12px; color: #888; margin-top: 20px;">Este correo fue generado automáticamente. No respondas a este mensaje.</p>
    </div>
  `;

    const info = await sendEmailWithRetry({
      to,
      subject: "Tus credenciales de acceso - Inventasys",
      html: htmlContent,
    });

    const messageId = "messageId" in info ? info.messageId : info.id;
    console.log("✅ Correo de credenciales enviado:", {
      to,
      messageId,
      company_name,
      user_name,
    });

    return info;
  } catch (error) {
    console.error("❌ Error al enviar correo de credenciales:", {
      to,
      company_name,
      user_name,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Lanzar el error para que se maneje en el servicio
    throw error;
  }
};
