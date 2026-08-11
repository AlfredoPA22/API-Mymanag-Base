"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreOrderStats = exports.addManySerialsToOrder = exports.reportSaleOrderByMonth = exports.reportCuentasCobrar = exports.reportMonthlySales = exports.reportSaleOrderByProduct = exports.reportSaleOrderByCategory = exports.reportSaleOrderBySeller = exports.reportSaleOrderByClient = exports.updateSaleOrderPaymentMethod = exports.updateSaleOrderDiscount = exports.updateSaleOrderDetail = exports.approve = exports.deleteSaleOrder = exports.deleteProductToOrder = exports.deleteSerialToOrder = exports.addSerialToOrder = exports.decrementSerials = exports.incrementSerials = exports.createCustomDetail = exports.createDetail = exports.create = exports.findQrPaymentInfoBySaleOrder = exports.findSaleOrderToPDF = exports.findSaleOrder = exports.findDetail = exports.saleOrderReport = exports.listSaleOrderByProduct = exports.findAll = void 0;
const mongoose_1 = require("mongoose");
const orderType_enum_1 = require("../../utils/enums/orderType.enum");
const productInventoryStatus_enum_1 = require("../../utils/enums/productInventoryStatus.enum");
const productSerialStatus_enum_1 = require("../../utils/enums/productSerialStatus.enum");
const productStatus_enum_1 = require("../../utils/enums/productStatus.enum");
const saleOrderPaymentMethod_1 = require("../../utils/enums/saleOrderPaymentMethod");
const saleOrderStatus_enum_1 = require("../../utils/enums/saleOrderStatus.enum");
const stockType_enum_1 = require("../../utils/enums/stockType.enum");
const codeGenerator_service_1 = require("../codeGenerator/codeGenerator.service");
const product_model_1 = require("../product/product.model");
const product_inventory_model_1 = require("../product/product_inventory.model");
const product_serial_model_1 = require("../product/product_serial.model");
const sale_payment_model_1 = require("../sale_payment/sale_payment.model");
const user_model_1 = require("../user/user.model");
const sale_order_model_1 = require("./sale_order.model");
const qr_payment_model_1 = require("../qr_payment/qr_payment.model");
const notification_service_1 = require("../notification/notification.service");
const sale_order_detail_model_1 = require("./sale_order_detail.model");
const company_model_1 = require("../company/company.model");
const dayjs_1 = __importDefault(require("dayjs"));
const planLimits_1 = require("../../utils/planLimits");
const assertPlanLimit_1 = require("../../utils/assertPlanLimit");
const money_1 = require("../../utils/money");
const findAll = async (companyId, userId, source) => {
    const foundUser = await user_model_1.User.findOne({
        _id: userId,
        company: companyId,
    });
    if (!foundUser) {
        throw new Error("Usuario no encontrado");
    }
    const filter = foundUser.is_global
        ? { company: companyId }
        : { company: companyId, created_by: userId };
    if (source) {
        filter.source = source;
    }
    return await sale_order_model_1.SaleOrder.find(filter)
        .sort({ date: -1 })
        .populate("client")
        .populate("created_by")
        .lean();
};
exports.findAll = findAll;
const listSaleOrderByProduct = async (companyId, userId, productId) => {
    const foundUser = await user_model_1.User.findOne({
        _id: userId,
        company: companyId,
    });
    if (!foundUser) {
        throw new Error("Usuario no encontrado");
    }
    const details = await sale_order_detail_model_1.SaleOrderDetail.find({
        company: companyId,
        product: productId,
    });
    if (!details.length)
        return [];
    const saleOrderIds = details.map((d) => d.sale_order);
    const saleOrders = await sale_order_model_1.SaleOrder.find({
        _id: { $in: saleOrderIds },
        company: companyId,
        ...(foundUser.is_global ? {} : { created_by: userId }),
    })
        .populate("client")
        .populate("created_by")
        .lean();
    const allowedOrderIds = new Set(saleOrders.map((so) => so._id.toString()));
    const result = details
        .filter((detail) => allowedOrderIds.has(detail.sale_order.toString()))
        .map((detail) => {
        const order = saleOrders.find((so) => so._id.toString() === detail.sale_order.toString());
        return {
            saleOrder: order,
            saleOrderDetail: detail,
        };
    });
    return result.sort((a, b) => {
        return (new Date(b.saleOrder.date).getTime() -
            new Date(a.saleOrder.date).getTime());
    });
};
exports.listSaleOrderByProduct = listSaleOrderByProduct;
const saleOrderReport = async (companyId, userId, filterSaleOrderInput) => {
    const foundUser = await user_model_1.User.findOne({
        _id: userId,
        company: companyId,
    });
    if (!foundUser) {
        throw new Error("Usuario no encontrado");
    }
    const query = { company: companyId };
    if (!foundUser.is_global) {
        query.created_by = userId;
    }
    if (filterSaleOrderInput.startDate || filterSaleOrderInput.endDate) {
        query.date = {};
        if (filterSaleOrderInput.startDate) {
            const startDate = new Date(filterSaleOrderInput.startDate);
            startDate.setUTCHours(0, 0, 0, 0);
            query.date.$gte = startDate;
        }
        if (filterSaleOrderInput.endDate) {
            const endDate = new Date(filterSaleOrderInput.endDate);
            endDate.setUTCHours(23, 59, 59, 999);
            query.date.$lte = endDate;
        }
    }
    if (filterSaleOrderInput.client) {
        query.client = filterSaleOrderInput.client;
    }
    if (filterSaleOrderInput.status && filterSaleOrderInput.status !== "Todos") {
        query.status = filterSaleOrderInput.status;
    }
    const saleOrders = await sale_order_model_1.SaleOrder.find(query)
        .populate("client")
        .populate("company")
        .lean();
    return saleOrders;
};
exports.saleOrderReport = saleOrderReport;
const findDetail = async (companyId, saleOrderId) => {
    const listDetail = await sale_order_detail_model_1.SaleOrderDetail.find({
        company: companyId,
        sale_order: saleOrderId,
    })
        .populate("sale_order")
        .populate("company")
        .populate({
        path: "product",
        populate: {
            path: "brand",
        },
    })
        .lean();
    return listDetail;
};
exports.findDetail = findDetail;
const findSaleOrder = async (companyId, saleOrderId) => {
    const saleOrder = await sale_order_model_1.SaleOrder.findOne({
        _id: saleOrderId,
        company: companyId,
    })
        .populate("client")
        .populate("company")
        .lean();
    if (!saleOrder) {
        throw new Error("Orden de venta no encontrada");
    }
    return saleOrder;
};
exports.findSaleOrder = findSaleOrder;
const findSaleOrderToPDF = async (companyId, saleOrderId) => {
    const saleOrder = await (0, exports.findSaleOrder)(companyId, saleOrderId);
    const saleOrderDetail = await (0, exports.findDetail)(companyId, saleOrderId);
    const saleOrderDetailToPDF = await Promise.all(saleOrderDetail.map(async (detail) => {
        const productSerials = await product_serial_model_1.ProductSerial.find({
            company: companyId,
            sale_order_detail: detail._id,
        }).lean();
        return {
            saleOrderDetail: detail,
            productSerial: productSerials,
        };
    }));
    const qrPaymentInfo = saleOrder.is_paid
        ? await getQrPaymentInfoForSaleOrder(companyId, saleOrderId)
        : null;
    const response = {
        saleOrder,
        saleOrderDetail: saleOrderDetailToPDF,
        qr_payment_info: qrPaymentInfo,
    };
    return response;
};
exports.findSaleOrderToPDF = findSaleOrderToPDF;
const getQrPaymentInfoForSaleOrder = async (companyId, saleOrderId) => {
    const qrPayment = await qr_payment_model_1.QrPayment.findOne({
        company: companyId,
        sale_order: saleOrderId,
        type: "venta_contado",
        processed: true,
    }).sort({ createdAt: -1 });
    if (!qrPayment)
        return null;
    return {
        amount: qrPayment.amount,
        currency: qrPayment.currency,
        amount_bob: qrPayment.amount_bob ?? undefined,
        exchange_rate: qrPayment.exchange_rate ?? undefined,
    };
};
const findQrPaymentInfoBySaleOrder = async (companyId, saleOrderId) => {
    const saleOrder = await sale_order_model_1.SaleOrder.findOne({ _id: saleOrderId, company: companyId }).lean();
    if (!saleOrder || !saleOrder.is_paid)
        return null;
    return getQrPaymentInfoForSaleOrder(companyId, saleOrderId);
};
exports.findQrPaymentInfoBySaleOrder = findQrPaymentInfoBySaleOrder;
const create = async (companyId, userId, createSaleOrderInput) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const inputDate = (0, dayjs_1.default)(createSaleOrderInput.date);
    const startOfMonth = inputDate.startOf("month").toDate();
    const endOfMonth = inputDate.endOf("month").toDate();
    const saleOrderCount = await sale_order_model_1.SaleOrder.countDocuments({
        company: companyId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
    });
    const planLimits = planLimits_1.companyPlanLimits[company.plan];
    (0, assertPlanLimit_1.assertPlanLimit)(company.plan, "órdenes de venta", saleOrderCount, planLimits.maxSaleOrder, { perMonth: true });
    // Moneda por nota: `currency` solo se guarda cuando la nota se crea en la
    // moneda ALTERNA a la de la empresa (Bs para una empresa en $). El
    // `exchange_rate`, en cambio, se congela en TODA venta de una empresa en
    // dólares (sin importar en qué moneda se vendió), para que después se
    // pueda ver cualquier venta en Bs usando el tipo de cambio que había en
    // ese momento — la nota siempre se muestra por defecto en la moneda en la
    // que realmente se vendió. Por eso, si la empresa opera en dólares, no se
    // puede registrar NINGUNA venta sin tipo de cambio configurado.
    let orderCurrency = null;
    let orderExchangeRate = null;
    if (company.currency === "$") {
        if (!company.exchange_rate || company.exchange_rate <= 0) {
            throw new Error("Configura el tipo de cambio de la empresa en Ajustes antes de registrar una venta.");
        }
        orderExchangeRate = company.exchange_rate;
    }
    if (createSaleOrderInput.currency && createSaleOrderInput.currency !== company.currency) {
        if (company.currency !== "$" || createSaleOrderInput.currency !== "Bs") {
            throw new Error("Esta empresa no permite crear ventas en esa moneda.");
        }
        orderCurrency = "Bs";
    }
    // is_paid ya no se asume al crear la venta para ningún método — para
    // Efectivo/Transferencia se confirma recién al aprobar la venta
    // (ver approve()); para QR se confirma vía el webhook de Mesa de Pagos.
    const newSaleOrder = await (await sale_order_model_1.SaleOrder.create({
        company: companyId,
        code: await (0, codeGenerator_service_1.generate)(companyId, orderType_enum_1.codeType.SALE_ORDER),
        date: createSaleOrderInput.date,
        client: createSaleOrderInput.client,
        payment_method: createSaleOrderInput.payment_method,
        contado_payment_method: createSaleOrderInput.contado_payment_method,
        is_paid: false,
        source: createSaleOrderInput.source ?? "manual",
        created_by: userId,
        currency: orderCurrency,
        exchange_rate: orderExchangeRate,
    })).populate("client");
    await (0, codeGenerator_service_1.increment)(companyId, orderType_enum_1.codeType.SALE_ORDER);
    return newSaleOrder;
};
exports.create = create;
const calcDetailDiscount = (gross, discountType, discountValue) => {
    let discountAmount = 0;
    if (discountType === "PORCENTUAL" && discountValue) {
        discountAmount = (0, money_1.round2)(gross * (discountValue / 100));
    }
    else if (discountType === "FIJO" && discountValue) {
        discountAmount = (0, money_1.round2)(Math.min(discountValue, gross));
    }
    const subtotal = (0, money_1.round2)(gross - discountAmount);
    return { discountAmount, subtotal };
};
const updateOrderTotal = async (companyId, saleOrderId) => {
    const order = await sale_order_model_1.SaleOrder.findOne({ _id: saleOrderId, company: companyId });
    if (!order)
        return;
    const details = await sale_order_detail_model_1.SaleOrderDetail.find({ sale_order: saleOrderId, company: companyId });
    const sumSubtotals = (0, money_1.round2)(details.reduce((acc, d) => acc + (d.subtotal || 0), 0));
    let discountAmount = 0;
    if (order.discount_type === "PORCENTUAL" && order.discount_value) {
        discountAmount = (0, money_1.round2)(sumSubtotals * (order.discount_value / 100));
    }
    else if (order.discount_type === "FIJO" && order.discount_value) {
        discountAmount = (0, money_1.round2)(Math.min(order.discount_value, sumSubtotals));
    }
    const newTotal = (0, money_1.round2)(sumSubtotals - discountAmount);
    await sale_order_model_1.SaleOrder.findOneAndUpdate({ _id: saleOrderId, company: companyId }, { total: newTotal, discount_amount: discountAmount });
    return newTotal;
};
const createDetail = async (companyId, createSaleOrderDetailInput) => {
    const foundDetail = await sale_order_detail_model_1.SaleOrderDetail.findOne({
        company: companyId,
        sale_order: createSaleOrderDetailInput.sale_order,
        product: createSaleOrderDetailInput.product,
    });
    const foundOrder = await sale_order_model_1.SaleOrder.findOne({
        _id: createSaleOrderDetailInput.sale_order,
        company: companyId,
    });
    if (!foundOrder) {
        throw new Error("Orden no encontrada");
    }
    if (foundDetail) {
        throw new Error("El producto ya existe en la venta");
    }
    if (createSaleOrderDetailInput.sale_price <= 0) {
        throw new Error("Ingrese un precio mayor a 0");
    }
    if (createSaleOrderDetailInput.quantity <= 0) {
        throw new Error("Ingrese una cantidad mayor a 0");
    }
    const foundProduct = await product_model_1.Product.findOne({
        _id: createSaleOrderDetailInput.product,
        company: companyId,
    });
    if (!foundProduct) {
        throw new Error("Producto no encontrado");
    }
    if (createSaleOrderDetailInput.quantity > foundProduct.stock) {
        throw new Error("No hay suficiente stock");
    }
    if (foundProduct.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
        if (!createSaleOrderDetailInput.warehouse) {
            throw new Error("Seleccione un almacén");
        }
        const productInventories = await product_inventory_model_1.ProductInventory.find({
            company: companyId,
            product: createSaleOrderDetailInput.product,
            warehouse: createSaleOrderDetailInput.warehouse,
        });
        if (productInventories.length === 0) {
            throw new Error("No hay stock registrado para este producto en este almacén");
        }
        let quantityToAssign = createSaleOrderDetailInput.quantity;
        let inventoryUsage = [];
        const totalAvailableStock = productInventories.reduce((total, inventory) => total + inventory.available, 0);
        if (totalAvailableStock < quantityToAssign) {
            throw new Error("No hay suficiente stock disponible en los inventarios");
        }
        for (const productInventory of productInventories) {
            if (quantityToAssign <= 0)
                break;
            const availableQuantity = productInventory.available;
            const quantityToReserve = Math.min(availableQuantity, quantityToAssign);
            if (quantityToReserve > 0) {
                // Verificamos que la cantidad sea mayor a 0
                productInventory.reserved += quantityToReserve;
                productInventory.available -= quantityToReserve;
                await productInventory.save();
                inventoryUsage.push({
                    warehouse: createSaleOrderDetailInput.warehouse,
                    purchase_order_detail: productInventory.purchase_order_detail,
                    quantity: quantityToReserve,
                });
                quantityToAssign -= quantityToReserve;
            }
        }
        if (quantityToAssign > 0) {
            throw new Error("No hay suficiente stock disponible en los inventarios");
        }
        createSaleOrderDetailInput.inventory_usage = inventoryUsage;
    }
    else {
        delete createSaleOrderDetailInput.warehouse;
    }
    const gross = (0, money_1.round2)(createSaleOrderDetailInput.quantity * createSaleOrderDetailInput.sale_price);
    const { discountAmount, subtotal } = calcDetailDiscount(gross, createSaleOrderDetailInput.discount_type, createSaleOrderDetailInput.discount_value);
    let newSaleOrderDetail;
    try {
        newSaleOrderDetail = await (await (await sale_order_detail_model_1.SaleOrderDetail.create({
            company: companyId,
            ...createSaleOrderDetailInput,
            discount_amount: discountAmount,
            subtotal,
        })).populate("sale_order")).populate("product");
        await updateOrderTotal(companyId, createSaleOrderDetailInput.sale_order);
    }
    catch (createError) {
        if (foundProduct.stock_type === stockType_enum_1.stockType.INDIVIDUAL &&
            createSaleOrderDetailInput.inventory_usage) {
            for (const usage of createSaleOrderDetailInput.inventory_usage) {
                const productInventory = await product_inventory_model_1.ProductInventory.findOne({
                    company: companyId,
                    product: createSaleOrderDetailInput.product,
                    warehouse: usage.warehouse,
                    purchase_order_detail: usage.purchase_order_detail,
                });
                if (productInventory) {
                    productInventory.reserved -= usage.quantity;
                    productInventory.available += usage.quantity;
                    await productInventory.save();
                }
            }
        }
        throw new Error("Error al crear el detalle de venta. Se revirtió la reserva de inventario.");
    }
    const foundSaleOrderDetail = await sale_order_detail_model_1.SaleOrderDetail.findOne({
        _id: newSaleOrderDetail._id,
        company: companyId,
    })
        .populate("sale_order")
        .populate("product")
        .lean();
    if (!foundSaleOrderDetail) {
        throw new Error("Detalle de venta no encontrado");
    }
    return foundSaleOrderDetail;
};
exports.createDetail = createDetail;
// Agrega un ítem "sin inventario" a la venta — algo que el vendedor
// consiguió de un tercero para esta venta puntual, sin manejarlo como
// producto propio. A diferencia de createDetail(), no toca stock, seriales
// ni almacenes: es solo nombre + precio (+ costo opcional).
const createCustomDetail = async (companyId, input) => {
    const foundOrder = await sale_order_model_1.SaleOrder.findOne({
        _id: input.sale_order,
        company: companyId,
    });
    if (!foundOrder) {
        throw new Error("Orden no encontrada");
    }
    if (!input.name?.trim()) {
        throw new Error("Ingrese un nombre para el ítem");
    }
    if (input.sale_price <= 0) {
        throw new Error("Ingrese un precio mayor a 0");
    }
    if (input.quantity <= 0) {
        throw new Error("Ingrese una cantidad mayor a 0");
    }
    const gross = (0, money_1.round2)(input.quantity * input.sale_price);
    const { discountAmount, subtotal } = calcDetailDiscount(gross, input.discount_type, input.discount_value);
    const newSaleOrderDetail = await sale_order_detail_model_1.SaleOrderDetail.create({
        company: companyId,
        sale_order: input.sale_order,
        product: null,
        custom_name: input.name.trim(),
        custom_cost: input.cost != null && input.cost >= 0 ? input.cost : null,
        sale_price: input.sale_price,
        quantity: input.quantity,
        discount_type: input.discount_type ?? null,
        discount_value: input.discount_value ?? 0,
        discount_amount: discountAmount,
        subtotal,
    });
    await updateOrderTotal(companyId, input.sale_order);
    const foundSaleOrderDetail = await sale_order_detail_model_1.SaleOrderDetail.findOne({
        _id: newSaleOrderDetail._id,
        company: companyId,
    })
        .populate("sale_order")
        .lean();
    if (!foundSaleOrderDetail) {
        throw new Error("Detalle de venta no encontrado");
    }
    return foundSaleOrderDetail;
};
exports.createCustomDetail = createCustomDetail;
const incrementSerials = async (companyId, saleOrderDetailId) => {
    await sale_order_detail_model_1.SaleOrderDetail.updateOne({ _id: saleOrderDetailId, company: companyId }, { $inc: { serials: 1 } });
};
exports.incrementSerials = incrementSerials;
const decrementSerials = async (companyId, saleOrderDetailId) => {
    await sale_order_detail_model_1.SaleOrderDetail.updateOne({ _id: saleOrderDetailId, company: companyId }, { $inc: { serials: -1 } });
};
exports.decrementSerials = decrementSerials;
const addSerialToOrder = async (companyId, addSerialToOrder) => {
    const foundSaleOrderDetail = await sale_order_detail_model_1.SaleOrderDetail.findOne({
        _id: addSerialToOrder.sale_order_detail,
        company: companyId,
    });
    if (!foundSaleOrderDetail) {
        throw new Error("No existe el detalle en la venta");
    }
    const foundProduct = await product_model_1.Product.findOne({
        _id: foundSaleOrderDetail.product,
        company: companyId,
    });
    if (!foundProduct) {
        throw new Error("Producto no encontrado");
    }
    if (foundProduct.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
        throw new Error("No se pueden agregar seriales a este producto");
    }
    if (foundSaleOrderDetail.serials >= foundSaleOrderDetail.quantity) {
        throw new Error("El detalle ya tiene asignado todos sus seriales");
    }
    const foundProductSerial = await product_serial_model_1.ProductSerial.findOne({
        company: companyId,
        serial: addSerialToOrder.serial,
    });
    if (!foundProductSerial) {
        throw new Error("No existe el serial");
    }
    if (foundProductSerial.sale_order_detail &&
        foundProductSerial.sale_order_detail.toString() ===
            addSerialToOrder.sale_order_detail.toString()) {
        throw new Error("El serial ya está asignado a este detalle de venta");
    }
    if (foundProductSerial.product.toString() !==
        foundSaleOrderDetail.product.toString()) {
        throw new Error("El serial no pertenece a este producto");
    }
    else if (foundProductSerial.status === productSerialStatus_enum_1.productSerialStatus.VENDIDO) {
        throw new Error("El serial ya fue vendido");
    }
    else if (foundProductSerial.status === productSerialStatus_enum_1.productSerialStatus.RESERVADO) {
        throw new Error("El serial fue registrado en otra venta con estado (Borrador)");
    }
    else if (foundProductSerial.status === productSerialStatus_enum_1.productSerialStatus.BORRADOR) {
        throw new Error("El serial no esta disponible");
    }
    await product_serial_model_1.ProductSerial.updateOne({
        _id: foundProductSerial._id,
        company: companyId,
    }, {
        $set: {
            sale_order_detail: addSerialToOrder.sale_order_detail,
            status: productSerialStatus_enum_1.productSerialStatus.RESERVADO,
        },
    });
    await (0, exports.incrementSerials)(companyId, addSerialToOrder.sale_order_detail);
    const updatedProductSerial = await product_serial_model_1.ProductSerial.findOne({
        _id: foundProductSerial._id,
        company: companyId,
    });
    return updatedProductSerial;
};
exports.addSerialToOrder = addSerialToOrder;
const deleteSerialToOrder = async (companyId, productSerialId) => {
    const foundProductSerial = await product_serial_model_1.ProductSerial.findOne({
        _id: productSerialId,
        company: companyId,
    });
    if (!foundProductSerial) {
        throw new Error("Serial no fue encontrado");
    }
    if (foundProductSerial.status !== productSerialStatus_enum_1.productSerialStatus.RESERVADO) {
        throw new Error("No se puede borrar el serial");
    }
    else if (!foundProductSerial.sale_order_detail) {
        throw new Error("No se puede borrar el serial");
    }
    await (0, exports.decrementSerials)(companyId, foundProductSerial.sale_order_detail._id);
    await product_serial_model_1.ProductSerial.updateOne({
        _id: foundProductSerial._id,
        company: companyId,
    }, {
        $set: {
            sale_order_detail: null,
            status: productSerialStatus_enum_1.productSerialStatus.DISPONIBLE,
        },
    });
    return {
        success: true,
    };
};
exports.deleteSerialToOrder = deleteSerialToOrder;
const deleteProductToOrder = async (companyId, saleOrderDetailId) => {
    const foundSaleOrderDetail = await sale_order_detail_model_1.SaleOrderDetail.findOne({
        _id: saleOrderDetailId,
        company: companyId,
    })
        .populate("product")
        .populate("sale_order")
        .lean();
    if (!foundSaleOrderDetail) {
        throw new Error("El detalle no fue encontrado");
    }
    const foundSaleOrder = await sale_order_model_1.SaleOrder.findOne({
        _id: foundSaleOrderDetail.sale_order._id,
        company: companyId,
    });
    if (!foundSaleOrder) {
        throw new Error("La orden no fue encontrada");
    }
    if (foundSaleOrder.status !== saleOrderStatus_enum_1.saleOrderStatus.BORRADOR) {
        throw new Error("No se puede borrar el detalle");
    }
    if (foundSaleOrderDetail.product?.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
        for (const inventoryUsage of foundSaleOrderDetail.inventory_usage) {
            const productInventory = await product_inventory_model_1.ProductInventory.findOne({
                company: companyId,
                product: foundSaleOrderDetail.product,
                warehouse: inventoryUsage.warehouse,
                purchase_order_detail: inventoryUsage.purchase_order_detail,
            });
            if (productInventory) {
                productInventory.available += inventoryUsage.quantity;
                productInventory.reserved -= inventoryUsage.quantity;
                await productInventory.save();
            }
        }
    }
    await product_serial_model_1.ProductSerial.updateMany({ sale_order_detail: saleOrderDetailId, company: companyId }, {
        $set: { sale_order_detail: null, status: productSerialStatus_enum_1.productSerialStatus.DISPONIBLE },
    });
    const deleteProductToSaleOrderDetail = await sale_order_detail_model_1.SaleOrderDetail.deleteOne({
        _id: saleOrderDetailId,
        company: companyId,
    });
    if (deleteProductToSaleOrderDetail.deletedCount > 0) {
        await updateOrderTotal(companyId, foundSaleOrder._id);
        return { success: true };
    }
    else {
        return { success: false };
    }
};
exports.deleteProductToOrder = deleteProductToOrder;
const deleteSaleOrder = async (companyId, saleOrderId) => {
    const foundSaleOrder = await sale_order_model_1.SaleOrder.findOne({
        _id: saleOrderId,
        company: companyId,
    });
    if (!foundSaleOrder) {
        throw new Error("La venta no fue encontrada");
    }
    const foundPayments = await sale_payment_model_1.SalePayment.find({
        sale_order: saleOrderId,
        company: companyId,
    });
    if (foundPayments.length > 0) {
        throw new Error("No se puede eliminar venta porque tiene pagos registrados");
    }
    const foundSaleOrderDetails = await sale_order_detail_model_1.SaleOrderDetail.find({
        company: companyId,
        sale_order: saleOrderId,
    });
    // Proceso para estado "APROBADO"
    if (foundSaleOrder.status === saleOrderStatus_enum_1.saleOrderStatus.APROBADO) {
        await Promise.all(foundSaleOrderDetails.map(async (detail) => {
            // Los ítems sin inventario no tienen stock/seriales/almacén que
            // revertir — solo se elimina el detalle.
            if (!detail.product) {
                await sale_order_detail_model_1.SaleOrderDetail.deleteOne({
                    _id: detail._id,
                    company: companyId,
                });
                return;
            }
            // Actualizar el stock del producto
            const productUpdate = await product_model_1.Product.findOneAndUpdate({ _id: detail.product._id, company: companyId }, {
                $inc: { stock: detail.quantity }, // Sumar la cantidad vendida al stock
            }, { new: true });
            // Si el producto estaba sin stock y ahora tiene stock, cambiar a "disponible"
            if (productUpdate &&
                productUpdate.stock > 0 &&
                productUpdate.status === productStatus_enum_1.productStatus.SIN_STOCK) {
                await product_model_1.Product.findOneAndUpdate({ _id: detail.product._id, company: companyId }, {
                    status: productStatus_enum_1.productStatus.DISPONIBLE,
                });
            }
            // Actualizar los seriales del producto
            await product_serial_model_1.ProductSerial.updateMany({
                company: companyId,
                sale_order_detail: detail._id,
                product: detail.product._id,
            }, {
                status: productSerialStatus_enum_1.productSerialStatus.DISPONIBLE, // Cambiar a "disponible"
                sale_order_detail: null, // Poner el campo sale_order_detail a null
            });
            if (detail.inventory_usage && Array.isArray(detail.inventory_usage)) {
                await Promise.all(detail.inventory_usage.map(async (usage) => {
                    const inventory = await product_inventory_model_1.ProductInventory.findOne({
                        company: companyId,
                        product: detail.product._id,
                        warehouse: usage.warehouse,
                        purchase_order_detail: usage.purchase_order_detail,
                    });
                    if (inventory) {
                        inventory.sold -= usage.quantity;
                        if (inventory.sold < 0)
                            inventory.sold = 0;
                        inventory.available += usage.quantity;
                        // Actualizar estado del inventario
                        if (inventory.available > 0) {
                            inventory.status = productInventoryStatus_enum_1.productInventoryStatus.DISPONIBLE;
                        }
                        await inventory.save();
                    }
                }));
            }
            // Eliminar el detalle de la orden de venta
            await sale_order_detail_model_1.SaleOrderDetail.deleteOne({
                _id: detail._id,
                company: companyId,
            });
        }));
        // Eliminar la orden de venta
        const deleteSaleOrder = await sale_order_model_1.SaleOrder.deleteOne({
            _id: saleOrderId,
            company: companyId,
        });
        if (deleteSaleOrder.deletedCount > 0) {
            if (foundSaleOrder.payment_method === saleOrderPaymentMethod_1.paymentMethod.CONTADO &&
                foundSaleOrder.contado_payment_method === "QR" &&
                foundSaleOrder.is_paid) {
                await (0, notification_service_1.createNotification)(companyId, {
                    type: "qr_payment_deleted",
                    title: "Se eliminó una venta cobrada por QR",
                    message: `Se eliminó la venta ${foundSaleOrder.code}, que había sido cobrada por QR (${foundSaleOrder.total}). El dinero ya se recibió — si corresponde, gestiona el reembolso.`,
                });
            }
            return {
                success: true,
            };
        }
    }
    // Proceso para estado "BORRADOR"
    if (foundSaleOrder.status === saleOrderStatus_enum_1.saleOrderStatus.BORRADOR) {
        // En estado borrador solo eliminamos los detalles de la orden y la orden de venta
        await Promise.all(foundSaleOrderDetails.map(async (detail) => {
            // Los ítems sin inventario no tienen stock/seriales/almacén que
            // revertir — solo se elimina el detalle.
            if (!detail.product) {
                await sale_order_detail_model_1.SaleOrderDetail.deleteOne({
                    _id: detail._id,
                    company: companyId,
                });
                return;
            }
            // Restaurar inventory_usage reservado para productos INDIVIDUAL
            if (detail.inventory_usage && Array.isArray(detail.inventory_usage) && detail.inventory_usage.length > 0) {
                for (const usage of detail.inventory_usage) {
                    const productInventory = await product_inventory_model_1.ProductInventory.findOne({
                        company: companyId,
                        product: detail.product,
                        warehouse: usage.warehouse,
                        purchase_order_detail: usage.purchase_order_detail,
                    });
                    if (productInventory) {
                        productInventory.available += usage.quantity;
                        productInventory.reserved -= usage.quantity;
                        await productInventory.save();
                    }
                }
            }
            await product_serial_model_1.ProductSerial.updateMany({
                company: companyId,
                sale_order_detail: detail._id,
                product: detail.product._id,
            }, {
                status: productSerialStatus_enum_1.productSerialStatus.DISPONIBLE, // Cambiar a "disponible"
                sale_order_detail: null, // Poner el campo sale_order_detail a null
            });
            // Eliminar el detalle de la orden de venta
            await sale_order_detail_model_1.SaleOrderDetail.deleteOne({
                _id: detail._id,
                company: companyId,
            });
        }));
        // Eliminar la orden de venta
        const deleteSaleOrder = await sale_order_model_1.SaleOrder.deleteOne({
            _id: saleOrderId,
            company: companyId,
        });
        if (deleteSaleOrder.deletedCount > 0) {
            if (foundSaleOrder.payment_method === saleOrderPaymentMethod_1.paymentMethod.CONTADO &&
                foundSaleOrder.contado_payment_method === "QR" &&
                foundSaleOrder.is_paid) {
                await (0, notification_service_1.createNotification)(companyId, {
                    type: "qr_payment_deleted",
                    title: "Se eliminó una venta cobrada por QR",
                    message: `Se eliminó la venta ${foundSaleOrder.code} (Borrador), que ya había sido cobrada por QR (${foundSaleOrder.total}). El dinero ya se recibió — si corresponde, gestiona el reembolso.`,
                });
            }
            return {
                success: true,
            };
        }
    }
    return {
        success: false,
    };
};
exports.deleteSaleOrder = deleteSaleOrder;
const approve = async (companyId, saleOrderId) => {
    const foundOrder = await sale_order_model_1.SaleOrder.findOne({
        _id: saleOrderId,
        company: companyId,
    });
    const foundDetail = await sale_order_detail_model_1.SaleOrderDetail.find({
        company: companyId,
        sale_order: saleOrderId,
    })
        .populate("product")
        .lean();
    if (!foundOrder) {
        throw new Error("La venta no fue encontrada");
    }
    if (foundOrder.status === saleOrderStatus_enum_1.saleOrderStatus.APROBADO) {
        throw new Error("La venta ya fue aprobada");
    }
    if (foundOrder.status === saleOrderStatus_enum_1.saleOrderStatus.CANCELADO) {
        throw new Error("La venta esta cancelada");
    }
    if (foundDetail.length === 0) {
        throw new Error("La venta debe tener almenos un producto");
    }
    const hasSerialsInZero = foundDetail.some((detail) => detail.product?.stock_type === stockType_enum_1.stockType.SERIALIZADO &&
        detail.serials !== detail.quantity);
    if (hasSerialsInZero) {
        throw new Error("Faltan agregar seriales a la venta");
    }
    for (const detail of foundDetail) {
        if (detail.product?.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
            const product = await product_model_1.Product.findOne({
                _id: detail.product._id,
                company: companyId,
            });
            if (product && product.stock < detail.quantity) {
                throw new Error(`No hay suficiente stock para el producto ${product.name}. Solo quedan ${product.stock} unidades disponibles.`);
            }
        }
    }
    // Los ítems sin inventario (product null) no tocan stock/seriales — se
    // aprueban junto con el resto de la venta sin pasar por este bloque.
    for (const detail of foundDetail) {
        if (!detail.product)
            continue;
        const product = await product_model_1.Product.findOneAndUpdate({ _id: detail.product._id, company: companyId }, { $inc: { stock: -detail.quantity } }, { new: true });
        if (product && product?.stock <= 0) {
            await product_model_1.Product.findOneAndUpdate({ _id: detail.product._id, company: companyId }, { status: productStatus_enum_1.productStatus.SIN_STOCK }, { new: true });
        }
        // Actualizar seriales a VENDIDO
        await product_serial_model_1.ProductSerial.updateMany({
            company: companyId,
            sale_order_detail: detail._id,
            product: detail.product._id,
        }, {
            status: productSerialStatus_enum_1.productSerialStatus.VENDIDO,
        });
        // Modificar los inventarios usando inventory_usage del detalle
        if (detail.inventory_usage &&
            Array.isArray(detail.inventory_usage) &&
            detail.inventory_usage.length > 0) {
            for (const usage of detail.inventory_usage) {
                const inventory = await product_inventory_model_1.ProductInventory.findOne({
                    company: companyId,
                    product: detail.product._id,
                    warehouse: usage.warehouse,
                    purchase_order_detail: usage.purchase_order_detail,
                });
                if (inventory) {
                    const qty = usage.quantity ?? 0;
                    inventory.sold += qty;
                    inventory.reserved -= qty;
                    if (inventory.reserved < 0)
                        inventory.reserved = 0;
                    if (inventory.reserved === 0 && inventory.available === 0) {
                        inventory.status = productInventoryStatus_enum_1.productInventoryStatus.SIN_STOCK;
                    }
                    await inventory.save();
                }
            }
        }
    }
    // Efectivo/Transferencia se confirman como pagadas recién al aprobar la
    // venta — no antes. QR se deja tal cual: solo el webhook de Mesa de Pagos
    // marca is_paid (puede que ya esté en true si esta aprobación viene
    // disparada por el propio webhook tras confirmarse el pago).
    if (foundOrder.payment_method === saleOrderPaymentMethod_1.paymentMethod.CONTADO &&
        foundOrder.contado_payment_method !== "QR") {
        foundOrder.is_paid = true;
    }
    foundOrder.status = saleOrderStatus_enum_1.saleOrderStatus.APROBADO;
    await foundOrder.save();
    return foundOrder;
};
exports.approve = approve;
const updateSaleOrderDetail = async (companyId, saleOrderDetailId, updateSaleOrderInput) => {
    const findSaleOrderDetail = await sale_order_detail_model_1.SaleOrderDetail.findOne({
        _id: saleOrderDetailId,
        company: companyId,
    })
        .populate("product")
        .populate("sale_order");
    if (!findSaleOrderDetail) {
        throw new Error("No se encontro el detalle");
    }
    const findSaleOrder = await sale_order_model_1.SaleOrder.findOne({
        _id: findSaleOrderDetail.sale_order,
        company: companyId,
    });
    if (!findSaleOrder) {
        throw new Error("No se encontro la orden");
    }
    if (findSaleOrder.status === saleOrderStatus_enum_1.saleOrderStatus.APROBADO) {
        throw new Error("No se se puede editar el detalle porque la venta esta aprobada.");
    }
    const stockProduct = await product_model_1.Product.findOne({
        _id: findSaleOrderDetail.product,
        company: companyId,
    });
    if (!stockProduct) {
        throw new Error("No hay stock.");
    }
    if (updateSaleOrderInput.quantity > stockProduct.stock) {
        throw new Error("No hay stock suficiente.");
    }
    if (updateSaleOrderInput.quantity < findSaleOrderDetail.serials) {
        throw new Error("La nueva cantidad no puede ser menor que la cantidad de seriales.");
    }
    if (stockProduct.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
        for (const usage of findSaleOrderDetail.inventory_usage) {
            const productInventory = await product_inventory_model_1.ProductInventory.findOne({
                company: companyId,
                warehouse: usage.warehouse,
                purchase_order_detail: usage.purchase_order_detail,
            });
            if (productInventory) {
                const quantity = usage.quantity ?? 0;
                productInventory.available += quantity;
                productInventory.reserved -= quantity;
                await productInventory.save();
            }
        }
        const warehousesUsed = findSaleOrderDetail.inventory_usage.map((usage) => usage.warehouse);
        const productInventories = await product_inventory_model_1.ProductInventory.find({
            company: companyId,
            product: stockProduct._id,
            warehouse: { $in: warehousesUsed },
        });
        let quantityToAssign = updateSaleOrderInput.quantity;
        const inventoryUsage = [];
        const totalAvailableStock = productInventories.reduce((total, inventory) => total + inventory.available, 0);
        if (totalAvailableStock < quantityToAssign) {
            throw new Error("No hay suficiente stock disponible en los inventarios");
        }
        for (const productInventory of productInventories) {
            if (quantityToAssign <= 0)
                break;
            const availableQuantity = productInventory.available;
            const quantityToReserve = Math.min(availableQuantity, quantityToAssign);
            if (quantityToReserve > 0) {
                productInventory.reserved += quantityToReserve;
                productInventory.available -= quantityToReserve;
                await productInventory.save();
                inventoryUsage.push({
                    warehouse: productInventory.warehouse,
                    purchase_order_detail: productInventory.purchase_order_detail,
                    quantity: quantityToReserve,
                });
                quantityToAssign -= quantityToReserve;
            }
        }
        findSaleOrderDetail.inventory_usage.splice(0, findSaleOrderDetail.inventory_usage.length, ...inventoryUsage);
    }
    const gross = (0, money_1.round2)(updateSaleOrderInput.sale_price * updateSaleOrderInput.quantity);
    const { discountAmount, subtotal } = calcDetailDiscount(gross, updateSaleOrderInput.discount_type, updateSaleOrderInput.discount_value);
    findSaleOrderDetail.sale_price = updateSaleOrderInput.sale_price;
    findSaleOrderDetail.quantity = updateSaleOrderInput.quantity;
    findSaleOrderDetail.discount_type = updateSaleOrderInput.discount_type ?? null;
    findSaleOrderDetail.discount_value = updateSaleOrderInput.discount_value ?? 0;
    findSaleOrderDetail.discount_amount = discountAmount;
    findSaleOrderDetail.subtotal = subtotal;
    await findSaleOrderDetail.save();
    await updateOrderTotal(companyId, findSaleOrder._id);
    return findSaleOrderDetail;
};
exports.updateSaleOrderDetail = updateSaleOrderDetail;
const updateSaleOrderDiscount = async (companyId, saleOrderId, discountType, discountValue) => {
    const foundOrder = await sale_order_model_1.SaleOrder.findOne({ _id: saleOrderId, company: companyId });
    if (!foundOrder)
        throw new Error("Orden de venta no encontrada");
    foundOrder.discount_type = discountType ?? null;
    foundOrder.discount_value = discountValue ?? 0;
    await foundOrder.save();
    await updateOrderTotal(companyId, saleOrderId);
    return await sale_order_model_1.SaleOrder.findOne({ _id: saleOrderId, company: companyId })
        .populate("client")
        .lean();
};
exports.updateSaleOrderDiscount = updateSaleOrderDiscount;
const updateSaleOrderPaymentMethod = async (companyId, saleOrderId, paymentMethodInput, contadoPaymentMethod) => {
    const foundOrder = await sale_order_model_1.SaleOrder.findOne({ _id: saleOrderId, company: companyId });
    if (!foundOrder)
        throw new Error("Orden de venta no encontrada");
    if (foundOrder.status !== saleOrderStatus_enum_1.saleOrderStatus.BORRADOR) {
        throw new Error("Solo se puede editar el método de pago de una venta en Borrador");
    }
    const existingPaymentsCount = await sale_payment_model_1.SalePayment.countDocuments({
        sale_order: saleOrderId,
        company: companyId,
    });
    if (existingPaymentsCount > 0) {
        throw new Error("No se puede cambiar el método de pago porque ya existen pagos registrados para esta venta");
    }
    foundOrder.payment_method = paymentMethodInput;
    foundOrder.contado_payment_method =
        paymentMethodInput === saleOrderPaymentMethod_1.paymentMethod.CONTADO
            ? contadoPaymentMethod ?? undefined
            : undefined;
    // La venta sigue en Borrador en este punto — is_paid se confirma recién
    // al aprobar (Efectivo/Transferencia) o vía webhook de Mesa de Pagos (QR),
    // nunca al solo cambiar el método.
    foundOrder.is_paid = false;
    await foundOrder.save();
    return await sale_order_model_1.SaleOrder.findOne({ _id: saleOrderId, company: companyId })
        .populate("client")
        .lean();
};
exports.updateSaleOrderPaymentMethod = updateSaleOrderPaymentMethod;
const reportSaleOrderByClient = async (companyId, userId, startDate, endDate) => {
    const foundUser = await user_model_1.User.findOne({
        _id: userId,
        company: companyId,
    });
    if (!foundUser) {
        throw new Error("Usuario no encontrado");
    }
    const currentYear = new Date().getFullYear();
    const dateFrom = startDate
        ? new Date(startDate)
        : new Date(`${currentYear}-01-01T00:00:00.000`);
    const dateTo = endDate
        ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })()
        : new Date(`${currentYear + 1}-01-01T00:00:00.000`);
    const matchStage = {
        company: new mongoose_1.Types.ObjectId(companyId),
        status: saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
        date: { $gte: dateFrom, $lte: dateTo },
    };
    if (!foundUser.is_global) {
        matchStage["created_by"] = new mongoose_1.Types.ObjectId(userId);
    }
    const topClients = await sale_order_model_1.SaleOrder.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: "$client",
                total: { $sum: (0, money_1.toBaseCurrencyExpr)("$total", "$currency", "$exchange_rate") },
            },
        },
        {
            $addFields: {
                clientObjectId: {
                    $cond: [
                        { $eq: [{ $type: "$_id" }, "objectId"] },
                        "$_id",
                        { $toObjectId: "$_id" },
                    ],
                },
            },
        },
        {
            $lookup: {
                from: "clients",
                localField: "clientObjectId",
                foreignField: "_id",
                as: "clientData",
            },
        },
        {
            $unwind: {
                path: "$clientData",
                preserveNullAndEmptyArrays: false,
            },
        },
        {
            $project: {
                _id: 0,
                client: "$clientData.fullName",
                total: 1,
            },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
    ]);
    return topClients.map((c) => ({ ...c, total: (0, money_1.round2)(c.total) }));
};
exports.reportSaleOrderByClient = reportSaleOrderByClient;
const reportSaleOrderBySeller = async (companyId, userId, startDate, endDate) => {
    const foundUser = await user_model_1.User.findOne({
        _id: userId,
        company: companyId,
    });
    if (!foundUser) {
        throw new Error("Usuario no encontrado");
    }
    const currentYear = new Date().getFullYear();
    const dateFrom = startDate
        ? new Date(startDate)
        : new Date(`${currentYear}-01-01T00:00:00.000`);
    const dateTo = endDate
        ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })()
        : new Date(`${currentYear + 1}-01-01T00:00:00.000`);
    const matchStage = {
        company: new mongoose_1.Types.ObjectId(companyId),
        status: saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
        date: { $gte: dateFrom, $lte: dateTo },
    };
    if (!foundUser.is_global) {
        matchStage["created_by"] = new mongoose_1.Types.ObjectId(userId);
    }
    const topSellers = await sale_order_model_1.SaleOrder.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: "$created_by",
                total: { $sum: (0, money_1.toBaseCurrencyExpr)("$total", "$currency", "$exchange_rate") },
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "userData",
            },
        },
        {
            $unwind: {
                path: "$userData",
                preserveNullAndEmptyArrays: false,
            },
        },
        {
            $project: {
                _id: 0,
                seller: "$userData.user_name",
                total: 1,
            },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
    ]);
    return topSellers.map((s) => ({ ...s, total: (0, money_1.round2)(s.total) }));
};
exports.reportSaleOrderBySeller = reportSaleOrderBySeller;
const reportSaleOrderByCategory = async (companyId, userId, startDate, endDate) => {
    const foundUser = await user_model_1.User.findOne({
        _id: userId,
        company: companyId,
    });
    if (!foundUser) {
        throw new Error("Usuario no encontrado");
    }
    const currentYear = new Date().getFullYear();
    const dateFrom = startDate
        ? new Date(startDate)
        : new Date(`${currentYear}-01-01T00:00:00.000`);
    const dateTo = endDate
        ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })()
        : new Date(`${currentYear + 1}-01-01T00:00:00.000`);
    const matchStage = {
        "orderData.company": new mongoose_1.Types.ObjectId(companyId),
        "orderData.status": saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
        "orderData.date": { $gte: dateFrom, $lte: dateTo },
    };
    if (!foundUser.is_global) {
        matchStage["orderData.created_by"] = new mongoose_1.Types.ObjectId(userId);
    }
    const topCategories = await sale_order_detail_model_1.SaleOrderDetail.aggregate([
        {
            $lookup: {
                from: "sale_orders",
                localField: "sale_order",
                foreignField: "_id",
                as: "orderData",
            },
        },
        { $unwind: "$orderData" },
        { $match: matchStage },
        {
            $lookup: {
                from: "products",
                localField: "product",
                foreignField: "_id",
                as: "productData",
            },
        },
        { $unwind: "$productData" },
        {
            $lookup: {
                from: "categories",
                localField: "productData.category",
                foreignField: "_id",
                as: "categoryData",
            },
        },
        { $unwind: "$categoryData" },
        {
            $group: {
                _id: "$categoryData._id",
                category: { $first: "$categoryData.name" },
                total: { $sum: (0, money_1.toBaseCurrencyExpr)("$subtotal", "$orderData.currency", "$orderData.exchange_rate") },
            },
        },
        { $sort: { total: -1 } },
        { $limit: 5 },
        {
            $project: {
                _id: 0,
                category: 1,
                total: 1,
            },
        },
    ]);
    return topCategories.map((c) => ({ ...c, total: (0, money_1.round2)(c.total) }));
};
exports.reportSaleOrderByCategory = reportSaleOrderByCategory;
const reportSaleOrderByProduct = async (companyId, userId, startDate, endDate) => {
    const foundUser = await user_model_1.User.findOne({ _id: userId, company: companyId });
    if (!foundUser)
        throw new Error("Usuario no encontrado");
    const currentYear = new Date().getFullYear();
    const dateFrom = startDate
        ? new Date(startDate)
        : new Date(`${currentYear}-01-01T00:00:00.000`);
    const dateTo = endDate
        ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })()
        : new Date(`${currentYear + 1}-01-01T00:00:00.000`);
    const orderMatch = {
        "order.company": new mongoose_1.Types.ObjectId(companyId),
        "order.status": saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
        "order.date": { $gte: dateFrom, $lte: dateTo },
    };
    if (!foundUser.is_global) {
        orderMatch["order.created_by"] = new mongoose_1.Types.ObjectId(userId);
    }
    const topProducts = await sale_order_detail_model_1.SaleOrderDetail.aggregate([
        {
            $lookup: {
                from: "sale_orders",
                localField: "sale_order",
                foreignField: "_id",
                as: "order",
            },
        },
        { $unwind: "$order" },
        { $match: orderMatch },
        {
            $group: {
                _id: "$product",
                total: { $sum: (0, money_1.toBaseCurrencyExpr)("$subtotal", "$order.currency", "$order.exchange_rate") },
            },
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productData",
            },
        },
        { $unwind: "$productData" },
        {
            $project: {
                _id: 0,
                product: "$productData.name",
                total: 1,
            },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
    ]);
    return topProducts.map((p) => ({ ...p, total: (0, money_1.round2)(p.total) }));
};
exports.reportSaleOrderByProduct = reportSaleOrderByProduct;
const reportMonthlySales = async (companyId, userId, startDate, endDate) => {
    const foundUser = await user_model_1.User.findOne({ _id: userId, company: companyId });
    if (!foundUser)
        throw new Error("Usuario no encontrado");
    const currentYear = new Date().getFullYear();
    const dateFrom = startDate
        ? new Date(startDate)
        : new Date(`${currentYear}-01-01T00:00:00.000`);
    const dateTo = endDate
        ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })()
        : new Date(`${currentYear}-12-31T23:59:59.999`);
    const matchStage = {
        company: new mongoose_1.Types.ObjectId(companyId),
        status: saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
        date: { $gte: dateFrom, $lte: dateTo },
    };
    if (!foundUser.is_global) {
        matchStage["created_by"] = new mongoose_1.Types.ObjectId(userId);
    }
    const monthlyData = await sale_order_model_1.SaleOrder.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: { $month: "$date" },
                total: { $sum: (0, money_1.toBaseCurrencyExpr)("$total", "$currency", "$exchange_rate") },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const result = monthNames.map((name, i) => {
        const found = monthlyData.find((m) => m._id === i + 1);
        return { month: name, total: found ? (0, money_1.round2)(found.total) : 0 };
    });
    return result;
};
exports.reportMonthlySales = reportMonthlySales;
const reportCuentasCobrar = async (companyId, userId, startDate, endDate) => {
    const foundUser = await user_model_1.User.findOne({ _id: userId, company: companyId });
    if (!foundUser)
        throw new Error("Usuario no encontrado");
    const matchStage = {
        company: new mongoose_1.Types.ObjectId(companyId),
        status: saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
        payment_method: saleOrderPaymentMethod_1.paymentMethod.CREDITO,
        is_paid: false,
    };
    if (!foundUser.is_global) {
        matchStage["created_by"] = new mongoose_1.Types.ObjectId(userId);
    }
    if (startDate || endDate) {
        matchStage["date"] = {};
        if (startDate)
            matchStage["date"]["$gte"] = new Date(startDate);
        if (endDate)
            matchStage["date"]["$lte"] = new Date(endDate);
    }
    return await sale_order_model_1.SaleOrder.find(matchStage)
        .populate("client")
        .populate("created_by")
        .sort({ date: -1 })
        .lean();
};
exports.reportCuentasCobrar = reportCuentasCobrar;
const reportSaleOrderByMonth = async (companyId, userId, startDate, endDate) => {
    const foundUser = await user_model_1.User.findOne({
        _id: userId,
        company: companyId,
    });
    if (!foundUser) {
        throw new Error("Usuario no encontrado");
    }
    const now = new Date();
    const dateFrom = startDate
        ? new Date(startDate)
        : new Date(now.getFullYear(), now.getMonth(), 1);
    const dateTo = endDate
        ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })()
        : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const filter = {
        company: companyId,
        date: { $gte: dateFrom, $lte: dateTo },
        status: saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
    };
    if (!foundUser.is_global) {
        filter.created_by = userId;
    }
    return await sale_order_model_1.SaleOrder.find(filter)
        .populate("client")
        .populate("created_by")
        .sort({ date: -1 })
        .limit(10)
        .lean();
};
exports.reportSaleOrderByMonth = reportSaleOrderByMonth;
const addManySerialsToOrder = async (companyId, input) => {
    const { sale_order_detail, serials } = input;
    if (!serials || serials.length === 0) {
        throw new Error("Debe enviar al menos un serial");
    }
    const uniqueSerials = new Set(serials.map((s) => s.trim()));
    if (uniqueSerials.size !== serials.length) {
        throw new Error("Existen seriales repetidos en la lista enviada");
    }
    const foundSaleOrderDetail = await sale_order_detail_model_1.SaleOrderDetail.findOne({
        _id: sale_order_detail,
        company: companyId,
    });
    if (!foundSaleOrderDetail) {
        throw new Error("No existe el detalle en la venta");
    }
    const foundProduct = await product_model_1.Product.findOne({
        _id: foundSaleOrderDetail.product,
        company: companyId,
    });
    if (!foundProduct) {
        throw new Error("Producto no encontrado");
    }
    if (foundProduct.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
        throw new Error("No se pueden agregar seriales a este producto");
    }
    const remainingSlots = foundSaleOrderDetail.quantity - foundSaleOrderDetail.serials;
    if (remainingSlots <= 0) {
        throw new Error("El detalle ya tiene asignado todos sus seriales");
    }
    if (serials.length > remainingSlots) {
        throw new Error(`Solo puede agregar ${remainingSlots} serial(es) más para completar la cantidad de la venta`);
    }
    // Buscamos todos los seriales de golpe para validar de forma masiva
    const foundProductSerials = await product_serial_model_1.ProductSerial.find({
        company: companyId,
        serial: { $in: Array.from(uniqueSerials) },
    });
    const foundBySerial = new Map(foundProductSerials.map((ps) => [ps.serial, ps]));
    const missing = [];
    const wrongProduct = [];
    const alreadySold = [];
    const alreadyReserved = [];
    const notAvailable = [];
    for (const serial of uniqueSerials) {
        const found = foundBySerial.get(serial);
        if (!found) {
            missing.push(serial);
            continue;
        }
        if (found.product.toString() !== foundSaleOrderDetail.product.toString()) {
            wrongProduct.push(serial);
            continue;
        }
        if (found.status === productSerialStatus_enum_1.productSerialStatus.VENDIDO) {
            alreadySold.push(serial);
            continue;
        }
        if (found.status === productSerialStatus_enum_1.productSerialStatus.RESERVADO) {
            alreadyReserved.push(serial);
            continue;
        }
        if (found.status === productSerialStatus_enum_1.productSerialStatus.BORRADOR) {
            notAvailable.push(serial);
            continue;
        }
    }
    const errors = [];
    if (missing.length)
        errors.push(`No existen: ${missing.join(", ")}`);
    if (wrongProduct.length)
        errors.push(`No pertenecen al producto: ${wrongProduct.join(", ")}`);
    if (alreadySold.length)
        errors.push(`Ya vendidos: ${alreadySold.join(", ")}`);
    if (alreadyReserved.length)
        errors.push(`Ya reservados en otra venta: ${alreadyReserved.join(", ")}`);
    if (notAvailable.length)
        errors.push(`No disponibles (borrador): ${notAvailable.join(", ")}`);
    if (errors.length > 0) {
        throw new Error(`No se pudo completar la operación. ${errors.join(". ")}`);
    }
    const idsToReserve = Array.from(uniqueSerials).map((serial) => foundBySerial.get(serial)._id);
    await product_serial_model_1.ProductSerial.updateMany({ _id: { $in: idsToReserve }, company: companyId }, {
        $set: {
            sale_order_detail: sale_order_detail,
            status: productSerialStatus_enum_1.productSerialStatus.RESERVADO,
        },
    });
    await sale_order_detail_model_1.SaleOrderDetail.updateOne({ _id: sale_order_detail, company: companyId }, { $inc: { serials: idsToReserve.length } });
    const updatedProductSerials = await product_serial_model_1.ProductSerial.find({
        _id: { $in: idsToReserve },
        company: companyId,
    });
    return updatedProductSerials;
};
exports.addManySerialsToOrder = addManySerialsToOrder;
const getStoreOrderStats = async (companyId) => {
    const companyObjectId = new mongoose_1.Types.ObjectId(companyId.toString());
    const [counts] = await sale_order_model_1.SaleOrder.aggregate([
        { $match: { company: companyObjectId, source: "tienda_online" } },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                pendingOrders: {
                    $sum: {
                        $cond: [{ $eq: ["$status", saleOrderStatus_enum_1.saleOrderStatus.BORRADOR] }, 1, 0],
                    },
                },
                approvedOrders: {
                    $sum: {
                        $cond: [{ $eq: ["$status", saleOrderStatus_enum_1.saleOrderStatus.APROBADO] }, 1, 0],
                    },
                },
                totalRevenue: {
                    $sum: {
                        $cond: [
                            { $eq: ["$status", saleOrderStatus_enum_1.saleOrderStatus.APROBADO] },
                            (0, money_1.toBaseCurrencyExpr)("$total", "$currency", "$exchange_rate"),
                            0,
                        ],
                    },
                },
            },
        },
    ]);
    const totalOrders = counts?.totalOrders ?? 0;
    const pendingOrders = counts?.pendingOrders ?? 0;
    const approvedOrders = counts?.approvedOrders ?? 0;
    const totalRevenue = (0, money_1.round2)(counts?.totalRevenue ?? 0);
    const averageTicket = approvedOrders > 0 ? (0, money_1.round2)(totalRevenue / approvedOrders) : 0;
    const topProducts = await sale_order_detail_model_1.SaleOrderDetail.aggregate([
        {
            $lookup: {
                from: "sale_orders",
                localField: "sale_order",
                foreignField: "_id",
                as: "order",
            },
        },
        { $unwind: "$order" },
        {
            $match: {
                "order.company": companyObjectId,
                "order.source": "tienda_online",
                "order.status": saleOrderStatus_enum_1.saleOrderStatus.APROBADO,
            },
        },
        {
            $group: {
                _id: "$product",
                quantity: { $sum: "$quantity" },
                total: { $sum: (0, money_1.toBaseCurrencyExpr)("$subtotal", "$order.currency", "$order.exchange_rate") },
            },
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productData",
            },
        },
        { $unwind: "$productData" },
        {
            $project: {
                _id: 0,
                product: "$productData.name",
                quantity: 1,
                total: 1,
            },
        },
        { $sort: { quantity: -1 } },
        { $limit: 5 },
    ]);
    return {
        totalOrders,
        pendingOrders,
        approvedOrders,
        totalRevenue,
        averageTicket,
        topProducts: topProducts.map((p) => ({ ...p, total: (0, money_1.round2)(p.total) })),
    };
};
exports.getStoreOrderStats = getStoreOrderStats;
