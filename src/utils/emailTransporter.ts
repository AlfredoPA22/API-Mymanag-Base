import nodemailer from "nodemailer";
import { Transporter } from "nodemailer";

let transporterInstance: Transporter | null = null;

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

  // Crear transporter con configuración mejorada para producción
  transporterInstance = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Para evitar problemas con certificados en producción
    },
    // Timeouts más largos para producción
    connectionTimeout: 10000, // 10 segundos
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  return transporterInstance;
};

// Función para verificar la conexión
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    const transporter = getEmailTransporter();
    await transporter.verify();
    console.log("✅ Conexión con el servidor de correo verificada");
    return true;
  } catch (error) {
    console.error("❌ Error al verificar conexión de correo:", error);
    return false;
  }
};

