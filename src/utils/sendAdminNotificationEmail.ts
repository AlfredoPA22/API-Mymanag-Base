import { sendEmailWithRetry } from "./emailTransporter";

const ADMIN_EMAIL = "inventasysbolivia@gmail.com";

interface NewCompanyNotificationParams {
  company_name: string;
  user_name: string;
  user_email: string;
  plan: string;
  system: string;
}

interface NewPaymentNotificationParams {
  company_name: string;
  user_name: string;
  user_email: string;
  plan: string;
  system: string;
  amount: number;
  currency: string;
  method: string;
}

const SYSTEM_LABELS: Record<string, string> = {
  MYMANAG: "MyManag",
  RESERVAYA: "ReservaYa",
};

const PLAN_LABELS: Record<string, string> = {
  prueba: "Plan Gratuito (Prueba)",
  basico: "Plan Básico",
  profesional: "Plan Profesional",
};

export const sendAdminNewCompanyEmail = async (params: NewCompanyNotificationParams) => {
  const { company_name, user_name, user_email, plan, system } = params;
  const systemLabel = SYSTEM_LABELS[system] ?? system;
  const planLabel = PLAN_LABELS[plan] ?? plan;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9fafb;">
      <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1d4ed8; margin-top: 0;">🏢 Nueva empresa registrada</h2>
        <p>Se ha registrado una nueva empresa en la plataforma Inventasys.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 140px;">Empresa</td>
            <td style="padding: 8px 0; font-weight: 600;">${company_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Usuario</td>
            <td style="padding: 8px 0;">${user_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Email</td>
            <td style="padding: 8px 0;">${user_email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Sistema</td>
            <td style="padding: 8px 0;">${systemLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Plan</td>
            <td style="padding: 8px 0;">${planLabel}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; font-size: 13px; color: #6b7280;">
          ${plan === "prueba"
            ? "Este es un plan gratuito. La empresa ya tiene acceso activo."
            : "Este plan requiere aprobación de pago. Revisa la plataforma para gestionar el pago."}
        </p>
        <p style="font-size: 11px; color: #9ca3af; margin-top: 24px;">Notificación automática de Inventasys</p>
      </div>
    </div>
  `;

  try {
    await sendEmailWithRetry({
      to: ADMIN_EMAIL,
      subject: `🏢 Nueva empresa: ${company_name} (${systemLabel} - ${planLabel})`,
      html: htmlContent,
    });
    console.log("✅ Notificación al admin enviada: nueva empresa", { company_name, user_email });
  } catch (error) {
    console.error("⚠️ No se pudo notificar al admin sobre nueva empresa:", error);
  }
};

export const sendAdminNewPaymentEmail = async (params: NewPaymentNotificationParams) => {
  const { company_name, user_name, user_email, plan, system, amount, currency, method } = params;
  const systemLabel = SYSTEM_LABELS[system] ?? system;
  const planLabel = PLAN_LABELS[plan] ?? plan;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9fafb;">
      <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
        <h2 style="color: #d97706; margin-top: 0;">💳 Nuevo comprobante de pago recibido</h2>
        <p>Una empresa ha enviado un comprobante de pago y está esperando revisión.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 140px;">Empresa</td>
            <td style="padding: 8px 0; font-weight: 600;">${company_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Usuario</td>
            <td style="padding: 8px 0;">${user_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Email</td>
            <td style="padding: 8px 0;">${user_email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Sistema</td>
            <td style="padding: 8px 0;">${systemLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Plan</td>
            <td style="padding: 8px 0;">${planLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Monto</td>
            <td style="padding: 8px 0; font-weight: 600; color: #059669;">${amount} ${currency}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Método</td>
            <td style="padding: 8px 0; text-transform: capitalize;">${method}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; font-size: 13px; color: #d97706; font-weight: 500;">
          ⚠️ Revisa el comprobante en la plataforma y aprueba o rechaza el pago.
        </p>
        <p style="font-size: 11px; color: #9ca3af; margin-top: 24px;">Notificación automática de Inventasys</p>
      </div>
    </div>
  `;

  try {
    await sendEmailWithRetry({
      to: ADMIN_EMAIL,
      subject: `💳 Pago en revisión: ${company_name} - ${amount} ${currency}`,
      html: htmlContent,
    });
    console.log("✅ Notificación al admin enviada: nuevo pago", { company_name, amount, currency });
  } catch (error) {
    console.error("⚠️ No se pudo notificar al admin sobre nuevo pago:", error);
  }
};
