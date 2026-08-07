import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { IPurchaseOrder } from "./purchaseOrder.interface";
import { IProduct } from "./product.interface";
import { ISaleOrder } from "./saleOrder.interface";
import { IProductSerial } from "./productSerial.interface";
import { IWarehouse } from "./warehouse.interface";
import { IPurchaseOrderDetail } from "./purchaseOrderDetail.interface";
import { ICompany } from "./company.interface";

export interface IInventoryUsage {
  warehouse: IWarehouse | null;
  purchase_order_detail: IPurchaseOrderDetail | null;
  quantity: number | null;
}

export interface ISaleOrderDetail {
  _id: MongooseTypes.ObjectId;
  sale_order: ISaleOrder;
  // null cuando es un ítem sin inventario (ver custom_name/custom_cost).
  product: IProduct | null;
  custom_name?: string | null;
  custom_cost?: number | null;
  sale_price: number;
  quantity: number;
  serials: number;
  inventory_usage: IInventoryUsage[];
  discount_type?: string | null;
  discount_value?: number;
  discount_amount?: number;
  subtotal: number;
  company: ICompany;
}

export interface SaleOrderDetailInput {
  sale_order: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  product: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  sale_price: number;
  quantity: number;
  warehouse?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  inventory_usage?: {
    warehouse: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
    purchase_order_detail:
      | MongooseSchema.Types.ObjectId
      | MongooseTypes.ObjectId;
    quantity: number;
  }[];
  discount_type?: string | null;
  discount_value?: number;
}

// Un ítem "sin inventario" — no está en el catálogo de productos, así que
// no descuenta stock ni aparece en kardex/reportes por producto. Se
// describe con `name` a mano y opcionalmente su costo (para que sí impacte
// en rentabilidad, aunque no se agrupe por producto/categoría).
export interface CreateCustomSaleOrderDetailInput {
  sale_order: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  name: string;
  sale_price: number;
  quantity: number;
  cost?: number;
  discount_type?: string | null;
  discount_value?: number;
}

export interface UpdateSaleOrderDetailInput {
  sale_price: number;
  quantity: number;
  warehouse?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  inventory_usage?: {
    warehouse: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
    purchase_order_detail:
      | MongooseSchema.Types.ObjectId
      | MongooseTypes.ObjectId;
    quantity: number;
  }[];
  discount_type?: string | null;
  discount_value?: number;
}

export interface AddSerialToSaleOrderDetailInput {
  sale_order_detail: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  serial: string;
}

export interface ISaleOrderDetailToPDF {
  saleOrderDetail: ISaleOrderDetail;
  productSerial: IProductSerial[];
}

export interface AddManySerialsToSaleOrderDetailInput {
  sale_order_detail: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId;
  serials: string[];
}