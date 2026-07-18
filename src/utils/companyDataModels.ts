import { Model } from "mongoose";
import { Brand } from "../modules/brand/brand.model";
import { Category } from "../modules/category/category.model";
import { Client } from "../modules/client/client.model";
import { CodeGenerator } from "../modules/codeGenerator/codeGenerator.model";
import { Notification } from "../modules/notification/notification.model";
import { PaymentLanding } from "../modules/payment_landing/payment_landing.model";
import { Product } from "../modules/product/product.model";
import { ProductInventory } from "../modules/product/product_inventory.model";
import { ProductSerial } from "../modules/product/product_serial.model";
import { ProductTransfer } from "../modules/product_transfer/product_transfer.model";
import { ProductTransferDetail } from "../modules/product_transfer/product_transfer_detail.model";
import { Provider } from "../modules/provider/provider.model";
import { PurchaseOrder } from "../modules/purchase_order/purchase_order.model";
import { PurchaseOrderDetail } from "../modules/purchase_order/purchase_order_detail.model";
import { Role } from "../modules/role/role.model";
import { SaleOrder } from "../modules/sale_order/sale_order.model";
import { SaleOrderDetail } from "../modules/sale_order/sale_order_detail.model";
import { SalePayment } from "../modules/sale_payment/sale_payment.model";
import { SaleReturn } from "../modules/sale_return/sale_return.model";
import { SaleReturnDetail } from "../modules/sale_return/sale_return_detail.model";
import { User } from "../modules/user/user.model";
import { Warehouse } from "../modules/warehouse/warehouse.model";

// Todas las colecciones que quedan ligadas a una empresa por su campo
// `company`. Es la única fuente de verdad usada tanto para el reporte de
// borrado (contar) como para el borrado permanente en sí (deleteMany) — así
// el reporte nunca puede quedar desincronizado de lo que realmente se borra.
//
// NO incluye `Company` (se borra aparte, al final) ni `Permission`/`UserLanding`
// (catálogo global y cuentas de login de Landing — nunca deben tocarse).
export const companyDataModels: { key: string; label: string; model: Model<any> }[] = [
  { key: "products", label: "Productos", model: Product },
  { key: "brands", label: "Marcas", model: Brand },
  { key: "categories", label: "Categorías", model: Category },
  { key: "providers", label: "Proveedores", model: Provider },
  { key: "clients", label: "Clientes", model: Client },
  { key: "warehouses", label: "Almacenes", model: Warehouse },
  { key: "roles", label: "Roles", model: Role },
  { key: "users", label: "Usuarios", model: User },
  { key: "saleOrders", label: "Órdenes de venta", model: SaleOrder },
  { key: "saleOrderDetails", label: "Detalles de venta", model: SaleOrderDetail },
  { key: "purchaseOrders", label: "Órdenes de compra", model: PurchaseOrder },
  { key: "purchaseOrderDetails", label: "Detalles de compra", model: PurchaseOrderDetail },
  { key: "salePayments", label: "Pagos de venta", model: SalePayment },
  { key: "saleReturns", label: "Devoluciones", model: SaleReturn },
  { key: "saleReturnDetails", label: "Detalles de devolución", model: SaleReturnDetail },
  { key: "productTransfers", label: "Transferencias", model: ProductTransfer },
  { key: "productTransferDetails", label: "Detalles de transferencia", model: ProductTransferDetail },
  { key: "productInventory", label: "Inventario", model: ProductInventory },
  { key: "productSerials", label: "Seriales", model: ProductSerial },
  { key: "notifications", label: "Notificaciones", model: Notification },
  { key: "payments", label: "Pagos a Inventasys", model: PaymentLanding },
  { key: "codeGenerators", label: "Contadores de código", model: CodeGenerator },
];
