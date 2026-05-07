import cron from "node-cron";
import { Company } from "../modules/company/company.model";
import { Product } from "../modules/product/product.model";
import { UserLanding } from "../modules/user_landing/user_landing.model";
import { companyStatus } from "../utils/enums/companyStatus.enum";
import { sendLowStockEmail, LowStockProduct } from "../utils/sendLowStockEmail";

export const checkLowStock = async () => {
  // Solo empresas activas — no tiene sentido alertar a empresas expiradas o suspendidas
  const companies = await Company.find({ status: companyStatus.ACTIVE }).lean();

  let totalAlertas = 0;

  for (const company of companies) {
    try {
      const lowStockProducts = await Product.find({
        company: company._id,
        $expr: { $lte: ["$stock", "$min_stock"] },
      })
        .select("code name stock min_stock")
        .lean();

      if (lowStockProducts.length === 0) continue;

      const creator = await UserLanding.findById((company as any).created_by)
        .select("email")
        .lean();

      if (!creator || !(creator as any).email) {
        console.warn(`⚠️ No se encontró email para la empresa: ${(company as any).name}`);
        continue;
      }

      const products: LowStockProduct[] = lowStockProducts.map((p: any) => ({
        code: p.code,
        name: p.name,
        stock: p.stock,
        min_stock: p.min_stock,
      }));

      await sendLowStockEmail((creator as any).email, (company as any).name, products);
      totalAlertas++;
    } catch (error) {
      console.error(
        `❌ Error procesando alerta de stock para empresa ${(company as any).name}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  if (totalAlertas === 0) {
    console.log("✅ Verificación de stock completada — ninguna empresa con stock bajo");
  } else {
    console.log(`✅ Verificación de stock completada — alertas enviadas a ${totalAlertas} empresa${totalAlertas > 1 ? "s" : ""}`);
  }
};

// Ejecutar todos los días a las 08:00 am
export const initLowStockCron = () => {
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log("🕗 Ejecutando verificación de stock bajo...");
      await checkLowStock();
    },
    {
      timezone: "America/La_Paz",
    }
  );
};
