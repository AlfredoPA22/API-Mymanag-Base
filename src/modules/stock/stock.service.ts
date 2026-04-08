import { Types as MongooseTypes } from "mongoose";
import { UserLanding } from "../user_landing/user_landing.model";
import { userLandingType } from "../../utils/enums/userLandingType.enum";
import { Product } from "../product/product.model";
import { ProductInventory } from "../product/product_inventory.model";
import { ProductSerial } from "../product/product_serial.model";
import { Company } from "../company/company.model";

export interface StockDiscrepancy {
  productId: string;
  code: string;
  name: string;
  stock_type: string;
  companyId: string;
  companyName: string;
  stockActual: number;
  stockCorrecto: number;
  statusActual: string;
  statusCorrecto: string;
  diff: number;
}

export interface StockAuditResult {
  totalProducts: number;
  ok: number;
  discrepancies: StockDiscrepancy[];
  errors: number;
}

export interface StockChange {
  productId: string;
  name: string;
  companyId: string;
  companyName: string;
  stock_type: string;
  stockBefore: number;
  stockAfter: number;
  statusBefore: string;
  statusAfter: string;
}

export interface StockReconcileResult {
  totalProducts: number;
  updated: number;
  unchanged: number;
  errors: number;
  changes: StockChange[];
}

async function verifyAdmin(userId: MongooseTypes.ObjectId | string) {
  const user = await UserLanding.findById(userId);
  if (!user) throw new Error("Usuario no encontrado");
  if (user.user_type !== userLandingType.ADMIN) {
    throw new Error("Acceso denegado: solo para administradores");
  }
}

async function calculateCorrectStock(product: any): Promise<number> {
  if (product.stock_type === "individual") {
    const result = await ProductInventory.aggregate([
      {
        $match: {
          product: product._id,
          status: { $in: ["Disponible", "Sin stock"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $add: ["$available", "$reserved"] } },
        },
      },
    ]);
    return result[0]?.total ?? 0;
  } else if (product.stock_type === "serializado") {
    return ProductSerial.countDocuments({
      product: product._id,
      status: { $in: ["Disponible", "Reservado"] },
    });
  }
  return 0;
}

// Build a map of companyId -> companyName for display
async function buildCompanyMap(): Promise<Map<string, string>> {
  const companies = await Company.find({}, { _id: 1, name: 1 }).lean();
  const map = new Map<string, string>();
  for (const c of companies) {
    map.set(c._id.toString(), (c as any).name ?? "—");
  }
  return map;
}

export const auditStock = async (
  userId: MongooseTypes.ObjectId | string
): Promise<StockAuditResult> => {
  await verifyAdmin(userId);

  const products = await Product.find({}).lean();
  const companyMap = await buildCompanyMap();

  let ok = 0;
  let errors = 0;
  const discrepancies: StockDiscrepancy[] = [];

  for (const product of products) {
    try {
      const correctStock = await calculateCorrectStock(product);
      const correctStatus = correctStock > 0 ? "Disponible" : "Sin stock";

      const stockOk = (product as any).stock === correctStock;
      const statusOk = (product as any).status === correctStatus;

      if (stockOk && statusOk) {
        ok++;
      } else {
        const companyIdStr = (product as any).company?.toString() ?? "";
        discrepancies.push({
          productId: product._id.toString(),
          code: (product as any).code ?? "—",
          name: (product as any).name ?? "—",
          stock_type: (product as any).stock_type ?? "—",
          companyId: companyIdStr,
          companyName: companyMap.get(companyIdStr) ?? "—",
          stockActual: (product as any).stock ?? 0,
          stockCorrecto: correctStock,
          statusActual: (product as any).status ?? "—",
          statusCorrecto: correctStatus,
          diff: correctStock - ((product as any).stock ?? 0),
        });
      }
    } catch (err: any) {
      errors++;
      console.error(`⚠️ Error auditando producto ${product._id}:`, err.message);
    }
  }

  return {
    totalProducts: products.length,
    ok,
    discrepancies,
    errors,
  };
};

export const reconcileStock = async (
  userId: MongooseTypes.ObjectId | string
): Promise<StockReconcileResult> => {
  await verifyAdmin(userId);

  const products = await Product.find({}).lean();
  const companyMap = await buildCompanyMap();

  let updated = 0;
  let unchanged = 0;
  let errors = 0;
  const changes: StockChange[] = [];

  for (const product of products) {
    try {
      const correctStock = await calculateCorrectStock(product);
      const correctStatus = correctStock > 0 ? "Disponible" : "Sin stock";

      const stockChanged = (product as any).stock !== correctStock;
      const statusChanged = (product as any).status !== correctStatus;

      if (!stockChanged && !statusChanged) {
        unchanged++;
        continue;
      }

      await Product.updateOne(
        { _id: product._id },
        { $set: { stock: correctStock, status: correctStatus } }
      );

      const companyIdStr = (product as any).company?.toString() ?? "";
      changes.push({
        productId: product._id.toString(),
        name: (product as any).name ?? "—",
        companyId: companyIdStr,
        companyName: companyMap.get(companyIdStr) ?? "—",
        stock_type: (product as any).stock_type ?? "—",
        stockBefore: (product as any).stock ?? 0,
        stockAfter: correctStock,
        statusBefore: (product as any).status ?? "—",
        statusAfter: correctStatus,
      });

      updated++;
    } catch (err: any) {
      errors++;
      console.error(`⚠️ Error reconciliando producto ${product._id}:`, err.message);
    }
  }

  return {
    totalProducts: products.length,
    updated,
    unchanged,
    errors,
    changes,
  };
};
