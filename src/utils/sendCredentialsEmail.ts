import nodemailer from "nodemailer";

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
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #1d4ed8;">Bienvenido ${company_name}</h2>
      <p>Gracias por registrarte en nuestro sistema. Estas son tus credenciales para iniciar sesión:</p>
      <ul>
        <li><strong>Usuario:</strong> ${user_name}</li>
        <li><strong>Contraseña:</strong> ${password}</li>
      </ul>
      <p>Puedes cambiar tu contraseña luego de iniciar sesión.</p>
      <a href="https://app.inventasys.com/login" style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:#fff;border-radius:5px;text-decoration:none;">Iniciar sesión</a>
      <p style="font-size: 12px; color: #888; margin-top: 20px;">Este correo fue generado automáticamente. No respondas a este mensaje.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `Inventasys <${process.env.EMAIL_USER}>`,
    to,
    subject: "Tus credenciales de acceso - Inventasys",
    html: htmlContent,
  });
};
