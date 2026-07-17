import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { IProduct } from "../../interfaces/product.interface";
import { IStoreOrderResult, StoreOrderInput } from "../../interfaces/store.interface";
import { companyPlan } from "../../utils/enums/companyPlan.enum";
import { paymentMethod } from "../../utils/enums/saleOrderPaymentMethod";
import { salePaymentMethod } from "../../utils/enums/salePaymentMethod";
import { productStatus } from "../../utils/enums/productStatus.enum";
import { stockType } from "../../utils/enums/stockType.enum";
import { create as createClient } from "../client/client.service";
import { Client } from "../client/client.model";
import { Company } from "../company/company.model";
import { Product } from "../product/product.model";
import { ProductInventory } from "../product/product_inventory.model";
import {
  create as createSaleOrder,
  createDetail as createSaleOrderDetail,
  deleteSaleOrder,
  findSaleOrder,
} from "../sale_order/saleOrder.service";
import { User } from "../user/user.model";
import { createNotification } from "../notification/notification.service";

const PUBLIC_PRODUCT_FIELDS =
  "code name description image images sale_price store_price store_discount_price stock stock_type brand category status";

type PricedProduct = {
  sale_price: number;
  store_price?: number | null;
  store_discount_price?: number | null;
};

// El precio base de la tienda es el store_price si el cliente lo configuró
// (puede ser mayor o menor al precio normal); si no, se usa el precio normal.
const getStoreBasePrice = (product: PricedProduct): number =>
  product.store_price != null ? product.store_price : product.sale_price;

// El precio de descuento solo aplica si es menor al precio base de la tienda.
export const getEffectiveSalePrice = (product: PricedProduct): number => {
  const basePrice = getStoreBasePrice(product);
  const hasDiscount =
    product.store_discount_price != null && product.store_discount_price < basePrice;
  return hasDiscount ? (product.store_discount_price as number) : basePrice;
};

const withEffectivePrice = <T extends PricedProduct>(
  product: T
): T & { regular_price: number | null } => {
  const basePrice = getStoreBasePrice(product);
  const effectivePrice = getEffectiveSalePrice(product);
  const hasDiscount = effectivePrice !== basePrice;

  return {
    ...product,
    regular_price: hasDiscount ? basePrice : null,
    sale_price: effectivePrice,
  };
};

const STORE_ORDER_SOURCE = "tienda_online";

export const assertStoreIsAvailable = (company: { plan: string; store_enabled?: boolean } | null) => {
  if (!company || company.plan !== companyPlan.PRO || !company.store_enabled) {
    throw new Error("Tienda no disponible");
  }
};

export const listStoreProducts = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<(IProduct & { regular_price: number | null })[]> => {
  const company = await Company.findById(companyId).lean();
  assertStoreIsAvailable(company);

  const products = await Product.find({
    company: companyId,
    status: productStatus.DISPONIBLE,
    show_in_store: { $ne: false },
  })
    .select(PUBLIC_PRODUCT_FIELDS)
    .populate("brand")
    .populate("category")
    .lean<IProduct[]>();

  return products.map((product) => withEffectivePrice(product));
};

export const createStoreOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  storeOrderInput: StoreOrderInput
): Promise<IStoreOrderResult> => {
  const company = await Company.findById(companyId).lean();
  assertStoreIsAvailable(company);

  if (!storeOrderInput.items || storeOrderInput.items.length === 0) {
    throw new Error("El carrito está vacío");
  }

  const storeUser = await User.findOne({ company: companyId, is_global: true });
  if (!storeUser) {
    throw new Error("La tienda no está disponible en este momento");
  }

  let client = await Client.findOne({
    company: companyId,
    phoneNumber: storeOrderInput.phoneNumber,
  });

  if (!client) {
    client = await createClient(companyId, {
      fullName: storeOrderInput.fullName,
      phoneNumber: storeOrderInput.phoneNumber,
      email: storeOrderInput.email,
      address: storeOrderInput.address,
    });
  }

  const newOrder: any = await createSaleOrder(companyId, storeUser._id, {
    date: new Date(),
    client: client._id.toString(),
    payment_method: paymentMethod.CONTADO,
    contado_payment_method: salePaymentMethod.EFECTIVO,
    source: STORE_ORDER_SOURCE,
  } as any);

  try {
    for (const item of storeOrderInput.items) {
      if (item.quantity <= 0) {
        throw new Error("La cantidad debe ser mayor a 0");
      }

      const product = await Product.findOne({
        _id: item.productId,
        company: companyId,
      });

      if (!product || product.status !== productStatus.DISPONIBLE) {
        throw new Error("Uno de los productos ya no está disponible");
      }

      let warehouseId: MongooseTypes.ObjectId | undefined;

      if (product.stock_type === stockType.INDIVIDUAL) {
        const inventories = await ProductInventory.find({
          company: companyId,
          product: product._id,
          available: { $gte: item.quantity },
        }).sort({ available: -1 });

        if (inventories.length === 0) {
          throw new Error(
            `No hay suficiente stock disponible para "${product.name}"`
          );
        }

        warehouseId = inventories[0].warehouse;
      }

      await createSaleOrderDetail(companyId, {
        sale_order: newOrder._id,
        product: product._id,
        sale_price: getEffectiveSalePrice(product),
        quantity: item.quantity,
        warehouse: warehouseId,
      } as any);
    }
  } catch (error) {
    await deleteSaleOrder(companyId, newOrder._id);
    throw error;
  }

  const finalOrder = await findSaleOrder(companyId, newOrder._id);

  try {
    await createNotification(companyId, {
      type: "store_order",
      title: "Nuevo pedido de la tienda",
      message: `${finalOrder.client.fullName} hizo un pedido (${finalOrder.code}) por ${finalOrder.total}.`,
      link: "/tienda/pedidos",
    });
  } catch (error) {
    console.error("⚠️ No se pudo crear la notificación de nuevo pedido:", error);
  }

  return {
    code: finalOrder.code,
    total: finalOrder.total,
    clientFullName: finalOrder.client.fullName,
  };
};
