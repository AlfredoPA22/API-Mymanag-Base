import nodemailer from "nodemailer";

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
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

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

  await transporter.sendMail({
    from: `Inventasys <${process.env.EMAIL_USER}>`,
    to,
    subject: "¡Bienvenido a Inventasys!",
    html: htmlContent,
  });
};

