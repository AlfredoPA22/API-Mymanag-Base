import nodemailer from "nodemailer";
import { Transporter, SentMessageInfo } from "nodemailer";

let transporterInstance: Transporter | null = null;

// Función helper para enviar correos con reintentos
export const sendEmailWithRetry = async (
  mailOptions: nodemailer.SendMailOptions,
  maxRetries: number = 2
): Promise<SentMessageInfo> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Reiniciar la instancia para nueva conexión en cada intento
      if (attempt > 1) {
        transporterInstance = null;
      }

      const transporter = getEmailTransporter();

      // Enviar con timeout
      const result = await Promise.race([
        transporter.sendMail(mailOptions),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout al enviar correo")), 15000)
        ),
      ]);

      return result;
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

export const getEmailTransporter = (): Transporter => {
  // Validar variables de entorno
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "EMAIL_USER y EMAIL_PASS deben estar configuradas en las variables de entorno"
    );
  }

  // Reutilizar la instancia si ya existe
  if (transporterInstance) {
    return transporterInstance;
  }

  // Detectar si estamos en un entorno que puede bloquear SMTP (Render, Vercel, etc.)
  const isServerless = process.env.VERCEL || process.env.RENDER || process.env.FLY;

  // Configuración para entornos serverless/hosting que pueden bloquear puertos
  // Usar puerto 465 (SSL) que suele estar menos bloqueado que 587
  const config = isServerless
    ? {
        // Configuración optimizada para Render y otros servicios que bloquean SMTP
        host: "smtp.gmail.com",
        port: 465, // Puerto SSL que suele estar menos bloqueado
        secure: true, // SSL directo (requerido para puerto 465)
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
          // No especificar ciphers para permitir negociación automática
        },
        // Timeouts ajustados para entornos serverless
        connectionTimeout: 8000, // 8 segundos
        greetingTimeout: 8000,
        socketTimeout: 8000,
        // Desactivar pool en serverless para evitar problemas de conexión persistente
        pool: false,
      }
    : {
        // Configuración estándar para desarrollo/local
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // STARTTLS
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      };

  transporterInstance = nodemailer.createTransport(config);

  return transporterInstance;
};

// Función para verificar la conexión con reintentos
export const verifyEmailConnection = async (): Promise<boolean> => {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Reiniciar la instancia para intentar nueva conexión
      transporterInstance = null;
      const transporter = getEmailTransporter();
      
      // Timeout más corto para verificación
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout en verificación")), 5000)
        ),
      ]);

      console.log("✅ Conexión con el servidor de correo verificada");
      return true;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `⚠️ Intento ${attempt}/${maxRetries} falló al verificar conexión de correo:`,
        lastError.message
      );

      // Si no es el último intento, esperar un poco antes de reintentar
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  console.error("❌ Error al verificar conexión de correo después de todos los intentos:", lastError);
  console.warn(
    "⚠️ Los correos pueden no enviarse. Verifica que los puertos SMTP no estén bloqueados en tu plataforma de hosting."
  );
  return false;
};

