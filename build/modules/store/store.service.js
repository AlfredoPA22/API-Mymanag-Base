"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStoreOrder = exports.listStoreProducts = exports.assertStoreIsAvailable = exports.getEffectiveSalePrice = void 0;
const planLimits_1 = require("../../utils/planLimits");
const saleOrderPaymentMethod_1 = require("../../utils/enums/saleOrderPaymentMethod");
const salePaymentMethod_1 = require("../../utils/enums/salePaymentMethod");
const productStatus_enum_1 = require("../../utils/enums/productStatus.enum");
const stockType_enum_1 = require("../../utils/enums/stockType.enum");
const client_service_1 = require("../client/client.service");
const client_model_1 = require("../client/client.model");
const company_model_1 = require("../company/company.model");
const product_model_1 = require("../product/product.model");
const product_inventory_model_1 = require("../product/product_inventory.model");
const saleOrder_service_1 = require("../sale_order/saleOrder.service");
const user_model_1 = require("../user/user.model");
const notification_service_1 = require("../notification/notification.service");
const PUBLIC_PRODUCT_FIELDS = "code name description image images sale_price store_price store_discount_price stock stock_type brand category status";
// El precio base de la tienda es el store_price si el cliente lo configuró
// (puede ser mayor o menor al precio normal); si no, se usa el precio normal.
const getStoreBasePrice = (product) => product.store_price != null ? product.store_price : product.sale_price;
// El precio de descuento solo aplica si es menor al precio base de la tienda.
const getEffectiveSalePrice = (product) => {
    const basePrice = getStoreBasePrice(product);
    const hasDiscount = product.store_discount_price != null && product.store_discount_price < basePrice;
    return hasDiscount ? product.store_discount_price : basePrice;
};
exports.getEffectiveSalePrice = getEffectiveSalePrice;
const withEffectivePrice = (product) => {
    const basePrice = getStoreBasePrice(product);
    const effectivePrice = (0, exports.getEffectiveSalePrice)(product);
    const hasDiscount = effectivePrice !== basePrice;
    return {
        ...product,
        regular_price: hasDiscount ? basePrice : null,
        sale_price: effectivePrice,
    };
};
const STORE_ORDER_SOURCE = "tienda_online";
const assertStoreIsAvailable = (company) => {
    const hasStore = company && planLimits_1.companyPlanLimits[company.plan]?.hasStore;
    if (!company || !hasStore || !company.store_enabled) {
        throw new Error("Tienda no disponible");
    }
};
exports.assertStoreIsAvailable = assertStoreIsAvailable;
const listStoreProducts = async (companyId) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    (0, exports.assertStoreIsAvailable)(company);
    const products = await product_model_1.Product.find({
        company: companyId,
        status: productStatus_enum_1.productStatus.DISPONIBLE,
        show_in_store: { $ne: false },
    })
        .select(PUBLIC_PRODUCT_FIELDS)
        .populate("brand")
        .populate("category")
        .lean();
    return products.map((product) => withEffectivePrice(product));
};
exports.listStoreProducts = listStoreProducts;
const createStoreOrder = async (companyId, storeOrderInput) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    (0, exports.assertStoreIsAvailable)(company);
    if (!storeOrderInput.items || storeOrderInput.items.length === 0) {
        throw new Error("El carrito está vacío");
    }
    const storeUser = await user_model_1.User.findOne({ company: companyId, is_global: true });
    if (!storeUser) {
        throw new Error("La tienda no está disponible en este momento");
    }
    let client = await client_model_1.Client.findOne({
        company: companyId,
        phoneNumber: storeOrderInput.phoneNumber,
    });
    if (!client) {
        client = await (0, client_service_1.create)(companyId, {
            fullName: storeOrderInput.fullName,
            phoneNumber: storeOrderInput.phoneNumber,
            email: storeOrderInput.email,
            address: storeOrderInput.address,
        });
    }
    const newOrder = await (0, saleOrder_service_1.create)(companyId, storeUser._id, {
        date: new Date(),
        client: client._id.toString(),
        payment_method: saleOrderPaymentMethod_1.paymentMethod.CONTADO,
        contado_payment_method: salePaymentMethod_1.salePaymentMethod.EFECTIVO,
        source: STORE_ORDER_SOURCE,
    });
    try {
        for (const item of storeOrderInput.items) {
            if (item.quantity <= 0) {
                throw new Error("La cantidad debe ser mayor a 0");
            }
            const product = await product_model_1.Product.findOne({
                _id: item.productId,
                company: companyId,
            });
            if (!product || product.status !== productStatus_enum_1.productStatus.DISPONIBLE) {
                throw new Error("Uno de los productos ya no está disponible");
            }
            let warehouseId;
            if (product.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
                const inventories = await product_inventory_model_1.ProductInventory.find({
                    company: companyId,
                    product: product._id,
                    available: { $gte: item.quantity },
                }).sort({ available: -1 });
                if (inventories.length === 0) {
                    throw new Error(`No hay suficiente stock disponible para "${product.name}"`);
                }
                warehouseId = inventories[0].warehouse;
            }
            await (0, saleOrder_service_1.createDetail)(companyId, {
                sale_order: newOrder._id,
                product: product._id,
                sale_price: (0, exports.getEffectiveSalePrice)(product),
                quantity: item.quantity,
                warehouse: warehouseId,
            });
        }
    }
    catch (error) {
        await (0, saleOrder_service_1.deleteSaleOrder)(companyId, newOrder._id);
        throw error;
    }
    const finalOrder = await (0, saleOrder_service_1.findSaleOrder)(companyId, newOrder._id);
    try {
        await (0, notification_service_1.createNotification)(companyId, {
            type: "store_order",
            title: "Nuevo pedido de la tienda",
            message: `${finalOrder.client.fullName} hizo un pedido (${finalOrder.code}) por ${finalOrder.total}.`,
            link: "/tienda/pedidos",
        });
    }
    catch (error) {
        console.error("⚠️ No se pudo crear la notificación de nuevo pedido:", error);
    }
    return {
        _id: finalOrder._id.toString(),
        code: finalOrder.code,
        total: finalOrder.total,
        clientFullName: finalOrder.client.fullName,
    };
};
exports.createStoreOrder = createStoreOrder;
