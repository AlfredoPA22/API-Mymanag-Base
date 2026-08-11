"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveImportProducts = exports.previewImportProducts = exports.update = exports.deleteProduct = exports.createProductSerial = exports.createProduct = exports.generalData = exports.searchProduct = exports.listProductInventoryByProduct = exports.listProductSerialByProduct = exports.listProductSerialBySaleOrder = exports.listProductSerialByPurchaseOrder = exports.findProduct = exports.findAllWithParams = exports.productReport = exports.listLowStockProduct = exports.findAll = void 0;
const mongoose_1 = require("mongoose");
const orderType_enum_1 = require("../../utils/enums/orderType.enum");
const productSerialStatus_enum_1 = require("../../utils/enums/productSerialStatus.enum");
const saleOrderStatus_enum_1 = require("../../utils/enums/saleOrderStatus.enum");
const saleOrderPaymentMethod_1 = require("../../utils/enums/saleOrderPaymentMethod");
const brand_service_1 = require("../brand/brand.service");
const category_service_1 = require("../category/category.service");
const codeGenerator_service_1 = require("../codeGenerator/codeGenerator.service");
const purchase_order_detail_model_1 = require("../purchase_order/purchase_order_detail.model");
const sale_order_model_1 = require("../sale_order/sale_order.model");
const sale_order_detail_model_1 = require("../sale_order/sale_order_detail.model");
const sale_payment_model_1 = require("../sale_payment/sale_payment.model");
const user_model_1 = require("../user/user.model");
const product_model_1 = require("./product.model");
const product_inventory_model_1 = require("./product_inventory.model");
const product_serial_model_1 = require("./product_serial.model");
const company_model_1 = require("../company/company.model");
const planLimits_1 = require("../../utils/planLimits");
const companyPlan_enum_1 = require("../../utils/enums/companyPlan.enum");
const assertPlanLimit_1 = require("../../utils/assertPlanLimit");
const money_1 = require("../../utils/money");
const XLSX = __importStar(require("xlsx"));
const stockType_enum_1 = require("../../utils/enums/stockType.enum");
const brand_model_1 = require("../brand/brand.model");
const category_model_1 = require("../category/category.model");
const findAll = async (companyId) => {
    return await product_model_1.Product.find({
        company: companyId,
    })
        .populate("category")
        .populate("brand")
        .populate("company")
        .lean();
};
exports.findAll = findAll;
const listLowStockProduct = async (companyId) => {
    return await product_model_1.Product.find({
        company: companyId,
        $or: [
            { $expr: { $lt: ["$stock", "$min_stock"] } },
            { stock: { $lte: 0 } },
        ],
    })
        .populate("category")
        .populate("brand")
        .populate("company")
        .lean();
};
exports.listLowStockProduct = listLowStockProduct;
const productReport = async (companyId, filterProductInput) => {
    const query = { company: companyId };
    if (filterProductInput.category) {
        query.category = filterProductInput.category;
    }
    if (filterProductInput.brand) {
        query.brand = filterProductInput.brand;
    }
    if (filterProductInput.status && filterProductInput.status !== "Todos") {
        query.status = filterProductInput.status;
    }
    const listProduct = await product_model_1.Product.find(query)
        .populate("category")
        .populate("brand")
        .populate("company")
        .lean();
    return listProduct;
};
exports.productReport = productReport;
const findAllWithParams = async (companyId, categoryId, brandId, warehouseId) => {
    if (!categoryId && !brandId && !warehouseId) {
        throw new Error("Debe proporcionar al menos un parámetro: categoria, marca o almacén");
    }
    let filter = { company: companyId };
    if (categoryId)
        filter.category = categoryId;
    if (brandId)
        filter.brand = brandId;
    let productIdsByWarehouse = [];
    if (warehouseId) {
        // Obtener TODOS los productos serializados en ese almacén (sin filtrar por estado)
        const serialProducts = await product_serial_model_1.ProductSerial.distinct("product", {
            warehouse: warehouseId,
        });
        // Obtener los productos de inventario en ese almacén
        const inventoryProducts = await product_inventory_model_1.ProductInventory.distinct("product", {
            warehouse: warehouseId,
        });
        // Unir los productos de seriales e inventario y eliminar duplicados
        productIdsByWarehouse = [
            ...new Set([...serialProducts, ...inventoryProducts]),
        ];
        // Asegurarse de filtrar solo los productos que existen en el almacén
        filter._id = { $in: productIdsByWarehouse };
    }
    const products = await product_model_1.Product.find(filter)
        .populate("category")
        .populate("brand")
        .populate("company")
        .lean();
    if (!warehouseId)
        return products;
    // Mapear productos con stock específico en ese almacén
    const updatedProducts = await Promise.all(products.map(async (product) => {
        // Stock de inventario (no serializados)
        const inventory = await product_inventory_model_1.ProductInventory.findOne({
            company: companyId,
            product: product._id,
            warehouse: warehouseId,
        });
        // Stock de productos serializados (solo los DISPONIBLES)
        const serialCount = await product_serial_model_1.ProductSerial.countDocuments({
            company: companyId,
            product: product._id,
            warehouse: warehouseId,
            status: productSerialStatus_enum_1.productSerialStatus.DISPONIBLE, // Solo contar seriales DISPONIBLES
        });
        // Calcular el stock total sumando inventarios y seriales DISPONIBLES
        const stockTotal = (inventory?.quantity || 0) + serialCount;
        return {
            ...product,
            stock: stockTotal,
        };
    }));
    return updatedProducts;
};
exports.findAllWithParams = findAllWithParams;
const findProduct = async (companyId, productId) => {
    const product = await product_model_1.Product.findOne({
        _id: productId,
        company: companyId,
    })
        .populate("brand")
        .populate("category")
        .populate("company")
        .lean();
    if (!product) {
        throw new Error("No existe el producto");
    }
    return product;
};
exports.findProduct = findProduct;
const listProductSerialByPurchaseOrder = async (companyId, purchaseOrderDetailId) => {
    const listSerial = await product_serial_model_1.ProductSerial.find({
        company: companyId,
        purchase_order_detail: purchaseOrderDetailId,
    })
        .populate("product")
        .populate("purchase_order_detail")
        .populate("warehouse")
        .populate("company")
        .lean();
    return listSerial;
};
exports.listProductSerialByPurchaseOrder = listProductSerialByPurchaseOrder;
const listProductSerialBySaleOrder = async (companyId, saleOrderDetailId) => {
    const listSerial = await product_serial_model_1.ProductSerial.find({
        company: companyId,
        sale_order_detail: saleOrderDetailId,
    })
        .populate("product")
        .populate("sale_order_detail")
        .populate("warehouse")
        .populate("company")
        .lean();
    return listSerial;
};
exports.listProductSerialBySaleOrder = listProductSerialBySaleOrder;
const listProductSerialByProduct = async (companyId, productId) => {
    const listSerial = await product_serial_model_1.ProductSerial.find({
        company: companyId,
        product: productId,
    })
        .populate("product")
        .populate("warehouse")
        .populate({
        path: "purchase_order_detail",
        populate: {
            path: "purchase_order",
        },
    })
        .populate({
        path: "sale_order_detail",
        populate: {
            path: "sale_order",
        },
    })
        .populate("company")
        .lean();
    return listSerial;
};
exports.listProductSerialByProduct = listProductSerialByProduct;
const listProductInventoryByProduct = async (companyId, productId) => {
    const listProduct = await product_inventory_model_1.ProductInventory.find({
        company: companyId,
        product: productId,
    })
        .populate("product")
        .populate("warehouse")
        .populate({
        path: "purchase_order_detail",
        populate: {
            path: "purchase_order",
        },
    })
        .populate("company")
        .lean();
    return listProduct;
};
exports.listProductInventoryByProduct = listProductInventoryByProduct;
const searchProduct = async (companyId, argument) => {
    const foundProductSerial = await product_serial_model_1.ProductSerial.findOne({
        company: companyId,
        serial: argument,
    });
    if (foundProductSerial) {
        const product = await product_model_1.Product.findOne({
            _id: foundProductSerial.product,
            company: companyId,
        })
            .populate("brand")
            .populate("category")
            .populate("company")
            .lean();
        if (!product) {
            throw new Error("Producto no encontrado");
        }
        return product;
    }
    const product = await product_model_1.Product.findOne({
        company: companyId,
        $or: [
            { name: { $regex: argument, $options: "i" } },
            { code: { $regex: argument, $options: "i" } },
        ],
    })
        .populate("brand")
        .populate("category")
        .populate("company")
        .lean();
    if (!product) {
        throw new Error("No se encontró ningún producto con ese nombre, código o serial");
    }
    return product;
};
exports.searchProduct = searchProduct;
const generalData = async (companyId, userId, startDate, endDate) => {
    const foundUser = await user_model_1.User.findOne({
        _id: userId,
        company: companyId,
    });
    if (!foundUser) {
        throw new Error("Usuario no encontrado");
    }
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const currentYear = new Date().getFullYear();
    const dateFrom = startDate
        ? new Date(startDate)
        : new Date(`${currentYear}-01-01T00:00:00.000`);
    const dateTo = endDate
        ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })()
        : new Date(`${currentYear + 1}-01-01T00:00:00.000`);
    const total_products_number = await product_model_1.Product.countDocuments({
        company: companyId,
    });
    const total_products_low = await product_model_1.Product.countDocuments({
        company: companyId,
        $or: [
            { $expr: { $lt: ["$stock", "$min_stock"] } },
            { stock: { $lte: 0 } },
        ],
    });
    const totalStock = await product_model_1.Product.aggregate([
        {
            $match: {
                company: new mongoose_1.Types.ObjectId(`${companyId}`),
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$stock" },
            },
        },
    ]);
    const stock = totalStock.length > 0 ? totalStock[0].total : 0;
    const mostSoldProduct = await sale_order_detail_model_1.SaleOrderDetail.aggregate([
        {
            $lookup: {
                from: "sale_orders",
                localField: "sale_order",
                foreignField: "_id",
                as: "order",
            },
        },
        {
            $match: {
                "order.status": saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
                "order.company": new mongoose_1.Types.ObjectId(`${companyId}`),
                "order.date": { $gte: dateFrom, $lte: dateTo },
                ...(foundUser.is_global
                    ? {}
                    : { "order.created_by": new mongoose_1.Types.ObjectId(`${userId}`) }),
            },
        },
        {
            $group: {
                _id: "$product",
                totalSold: { $sum: "$quantity" },
            },
        },
        {
            $sort: {
                totalSold: -1,
            },
        },
        {
            $limit: 1,
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productDetails",
            },
        },
        {
            $unwind: "$productDetails",
        },
        {
            $project: {
                _id: 0,
                totalSold: 1,
                product: "$productDetails",
            },
        },
    ]);
    const best_product = mostSoldProduct.length > 0 ? mostSoldProduct[0].product : null;
    const best_product_sales_number = mostSoldProduct.length > 0 ? mostSoldProduct[0].totalSold : 0;
    const total_sales_number = await sale_order_model_1.SaleOrder.countDocuments({
        company: companyId,
        status: saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
        date: { $gte: dateFrom, $lte: dateTo },
        ...(foundUser.is_global ? {} : { created_by: userId }),
    });
    const total_sales_value_aggregate = await sale_order_model_1.SaleOrder.aggregate([
        {
            $match: {
                company: new mongoose_1.Types.ObjectId(`${companyId}`),
                status: saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
                date: { $gte: dateFrom, $lte: dateTo },
                ...(foundUser.is_global
                    ? {}
                    : { created_by: new mongoose_1.Types.ObjectId(`${userId}`) }),
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: (0, money_1.toBaseCurrencyExpr)("$total", "$currency", "$exchange_rate") },
            },
        },
    ]);
    const total_sales_value = total_sales_value_aggregate.length > 0
        ? (0, money_1.round2)(total_sales_value_aggregate[0].total)
        : 0;
    // "Por cobrar" es el saldo pendiente ACTUAL, no algo limitado al período
    // seleccionado en el dashboard — una venta a crédito de hace dos meses que
    // sigue sin pagarse debe seguir contando como pendiente hoy. Por eso este
    // match NO filtra por `date`, a diferencia del resto de las métricas del
    // header (que sí son "de este período"). Así coincide con Pagos, que
    // tampoco filtra por fecha por defecto.
    const creditPendingMatch = {
        company: new mongoose_1.Types.ObjectId(`${companyId}`),
        status: saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
        payment_method: saleOrderPaymentMethod_1.paymentMethod.CREDITO,
        is_paid: false,
        ...(foundUser.is_global ? {} : { created_by: new mongoose_1.Types.ObjectId(`${userId}`) }),
    };
    // Las notas a crédito y sus pagos pueden estar cada uno en una moneda
    // distinta (nota en $ pagada parcialmente en Bs, etc.) — el pendiente de
    // cada nota se calcula en JS con toOrderCurrency(), el mismo patrón que
    // usa salePayment.service.ts para el saldo de una nota. En vez de
    // convertir todo a una sola moneda (lo que confunde: "¿es lo mismo pero
    // en otra moneda?"), se separa el pendiente en dos totales — uno por cada
    // moneda en la que realmente están las notas — igual que en PaymentList.
    const creditPendingOrders = await sale_order_model_1.SaleOrder.find(creditPendingMatch).lean();
    const creditPendingPayments = await sale_payment_model_1.SalePayment.find({
        sale_order: { $in: creditPendingOrders.map((o) => o._id) },
    }).lean();
    const paymentsByOrder = new Map();
    for (const payment of creditPendingPayments) {
        const key = payment.sale_order.toString();
        if (!paymentsByOrder.has(key))
            paymentsByOrder.set(key, []);
        paymentsByOrder.get(key).push(payment);
    }
    let total_credit_pending = 0;
    let total_credit_pending_bs = 0;
    for (const order of creditPendingOrders) {
        const orderCurrency = order.currency ?? company.currency;
        const payments = paymentsByOrder.get(order._id.toString()) ?? [];
        const totalPaidInOrderCurrency = payments.reduce((sum, p) => sum + (0, money_1.toOrderCurrency)(p.amount, p.currency, p.exchange_rate, company.currency, orderCurrency), 0);
        const pendingInOrderCurrency = Math.max(order.total - totalPaidInOrderCurrency, 0);
        // OJO: se compara `order.currency` (el campo crudo) y no `orderCurrency`
        // (que ya cae a company.currency cuando es null). Una empresa que opera
        // en Bs tiene `order.currency` null en TODAS sus notas — usar la versión
        // resuelta mandaría todo su pendiente al bucket "_bs" por error.
        if (order.currency === "Bs") {
            total_credit_pending_bs += pendingInOrderCurrency;
        }
        else {
            total_credit_pending += pendingInOrderCurrency;
        }
    }
    total_credit_pending = (0, money_1.round2)(total_credit_pending);
    total_credit_pending_bs = (0, money_1.round2)(total_credit_pending_bs);
    const total_credit_pending_count = creditPendingOrders.length;
    // Igual que el pendiente: cada pago queda en su propia moneda, así que se
    // agrupan por moneda en vez de convertirse a una sola — para que "Cobrado"
    // muestre la misma info que "Por cobrar" en cada tarjeta.
    const creditCollectedAgg = await sale_payment_model_1.SalePayment.aggregate([
        {
            $match: {
                company: new mongoose_1.Types.ObjectId(`${companyId}`),
                date: { $gte: dateFrom, $lte: dateTo },
                ...(foundUser.is_global ? {} : { created_by: new mongoose_1.Types.ObjectId(`${userId}`) }),
            },
        },
        {
            $group: {
                _id: { $cond: [{ $eq: ["$currency", "Bs"] }, "Bs", "base"] },
                total: { $sum: "$amount" },
            },
        },
    ]);
    let total_credit_collected = 0;
    let total_credit_collected_bs = 0;
    for (const row of creditCollectedAgg) {
        if (row._id === "Bs")
            total_credit_collected_bs = (0, money_1.round2)(row.total);
        else
            total_credit_collected = (0, money_1.round2)(row.total);
    }
    const response = {
        best_product,
        stock,
        total_products_number,
        total_products_low,
        total_sales_number,
        total_sales_value,
        best_product_sales_number,
        total_credit_pending,
        total_credit_pending_bs,
        total_credit_pending_count,
        total_credit_collected,
        total_credit_collected_bs,
    };
    return response;
};
exports.generalData = generalData;
const createProduct = async (companyId, createProductInput) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const productCount = await product_model_1.Product.countDocuments({ company: companyId });
    const planLimits = planLimits_1.companyPlanLimits[company.plan];
    (0, assertPlanLimit_1.assertPlanLimit)(company.plan, "productos", productCount, planLimits.maxProduct);
    const productNameValidation = await product_model_1.Product.findOne({
        company: companyId,
        name: createProductInput.name,
    });
    if (productNameValidation) {
        throw new Error("El producto ya existe");
    }
    if (createProductInput.min_stock !== undefined &&
        createProductInput.max_stock !== undefined &&
        createProductInput.min_stock > createProductInput.max_stock) {
        throw new Error("El stock mínimo no puede ser mayor que el stock máximo");
    }
    const customDataProduct = {
        code: createProductInput.code
            ? createProductInput.code
            : await (0, codeGenerator_service_1.generate)(companyId, orderType_enum_1.codeType.PRODUCT),
        name: createProductInput.name,
        description: createProductInput.description,
        image: createProductInput.image,
        images: createProductInput.images,
        show_in_store: createProductInput.show_in_store,
        sale_price: createProductInput.sale_price,
        store_price: createProductInput.store_price,
        store_discount_price: createProductInput.store_discount_price,
        category: createProductInput.category,
        brand: createProductInput.brand,
        stock_type: createProductInput.stock_type,
        min_stock: createProductInput.min_stock,
        max_stock: createProductInput.max_stock,
    };
    const newProduct = await (await product_model_1.Product.create({ ...customDataProduct, company: companyId })).populate("category");
    await (0, codeGenerator_service_1.increment)(companyId, orderType_enum_1.codeType.PRODUCT);
    if (createProductInput.category) {
        await (0, category_service_1.addCount)(createProductInput.category);
    }
    if (createProductInput.brand) {
        await (0, brand_service_1.addCount)(createProductInput.brand);
    }
    return newProduct;
};
exports.createProduct = createProduct;
const createProductSerial = async (companyId, createProductSerialInput) => {
    const productSerialValidation = await product_serial_model_1.ProductSerial.findOne({
        company: companyId,
        serial: createProductSerialInput.serial,
    });
    if (productSerialValidation) {
        throw new Error("El Serial ya existe");
    }
    const newProductSerial = await (await (await product_serial_model_1.ProductSerial.create({
        ...createProductSerialInput,
        company: companyId,
    })).populate("product")).populate("purchase_order_detail");
    return newProductSerial;
};
exports.createProductSerial = createProductSerial;
const deleteProduct = async (companyId, productId) => {
    const findPurchase = await purchase_order_detail_model_1.PurchaseOrderDetail.find({
        company: companyId,
        product: productId,
    });
    if (findPurchase.length > 0) {
        throw new Error("No se puede eliminar porque pertenece a una compra");
    }
    const product = await product_model_1.Product.findOne({ _id: productId, company: companyId });
    if (!product) {
        throw new Error("Producto no encontrado");
    }
    const deleted = await product_model_1.Product.deleteOne({
        _id: productId,
        company: companyId,
    });
    if (deleted.deletedCount > 0) {
        if (product.brand) {
            await (0, brand_service_1.subtractCount)(product.brand);
        }
        if (product.category) {
            await (0, category_service_1.subtractCount)(product.category);
        }
        return {
            success: true,
        };
    }
    return {
        success: false,
    };
};
exports.deleteProduct = deleteProduct;
const update = async (companyId, productId, updateProductInput) => {
    const existingProduct = await product_model_1.Product.findOne({
        _id: productId,
        company: companyId,
    });
    if (!existingProduct) {
        throw new Error("Producto no encontrado.");
    }
    if (updateProductInput.code !== existingProduct.code) {
        const codeExists = await product_model_1.Product.findOne({
            company: companyId,
            code: updateProductInput.code,
            _id: { $ne: productId },
        });
        if (codeExists) {
            throw new Error("Ya existe un producto con este código.");
        }
    }
    if (updateProductInput.name !== existingProduct.name) {
        const nameExists = await product_model_1.Product.findOne({
            company: companyId,
            name: updateProductInput.name,
            _id: { $ne: productId },
        });
        if (nameExists) {
            throw new Error("Ya existe un producto con este nombre.");
        }
    }
    const isStockTypeChanged = updateProductInput.stock_type !== existingProduct.stock_type;
    if (isStockTypeChanged) {
        const serialCount = await product_serial_model_1.ProductSerial.countDocuments({
            company: companyId,
            product: productId,
        });
        const inventoryCount = await product_inventory_model_1.ProductInventory.countDocuments({
            company: companyId,
            product: productId,
        });
        // Una compra pendiente ya "decidió" cómo se va a manejar el stock de este
        // producto (serial vs. inventario por almacén) al momento de agregarlo.
        // Si se cambia el tipo después, esos detalles quedan desincronizados y la
        // compra no podrá aprobarse ("Faltan registros de inventario...").
        const purchaseOrderDetailCount = await purchase_order_detail_model_1.PurchaseOrderDetail.countDocuments({
            company: companyId,
            product: productId,
        });
        if (serialCount > 0 || inventoryCount > 0 || purchaseOrderDetailCount > 0) {
            throw new Error("No se puede cambiar el tipo de stock porque ya existen registros relacionados (compras, seriales o inventario).");
        }
    }
    if (!updateProductInput.image) {
        updateProductInput.image = existingProduct.image;
    }
    if (updateProductInput.min_stock !== undefined &&
        updateProductInput.max_stock !== undefined &&
        updateProductInput.min_stock > updateProductInput.max_stock) {
        throw new Error("El stock mínimo no puede ser mayor que el stock máximo.");
    }
    const brandChanged = updateProductInput.brand?.toString() !== existingProduct.brand.toString();
    const categoryChanged = updateProductInput.category?.toString() !==
        existingProduct.category.toString();
    const productUpdated = await product_model_1.Product.findOneAndUpdate({
        _id: productId,
        company: companyId,
    }, { $set: updateProductInput }, { new: true });
    if (!productUpdated) {
        throw new Error("Ocurrio un error al actualizar el producto.");
    }
    if (brandChanged) {
        if (existingProduct.brand)
            await (0, brand_service_1.subtractCount)(existingProduct.brand._id);
        if (productUpdated.brand)
            await (0, brand_service_1.addCount)(productUpdated.brand);
    }
    if (categoryChanged) {
        if (existingProduct.category)
            await (0, category_service_1.subtractCount)(existingProduct.category._id);
        if (productUpdated.category)
            await (0, category_service_1.addCount)(productUpdated.category);
    }
    return productUpdated;
};
exports.update = update;
const previewImportProducts = async (companyId, file) => {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "buffer" });
    if (!workbook.SheetNames.length) {
        throw new Error("El archivo Excel no contiene ninguna hoja.");
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("El archivo está vacío o no contiene datos válidos.");
    }
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const productCount = await product_model_1.Product.countDocuments({ company: companyId });
    const planLimits = planLimits_1.companyPlanLimits[company.plan];
    if (planLimits.maxProduct &&
        productCount + data.length > planLimits.maxProduct) {
        const planLabel = companyPlan_enum_1.PLAN_LABELS[company.plan] ?? company.plan;
        const overLimitHint = productCount >= planLimits.maxProduct
            ? " (ya tenías más de lo que tu plan permite antes de esta importación, probablemente por un cambio de plan)"
            : "";
        throw new Error(`Tu plan actual (${planLabel}) solo permite hasta ${planLimits.maxProduct} productos. Ya tienes ${productCount} y estás intentando importar ${data.length}${overLimitHint}.`);
    }
    const existingProducts = await product_model_1.Product.find({ company: companyId }, { code: 1, name: 1 }).lean();
    const existingCodes = new Set(existingProducts.map((p) => p.code.toLowerCase()));
    const existingNames = new Set(existingProducts.map((p) => p.name.toLowerCase()));
    const seenCodes = new Set();
    const seenNames = new Set();
    const preview = data.map((row, index) => {
        const errors = [];
        const code = (row.code || "").trim();
        const name = (row.name || "").trim();
        if (code) {
            if (typeof code !== "string") {
                errors.push("Código inválido");
            }
            else {
                const lowerCode = code.toLowerCase();
                if (existingCodes.has(lowerCode)) {
                    errors.push("El código ya existe");
                }
                if (seenCodes.has(lowerCode)) {
                    errors.push("Código duplicado en la lista");
                }
                else {
                    seenCodes.add(lowerCode);
                }
            }
        }
        if (!name || typeof name !== "string") {
            errors.push("Nombre inválido");
        }
        else {
            const lowerName = name.toLowerCase();
            if (existingNames.has(lowerName)) {
                errors.push("El nombre ya existe");
            }
            if (seenNames.has(lowerName)) {
                errors.push("Nombre duplicado en la lista");
            }
            else {
                seenNames.add(lowerName);
            }
        }
        if (!row.description || typeof row.description !== "string") {
            errors.push("Descripción inválida");
        }
        if (isNaN(Number(row.sale_price)) || Number(row.sale_price) < 0) {
            errors.push("Precio de venta inválido");
        }
        if (!row.brand || typeof row.brand !== "string") {
            errors.push("Marca inválida");
        }
        if (!row.category || typeof row.category !== "string") {
            errors.push("Categoría inválida");
        }
        if (![stockType_enum_1.stockType.INDIVIDUAL, stockType_enum_1.stockType.SERIALIZADO].includes(row.stock_type)) {
            errors.push("Tipo de stock inválido");
        }
        const min_stock = Number(row.min_stock);
        const max_stock = Number(row.max_stock);
        if (isNaN(min_stock) || min_stock < 0 || !Number.isInteger(min_stock)) {
            errors.push("Stock mínimo debe ser un número entero igual o mayor a 0");
        }
        if (isNaN(max_stock) || max_stock < 1 || !Number.isInteger(max_stock)) {
            errors.push("Stock máximo debe ser un número entero mayor a 0");
        }
        if (!isNaN(min_stock) && !isNaN(max_stock) && min_stock > max_stock) {
            errors.push("El stock mínimo no puede ser mayor que el stock máximo");
        }
        return {
            row: index + 1, // índice + encabezado
            code,
            name,
            description: row.description || "",
            sale_price: Number(row.sale_price) || 0,
            brand: row.brand || "",
            category: row.category || "",
            stock_type: row.stock_type || "",
            min_stock: min_stock || 0,
            max_stock: max_stock || 0,
            isValid: errors.length === 0,
            errors,
        };
    });
    return preview;
};
exports.previewImportProducts = previewImportProducts;
const saveImportProducts = async (companyId, dataProducts) => {
    if (!dataProducts.length) {
        throw new Error("No hay productos para guardar.");
    }
    const allValid = dataProducts.every((p) => p.isValid);
    if (!allValid) {
        throw new Error("Algunos productos no son válidos. No se puede guardar.");
    }
    const createdProducts = [];
    for (const product of dataProducts) {
        const { code, name, description, brand: brandName, category: categoryName, sale_price, stock_type, min_stock, max_stock, } = product;
        let brand = await brand_model_1.Brand.findOne({
            name: brandName,
            company: companyId,
        });
        if (!brand) {
            brand = await brand_model_1.Brand.create({
                name: brandName,
                company: companyId,
            });
        }
        let category = await category_model_1.Category.findOne({
            name: categoryName,
            company: companyId,
        });
        if (!category) {
            category = await category_model_1.Category.create({
                name: categoryName,
                company: companyId,
            });
        }
        const created = await (0, exports.createProduct)(companyId, {
            code,
            name,
            description,
            brand: brand._id,
            category: category._id,
            sale_price,
            stock_type: stock_type,
            min_stock,
            max_stock,
        });
        createdProducts.push(created);
    }
    return createdProducts;
};
exports.saveImportProducts = saveImportProducts;
