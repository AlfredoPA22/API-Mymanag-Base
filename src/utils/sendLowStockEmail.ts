import { sendEmailWithRetry } from "./emailTransporter";

export interface LowStockProduct {
  code: string;
  name: string;
  stock: number;
  min_stock: number;
}

export const sendLowStockEmail = async (
  to: string,
  companyName: string,
  products: LowStockProduct[]
) => {
  try {
    const rows = products
      .map(
        (p) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0;">${p.code}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0;">${p.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; text-align: center; color: ${p.stock === 0 ? "#ef4444" : "#f97316"}; font-weight: bold;">
            ${p.stock}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; text-align: center; color: #6b7280;">
            ${p.min_stock}
          </td>
        </tr>`
      )
      .join("");

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316; margin-bottom: 4px;">⚠️ Alerta de stock bajo</h2>
        <p style="color: #6b7280; margin-top: 0;">Reporte diario — ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>

        <p>Hola <strong>${companyName}</strong>,</p>
        <p>Los siguientes productos han alcanzado o superado su límite mínimo de stock:</p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px;">
          <thead>
            <tr style="background-color: #fff7ed;">
              <th style="padding: 10px 12px; text-align: left; color: #92400e; font-weight: 600; border-bottom: 2px solid #fed7aa;">Código</th>
              <th style="padding: 10px 12px; text-align: left; color: #92400e; font-weight: 600; border-bottom: 2px solid #fed7aa;">Producto</th>
              <th style="padding: 10px 12px; text-align: center; color: #92400e; font-weight: 600; border-bottom: 2px solid #fed7aa;">Stock actual</th>
              <th style="padding: 10px 12px; text-align: center; color: #92400e; font-weight: 600; border-bottom: 2px solid #fed7aa;">Stock mínimo</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <p style="margin-top: 20px; color: #374151;">
          Te recomendamos reponer el inventario de estos productos para evitar quiebres de stock.
        </p>

        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 12px;">
          Este correo fue generado automáticamente por <strong>Inventasys</strong>. No respondas a este mensaje.
        </p>
      </div>
    `;

    const info = await sendEmailWithRetry({
      to,
      subject: `⚠️ [${companyName}] ${products.length} producto${products.length > 1 ? "s" : ""} con stock bajo - Inventasys`,
      html: htmlContent,
    });

    const messageId = "messageId" in info ? info.messageId : info.id;
    console.log("✅ Correo de stock bajo enviado:", {
      to,
      messageId,
      companyName,
      productCount: products.length,
    });

    return info;
  } catch (error) {
    console.error("❌ Error al enviar correo de stock bajo:", {
      to,
      companyName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
