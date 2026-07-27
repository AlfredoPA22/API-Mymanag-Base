"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addManySerialsToOrder = exports.updatePurchaseOrderDetail = exports.approve = exports.decrementSerials = exports.incrementSerials = exports.deletePurchaseOrder = exports.deleteProductToOrder = exports.deleteSerialToOrder = exports.addSerialToOrder = exports.createDetail = exports.create = exports.findPurchaseOrderToPDF = exports.findPurchaseOrder = exports.findDetail = exports.purchaseOrderReport = exports.listPurchaseOrderByProduct = exports.findAll = void 0;
const orderType_enum_1 = require("../../utils/enums/orderType.enum");
const productInventoryStatus_enum_1 = require("../../utils/enums/productInventoryStatus.enum");
const productSerialStatus_enum_1 = require("../../utils/enums/productSerialStatus.enum");
const productStatus_enum_1 = require("../../utils/enums/productStatus.enum");
const purchaseOrderStatus_enum_1 = require("../../utils/enums/purchaseOrderStatus.enum");
const stockType_enum_1 = require("../../utils/enums/stockType.enum");
const codeGenerator_service_1 = require("../codeGenerator/codeGenerator.service");
const product_model_1 = require("../product/product.model");
const product_service_1 = require("../product/product.service");
const product_inventory_model_1 = require("../product/product_inventory.model");
const product_serial_model_1 = require("../product/product_serial.model");
const user_model_1 = require("../user/user.model");
const purchase_order_model_1 = require("./purchase_order.model");
const purchase_order_detail_model_1 = require("./purchase_order_detail.model");
const money_1 = require("../../utils/money");
const company_model_1 = require("../company/company.model");
const planLimits_1 = require("../../utils/planLimits");
const assertPlanLimit_1 = require("../../utils/assertPlanLimit");
const dayjs_1 = __importDefault(require("dayjs"));
const findAll = async (companyId, userId) => {
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
    return await purchase_order_model_1.PurchaseOrder.find(filter)
        .sort({ date: -1 })
        .populate("provider")
        .populate("created_by")
        .populate("company")
        .lean();
};
exports.findAll = findAll;
const listPurchaseOrderByProduct = async (companyId, userId, productId) => {
    const foundUser = await user_model_1.User.findOne({
        _id: userId,
        company: companyId,
    });
    if (!foundUser) {
        throw new Error("Usuario no encontrado");
    }
    const details = await purchase_order_detail_model_1.PurchaseOrderDetail.find({
        company: companyId,
        product: productId,
    });
    if (!details.length)
        return [];
    const purchaseOrderIds = details.map((d) => d.purchase_order);
    const purchaseOrders = await purchase_order_model_1.PurchaseOrder.find({
        _id: { $in: purchaseOrderIds },
        company: companyId,
        ...(foundUser.is_global ? {} : { created_by: userId }),
    })
        .populate("provider")
        .populate("created_by")
        .lean();
    const allowedOrderIds = new Set(purchaseOrders.map((so) => so._id.toString()));
    const result = details
        .filter((detail) => allowedOrderIds.has(detail.purchase_order.toString()))
        .map((detail) => {
        const order = purchaseOrders.find((so) => so._id.toString() === detail.purchase_order.toString());
        return {
            purchaseOrder: order,
            purchaseOrderDetail: detail,
        };
    });
    return result.sort((a, b) => {
        return (new Date(b.purchaseOrder.date).getTime() -
            new Date(a.purchaseOrder.date).getTime());
    });
};
exports.listPurchaseOrderByProduct = listPurchaseOrderByProduct;
const purchaseOrderReport = async (companyId, userId, filterPurchaseOrderInput) => {
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
    if (filterPurchaseOrderInput.startDate || filterPurchaseOrderInput.endDate) {
        query.date = {};
        if (filterPurchaseOrderInput.startDate) {
            const startDate = new Date(filterPurchaseOrderInput.startDate);
            startDate.setUTCHours(0, 0, 0, 0);
            query.date.$gte = startDate;
        }
        if (filterPurchaseOrderInput.endDate) {
            const endDate = new Date(filterPurchaseOrderInput.endDate);
            endDate.setUTCHours(23, 59, 59, 999);
            query.date.$lte = endDate;
        }
    }
    if (filterPurchaseOrderInput.provider) {
        query.provider = filterPurchaseOrderInput.provider;
    }
    if (filterPurchaseOrderInput.status &&
        filterPurchaseOrderInput.status !== "Todos") {
        query.status = filterPurchaseOrderInput.status;
    }
    const purchaseOrders = await purchase_order_model_1.PurchaseOrder.find(query)
        .populate("provider")
        .populate("company")
        .lean();
    return purchaseOrders;
};
exports.purchaseOrderReport = purchaseOrderReport;
const findDetail = async (companyId, purchaseOrderId) => {
    const listDetail = await purchase_order_detail_model_1.PurchaseOrderDetail.find({
        company: companyId,
        purchase_order: purchaseOrderId,
    })
        .populate("purchase_order")
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
const findPurchaseOrder = async (companyId, purchaseOrderId) => {
    const purchaseOrder = await purchase_order_model_1.PurchaseOrder.findOne({
        _id: purchaseOrderId,
        company: companyId,
    })
        .populate("provider")
        .populate("company")
        .lean();
    if (!purchaseOrder) {
        throw new Error("Orden de compra no encontrada");
    }
    return purchaseOrder;
};
exports.findPurchaseOrder = findPurchaseOrder;
const findPurchaseOrderToPDF = async (companyId, purchaseOrderId) => {
    const purchaseOrder = await (0, exports.findPurchaseOrder)(companyId, purchaseOrderId);
    const purchaseOrderDetail = await (0, exports.findDetail)(companyId, purchaseOrderId);
    const purchaseOrderDetailToPDF = await Promise.all(purchaseOrderDetail.map(async (detail) => {
        const productSerials = await product_serial_model_1.ProductSerial.find({
            company: companyId,
            purchase_order_detail: detail._id,
        }).lean();
        return {
            purchaseOrderDetail: detail,
            productSerial: productSerials,
        };
    }));
    const response = {
        purchaseOrder,
        purchaseOrderDetail: purchaseOrderDetailToPDF,
    };
    return response;
};
exports.findPurchaseOrderToPDF = findPurchaseOrderToPDF;
const create = async (companyId, userId, createPurchaseOrderInput) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const inputDate = (0, dayjs_1.default)(createPurchaseOrderInput.date);
    const startOfMonth = inputDate.startOf("month").toDate();
    const endOfMonth = inputDate.endOf("month").toDate();
    const purchaseOrderCount = await purchase_order_model_1.PurchaseOrder.countDocuments({
        company: companyId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
    });
    const planLimits = planLimits_1.companyPlanLimits[company.plan];
    (0, assertPlanLimit_1.assertPlanLimit)(company.plan, "órdenes de compra", purchaseOrderCount, planLimits.maxPurchaseOrder, { perMonth: true });
    const newPurchaseOrder = await (await purchase_order_model_1.PurchaseOrder.create({
        company: companyId,
        code: await (0, codeGenerator_service_1.generate)(companyId, orderType_enum_1.codeType.PURCHASE_ORDER),
        date: createPurchaseOrderInput.date,
        provider: createPurchaseOrderInput.provider,
        created_by: userId,
    })).populate("provider");
    await (0, codeGenerator_service_1.increment)(companyId, orderType_enum_1.codeType.PURCHASE_ORDER);
    return newPurchaseOrder;
};
exports.create = create;
const createDetail = async (companyId, createPurchaseOrderDetailInput) => {
    const foundDetail = await purchase_order_detail_model_1.PurchaseOrderDetail.findOne({
        company: companyId,
        purchase_order: createPurchaseOrderDetailInput.purchase_order,
        product: createPurchaseOrderDetailInput.product,
    });
    const foundOrder = await purchase_order_model_1.PurchaseOrder.findOne({
        _id: createPurchaseOrderDetailInput.purchase_order,
        company: companyId,
    });
    if (!foundOrder) {
        throw new Error("Orden no encontrada");
    }
    if (foundDetail) {
        throw new Error("El producto ya existe en la compra");
    }
    if (createPurchaseOrderDetailInput.purchase_price <= 0) {
        throw new Error("Ingrese un precio mayor a 0");
    }
    if (createPurchaseOrderDetailInput.quantity <= 0) {
        throw new Error("Ingrese una cantidad mayor a 0");
    }
    const foundProduct = await product_model_1.Product.findOne({
        _id: createPurchaseOrderDetailInput.product,
        company: companyId,
    });
    if (!foundProduct) {
        throw new Error("Producto no encontrado");
    }
    if (foundProduct.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
        if (!createPurchaseOrderDetailInput.warehouse) {
            throw new Error("Seleccione un almacén de recepción");
        }
    }
    const subtotal = (0, money_1.round2)(createPurchaseOrderDetailInput.quantity *
        createPurchaseOrderDetailInput.purchase_price);
    const newPurchaseOrderDetail = await (await (await purchase_order_detail_model_1.PurchaseOrderDetail.create({
        company: companyId,
        ...createPurchaseOrderDetailInput,
        subtotal,
    })).populate("purchase_order")).populate("product");
    const updatedTotal = (0, money_1.round2)(foundOrder.total + subtotal);
    await purchase_order_model_1.PurchaseOrder.findOneAndUpdate({ _id: createPurchaseOrderDetailInput.purchase_order, company: companyId }, {
        total: updatedTotal,
    }, { new: true });
    if (newPurchaseOrderDetail.product.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
        try {
            await product_inventory_model_1.ProductInventory.create({
                company: companyId,
                product: createPurchaseOrderDetailInput.product,
                warehouse: createPurchaseOrderDetailInput.warehouse,
                purchase_order_detail: newPurchaseOrderDetail._id,
                quantity: createPurchaseOrderDetailInput.quantity,
                status: productInventoryStatus_enum_1.productInventoryStatus.BORRADOR,
            });
        }
        catch (inventoryError) {
            await purchase_order_detail_model_1.PurchaseOrderDetail.deleteOne({
                _id: newPurchaseOrderDetail._id,
                company: companyId,
            });
            await purchase_order_model_1.PurchaseOrder.findOneAndUpdate({ _id: createPurchaseOrderDetailInput.purchase_order, company: companyId }, { total: foundOrder.total }, { new: true });
            throw new Error("Error al crear el inventario del producto. Se revirtió el detalle de la compra.");
        }
    }
    const foundPurchaseOrderDetail = await purchase_order_detail_model_1.PurchaseOrderDetail.findOne({
        _id: newPurchaseOrderDetail._id,
        company: companyId,
    })
        .populate("purchase_order")
        .populate("product")
        .lean();
    if (!foundPurchaseOrderDetail) {
        throw new Error("Detalle de orden no encontrado después de crear");
    }
    return foundPurchaseOrderDetail;
};
exports.createDetail = createDetail;
const addSerialToOrder = async (companyId, addSerialToOrder) => {
    const foundPurchaseOrderDetail = await purchase_order_detail_model_1.PurchaseOrderDetail.findOne({
        _id: addSerialToOrder.purchase_order_detail,
        company: companyId,
    });
    if (!foundPurchaseOrderDetail) {
        throw new Error("No existe el detalle en la compra");
    }
    const foundProduct = await product_model_1.Product.findOne({
        _id: foundPurchaseOrderDetail.product,
        company: companyId,
    });
    if (!foundProduct) {
        throw new Error("Producto no encontrado");
    }
    if (foundProduct.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
        throw new Error("No se pueden agregar seriales a este producto");
    }
    if (foundPurchaseOrderDetail.serials >= foundPurchaseOrderDetail.quantity) {
        throw new Error("El detalle ya tiene asignado todos sus seriales");
    }
    const newProductSerial = await (0, product_service_1.createProductSerial)(companyId, {
        purchase_order_detail: addSerialToOrder.purchase_order_detail,
        warehouse: addSerialToOrder.warehouse,
        product: foundPurchaseOrderDetail.product._id,
        serial: addSerialToOrder.serial,
    });
    await (0, exports.incrementSerials)(companyId, addSerialToOrder.purchase_order_detail);
    return newProductSerial;
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
    if (foundProductSerial.status !== productSerialStatus_enum_1.productSerialStatus.BORRADOR) {
        throw new Error("No se puede borrar el serial");
    }
    else if (!foundProductSerial.purchase_order_detail) {
        throw new Error("No se puede borrar el serial");
    }
    const deleteProductSerial = await product_serial_model_1.ProductSerial.deleteOne({
        _id: productSerialId,
        company: companyId,
    });
    if (deleteProductSerial.deletedCount > 0) {
        await (0, exports.decrementSerials)(companyId, foundProductSerial.purchase_order_detail._id);
        return {
            success: true,
        };
    }
    return {
        success: false,
    };
};
exports.deleteSerialToOrder = deleteSerialToOrder;
const deleteProductToOrder = async (companyId, purchaseOrderDetailId) => {
    const foundPurchaseOrderDetail = await purchase_order_detail_model_1.PurchaseOrderDetail.findOne({
        _id: purchaseOrderDetailId,
        company: companyId,
    });
    if (!foundPurchaseOrderDetail) {
        throw new Error("El detalle no fue encontrado");
    }
    const foundPurchaseOrder = await purchase_order_model_1.PurchaseOrder.findOne({
        _id: foundPurchaseOrderDetail.purchase_order._id,
        company: companyId,
    });
    if (!foundPurchaseOrder) {
        throw new Error("La orden no fue encontrada");
    }
    if (foundPurchaseOrder.status !== purchaseOrderStatus_enum_1.purchaseOrderStatus.BORRADOR) {
        throw new Error("No se puede borrar el detalle");
    }
    await product_serial_model_1.ProductSerial.deleteMany({
        company: companyId,
        purchase_order_detail: purchaseOrderDetailId,
    });
    await product_inventory_model_1.ProductInventory.deleteOne({
        company: companyId,
        purchase_order_detail: purchaseOrderDetailId,
    });
    const deleteProductToPurchaseOrderDetail = await purchase_order_detail_model_1.PurchaseOrderDetail.deleteOne({
        _id: purchaseOrderDetailId,
        company: companyId,
    });
    if (deleteProductToPurchaseOrderDetail.deletedCount > 0) {
        const updatedTotal = (0, money_1.round2)(foundPurchaseOrder.total - foundPurchaseOrderDetail.subtotal);
        await purchase_order_model_1.PurchaseOrder.updateOne({ _id: foundPurchaseOrder._id, company: companyId }, {
            total: updatedTotal,
        });
        return {
            success: true,
        };
    }
    else {
        return {
            success: false,
        };
    }
};
exports.deleteProductToOrder = deleteProductToOrder;
const deletePurchaseOrder = async (companyId, purchaseOrderId) => {
    const foundPurchaseOrder = await purchase_order_model_1.PurchaseOrder.findOne({
        _id: purchaseOrderId,
        company: companyId,
    });
    if (!foundPurchaseOrder) {
        throw new Error("La compra no fue encontrada");
    }
    const foundPurchaseOrderDetails = await purchase_order_detail_model_1.PurchaseOrderDetail.find({
        company: companyId,
        purchase_order: purchaseOrderId,
    });
    if (foundPurchaseOrder.status === purchaseOrderStatus_enum_1.purchaseOrderStatus.APROBADO) {
        const soldOrReservedSerials = await product_serial_model_1.ProductSerial.find({
            company: companyId,
            purchase_order_detail: {
                $in: foundPurchaseOrderDetails.map((d) => d._id),
            },
            status: {
                $in: [productSerialStatus_enum_1.productSerialStatus.VENDIDO, productSerialStatus_enum_1.productSerialStatus.RESERVADO],
            },
        });
        const blockedInventory = await product_inventory_model_1.ProductInventory.find({
            company: companyId,
            purchase_order_detail: {
                $in: foundPurchaseOrderDetails.map((d) => d._id),
            },
            $or: [{ sold: { $gt: 0 } }, { reserved: { $gt: 0 } }],
        });
        if (soldOrReservedSerials.length > 0 || blockedInventory.length > 0) {
            throw new Error("No se puede eliminar la compra porque existen productos vendidos o reservados.");
        }
        await Promise.all(foundPurchaseOrderDetails.map(async (detail) => {
            // Actualizar el stock del producto
            const productUpdate = await product_model_1.Product.findOneAndUpdate({ _id: detail.product._id, company: companyId }, {
                $inc: { stock: -detail.quantity }, // Restar la cantidad comprada al stock
            }, { new: true });
            if (!productUpdate) {
                throw new Error("No se puede actualizar.");
            }
            // Si el producto estaba disponible y ahora no tiene stock, cambiar a "sin stcock"
            if (productUpdate.stock <= 0 &&
                productUpdate.status === productStatus_enum_1.productStatus.DISPONIBLE) {
                await product_model_1.Product.findOneAndUpdate({ _id: detail.product._id, company: companyId }, {
                    status: productStatus_enum_1.productStatus.SIN_STOCK,
                });
            }
            // Actualizar los seriales del producto
            await product_serial_model_1.ProductSerial.deleteMany({
                company: companyId,
                purchase_order_detail: detail._id,
                product: detail.product._id,
            });
            await product_inventory_model_1.ProductInventory.deleteOne({
                company: companyId,
                purchase_order_detail: detail._id,
                product: detail.product._id,
            });
            // Eliminar el detalle de la orden de venta
            await purchase_order_detail_model_1.PurchaseOrderDetail.deleteOne({
                _id: detail._id,
                company: companyId,
            });
        }));
        // Eliminar la orden de compra
        const deletePurchaseOrder = await purchase_order_model_1.PurchaseOrder.deleteOne({
            _id: purchaseOrderId,
            company: companyId,
        });
        if (deletePurchaseOrder.deletedCount > 0) {
            return {
                success: true,
            };
        }
    }
    // Proceso para estado "BORRADOR"
    if (foundPurchaseOrder.status === purchaseOrderStatus_enum_1.purchaseOrderStatus.BORRADOR) {
        // En estado borrador solo eliminamos los detalles de la orden y la orden de compra
        await Promise.all(foundPurchaseOrderDetails.map(async (detail) => {
            await product_serial_model_1.ProductSerial.deleteMany({
                company: companyId,
                purchase_order_detail: detail._id,
                product: detail.product._id,
            });
            await product_inventory_model_1.ProductInventory.deleteOne({
                company: companyId,
                purchase_order_detail: detail._id,
            });
            // Eliminar el detalle de la orden de compra
            await purchase_order_detail_model_1.PurchaseOrderDetail.deleteOne({
                _id: detail._id,
                company: companyId,
            });
        }));
        // Eliminar la orden de venta
        const deletePurchaseOrder = await purchase_order_model_1.PurchaseOrder.deleteOne({
            _id: purchaseOrderId,
            company: companyId,
        });
        if (deletePurchaseOrder.deletedCount > 0) {
            return {
                success: true,
            };
        }
    }
    return {
        success: false,
    };
};
exports.deletePurchaseOrder = deletePurchaseOrder;
const incrementSerials = async (companyId, purchaseOrderDetailId) => {
    await purchase_order_detail_model_1.PurchaseOrderDetail.updateOne({ _id: purchaseOrderDetailId, company: companyId }, { $inc: { serials: 1 } });
};
exports.incrementSerials = incrementSerials;
const decrementSerials = async (companyId, purchaseOrderDetailId) => {
    await purchase_order_detail_model_1.PurchaseOrderDetail.updateOne({ _id: purchaseOrderDetailId, company: companyId }, { $inc: { serials: -1 } });
};
exports.decrementSerials = decrementSerials;
const approve = async (companyId, purchaseOrderId) => {
    const foundOrder = await purchase_order_model_1.PurchaseOrder.findOne({
        _id: purchaseOrderId,
        company: companyId,
    });
    const foundDetail = await purchase_order_detail_model_1.PurchaseOrderDetail.find({
        company: companyId,
        purchase_order: purchaseOrderId,
    })
        .populate("product")
        .lean();
    if (!foundOrder) {
        throw new Error("La compra no fue encontrada");
    }
    if (foundOrder.status === purchaseOrderStatus_enum_1.purchaseOrderStatus.APROBADO) {
        throw new Error("La compra ya fue aprobada");
    }
    if (foundOrder.status === purchaseOrderStatus_enum_1.purchaseOrderStatus.CANCELADO) {
        throw new Error("La compra esta cancelada");
    }
    if (foundDetail.length === 0) {
        throw new Error("La compra debe tener almenos un producto");
    }
    const hasSerialsInZero = foundDetail.some((detail) => detail.product.stock_type === stockType_enum_1.stockType.SERIALIZADO &&
        detail.serials !== detail.quantity);
    if (hasSerialsInZero) {
        throw new Error("Faltan agregar seriales a la compra");
    }
    const individualDetails = foundDetail.filter((detail) => detail.product.stock_type === stockType_enum_1.stockType.INDIVIDUAL);
    if (individualDetails.length > 0) {
        const inventories = await product_inventory_model_1.ProductInventory.find({
            company: companyId,
            purchase_order_detail: { $in: individualDetails.map((d) => d._id) },
        });
        const inventoryDetailIds = new Set(inventories.map((inv) => inv.purchase_order_detail?.toString()));
        const missingInventory = individualDetails.filter((detail) => !inventoryDetailIds.has(detail._id.toString()));
        if (missingInventory.length > 0) {
            throw new Error(`Faltan registros de inventario para ${missingInventory.length} producto(s) no serializados. La compra tiene datos inconsistentes y no puede aprobarse.`);
        }
    }
    await Promise.all(foundDetail.map(async (detail) => {
        await product_model_1.Product.findOneAndUpdate({ _id: detail.product._id, company: companyId }, {
            $inc: { stock: detail.quantity },
            $set: {
                last_cost_price: detail.purchase_price,
                status: productStatus_enum_1.productStatus.DISPONIBLE,
            },
        }, { new: true });
        await product_serial_model_1.ProductSerial.updateMany({
            company: companyId,
            purchase_order_detail: detail._id,
            product: detail.product._id,
        }, {
            status: productSerialStatus_enum_1.productSerialStatus.DISPONIBLE,
        });
        await product_inventory_model_1.ProductInventory.updateMany({
            company: companyId,
            purchase_order_detail: detail._id,
        }, {
            status: productInventoryStatus_enum_1.productInventoryStatus.DISPONIBLE,
            available: detail.quantity,
        });
    }));
    foundOrder.status = purchaseOrderStatus_enum_1.purchaseOrderStatus.APROBADO;
    await foundOrder.save();
    return foundOrder;
};
exports.approve = approve;
const updatePurchaseOrderDetail = async (companyId, purchaseOrderDetailId, updatePurchaseOrderInput) => {
    const findPurchaseOrderDetail = await purchase_order_detail_model_1.PurchaseOrderDetail.findOne({
        _id: purchaseOrderDetailId,
        company: companyId,
    });
    const findPurchaseOrderDetailLean = await purchase_order_detail_model_1.PurchaseOrderDetail.findOne({
        _id: purchaseOrderDetailId,
        company: companyId,
    })
        .populate("product")
        .lean();
    if (!findPurchaseOrderDetailLean) {
        throw new Error("No se encontro el detalle");
    }
    if (!findPurchaseOrderDetail) {
        throw new Error("No se encontro el detalle");
    }
    const findPurchaseOrder = await purchase_order_model_1.PurchaseOrder.findOne({
        _id: findPurchaseOrderDetail.purchase_order,
        company: companyId,
    });
    if (!findPurchaseOrder) {
        throw new Error("No se encontro la orden");
    }
    if (findPurchaseOrder.status === purchaseOrderStatus_enum_1.purchaseOrderStatus.APROBADO) {
        throw new Error("No se se puede editar el detalle porque la compra esta aprobada.");
    }
    if (updatePurchaseOrderInput.quantity < findPurchaseOrderDetail.serials) {
        throw new Error("La nueva cantidad no puede ser menor que la cantidad de seriales.");
    }
    if (findPurchaseOrderDetailLean.product.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
        await product_inventory_model_1.ProductInventory.findOneAndUpdate({ purchase_order_detail: purchaseOrderDetailId, company: companyId }, { $set: { quantity: updatePurchaseOrderInput.quantity } });
    }
    findPurchaseOrderDetail.purchase_price =
        updatePurchaseOrderInput.purchase_price;
    findPurchaseOrderDetail.quantity = updatePurchaseOrderInput.quantity;
    findPurchaseOrderDetail.subtotal = (0, money_1.round2)(updatePurchaseOrderInput.purchase_price *
        updatePurchaseOrderInput.quantity);
    await findPurchaseOrderDetail.save();
    const purchaseOrderDetails = await purchase_order_detail_model_1.PurchaseOrderDetail.find({
        company: companyId,
        purchase_order: findPurchaseOrder._id,
    });
    let newTotal = 0;
    purchaseOrderDetails.forEach((detail) => {
        newTotal += detail.subtotal;
    });
    findPurchaseOrder.total = (0, money_1.round2)(newTotal);
    await findPurchaseOrder.save();
    return findPurchaseOrderDetail;
};
exports.updatePurchaseOrderDetail = updatePurchaseOrderDetail;
const addManySerialsToOrder = async (companyId, input) => {
    const { purchase_order_detail, warehouse, serials } = input;
    if (!serials || serials.length === 0) {
        throw new Error("Debe enviar al menos un serial");
    }
    // Evitar duplicados dentro del mismo arreglo enviado desde el front
    const uniqueSerials = new Set(serials.map((s) => s.trim()));
    if (uniqueSerials.size !== serials.length) {
        throw new Error("Existen seriales repetidos en la lista enviada");
    }
    const foundPurchaseOrderDetail = await purchase_order_detail_model_1.PurchaseOrderDetail.findOne({
        _id: purchase_order_detail,
        company: companyId,
    });
    if (!foundPurchaseOrderDetail) {
        throw new Error("No existe el detalle en la compra");
    }
    const foundProduct = await product_model_1.Product.findOne({
        _id: foundPurchaseOrderDetail.product,
        company: companyId,
    });
    if (!foundProduct) {
        throw new Error("Producto no encontrado");
    }
    if (foundProduct.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
        throw new Error("No se pueden agregar seriales a este producto");
    }
    const remainingSlots = foundPurchaseOrderDetail.quantity - foundPurchaseOrderDetail.serials;
    if (remainingSlots <= 0) {
        throw new Error("El detalle ya tiene asignado todos sus seriales");
    }
    if (serials.length > remainingSlots) {
        throw new Error(`Solo puede agregar ${remainingSlots} serial(es) más para completar la cantidad de la compra`);
    }
    // Verificar que ninguno de los seriales ya exista para la compañía
    const existingSerials = await product_serial_model_1.ProductSerial.find({
        company: companyId,
        serial: { $in: Array.from(uniqueSerials) },
    }).lean();
    if (existingSerials.length > 0) {
        const existingValues = existingSerials.map((s) => s.serial).join(", ");
        throw new Error(`Los siguientes seriales ya existen: ${existingValues}`);
    }
    const createdSerials = [];
    try {
        for (const serial of uniqueSerials) {
            const newSerial = await (0, product_service_1.createProductSerial)(companyId, {
                purchase_order_detail,
                warehouse,
                product: foundPurchaseOrderDetail.product,
                serial,
            });
            createdSerials.push(newSerial);
        }
        await purchase_order_detail_model_1.PurchaseOrderDetail.updateOne({ _id: purchase_order_detail, company: companyId }, { $inc: { serials: createdSerials.length } });
        return createdSerials;
    }
    catch (error) {
        // Revertir lo creado si algo falla a mitad de camino
        if (createdSerials.length > 0) {
            await product_serial_model_1.ProductSerial.deleteMany({
                _id: { $in: createdSerials.map((s) => s._id) },
                company: companyId,
            });
        }
        throw new Error(`Error al registrar los seriales: ${error instanceof Error ? error.message : "error desconocido"}. No se guardó ningún serial de esta operación.`);
    }
};
exports.addManySerialsToOrder = addManySerialsToOrder;
