"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyDataModels = void 0;
const brand_model_1 = require("../modules/brand/brand.model");
const category_model_1 = require("../modules/category/category.model");
const client_model_1 = require("../modules/client/client.model");
const codeGenerator_model_1 = require("../modules/codeGenerator/codeGenerator.model");
const notification_model_1 = require("../modules/notification/notification.model");
const payment_landing_model_1 = require("../modules/payment_landing/payment_landing.model");
const product_model_1 = require("../modules/product/product.model");
const product_inventory_model_1 = require("../modules/product/product_inventory.model");
const product_serial_model_1 = require("../modules/product/product_serial.model");
const product_transfer_model_1 = require("../modules/product_transfer/product_transfer.model");
const product_transfer_detail_model_1 = require("../modules/product_transfer/product_transfer_detail.model");
const provider_model_1 = require("../modules/provider/provider.model");
const purchase_order_model_1 = require("../modules/purchase_order/purchase_order.model");
const purchase_order_detail_model_1 = require("../modules/purchase_order/purchase_order_detail.model");
const role_model_1 = require("../modules/role/role.model");
const sale_order_model_1 = require("../modules/sale_order/sale_order.model");
const sale_order_detail_model_1 = require("../modules/sale_order/sale_order_detail.model");
const sale_payment_model_1 = require("../modules/sale_payment/sale_payment.model");
const sale_return_model_1 = require("../modules/sale_return/sale_return.model");
const sale_return_detail_model_1 = require("../modules/sale_return/sale_return_detail.model");
const user_model_1 = require("../modules/user/user.model");
const warehouse_model_1 = require("../modules/warehouse/warehouse.model");
// Todas las colecciones que quedan ligadas a una empresa por su campo
// `company`. Es la única fuente de verdad usada tanto para el reporte de
// borrado (contar) como para el borrado permanente en sí (deleteMany) — así
// el reporte nunca puede quedar desincronizado de lo que realmente se borra.
//
// NO incluye `Company` (se borra aparte, al final) ni `Permission`/`UserLanding`
// (catálogo global y cuentas de login de Landing — nunca deben tocarse).
exports.companyDataModels = [
    { key: "products", label: "Productos", model: product_model_1.Product },
    { key: "brands", label: "Marcas", model: brand_model_1.Brand },
    { key: "categories", label: "Categorías", model: category_model_1.Category },
    { key: "providers", label: "Proveedores", model: provider_model_1.Provider },
    { key: "clients", label: "Clientes", model: client_model_1.Client },
    { key: "warehouses", label: "Almacenes", model: warehouse_model_1.Warehouse },
    { key: "roles", label: "Roles", model: role_model_1.Role },
    { key: "users", label: "Usuarios", model: user_model_1.User },
    { key: "saleOrders", label: "Órdenes de venta", model: sale_order_model_1.SaleOrder },
    { key: "saleOrderDetails", label: "Detalles de venta", model: sale_order_detail_model_1.SaleOrderDetail },
    { key: "purchaseOrders", label: "Órdenes de compra", model: purchase_order_model_1.PurchaseOrder },
    { key: "purchaseOrderDetails", label: "Detalles de compra", model: purchase_order_detail_model_1.PurchaseOrderDetail },
    { key: "salePayments", label: "Pagos de venta", model: sale_payment_model_1.SalePayment },
    { key: "saleReturns", label: "Devoluciones", model: sale_return_model_1.SaleReturn },
    { key: "saleReturnDetails", label: "Detalles de devolución", model: sale_return_detail_model_1.SaleReturnDetail },
    { key: "productTransfers", label: "Transferencias", model: product_transfer_model_1.ProductTransfer },
    { key: "productTransferDetails", label: "Detalles de transferencia", model: product_transfer_detail_model_1.ProductTransferDetail },
    { key: "productInventory", label: "Inventario", model: product_inventory_model_1.ProductInventory },
    { key: "productSerials", label: "Seriales", model: product_serial_model_1.ProductSerial },
    { key: "notifications", label: "Notificaciones", model: notification_model_1.Notification },
    { key: "payments", label: "Pagos a Inventasys", model: payment_landing_model_1.PaymentLanding },
    { key: "codeGenerators", label: "Contadores de código", model: codeGenerator_model_1.CodeGenerator },
];
