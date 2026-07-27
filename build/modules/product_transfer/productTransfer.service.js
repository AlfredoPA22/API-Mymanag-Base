"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveProductTransfer = exports.deleteProductTransfer = exports.deleteProductFromTransfer = exports.removeSerialFromTransferDetail = exports.addSerialToTransferDetail = exports.findDetail = exports.findProductTransfer = exports.findAll = exports.createDetail = exports.create = void 0;
const orderType_enum_1 = require("../../utils/enums/orderType.enum");
const productInventoryStatus_enum_1 = require("../../utils/enums/productInventoryStatus.enum");
const productSerialStatus_enum_1 = require("../../utils/enums/productSerialStatus.enum");
const productTransferStatus_enum_1 = require("../../utils/enums/productTransferStatus.enum");
const stockType_enum_1 = require("../../utils/enums/stockType.enum");
const codeGenerator_service_1 = require("../codeGenerator/codeGenerator.service");
const product_model_1 = require("../product/product.model");
const product_inventory_model_1 = require("../product/product_inventory.model");
const product_serial_model_1 = require("../product/product_serial.model");
const user_model_1 = require("../user/user.model");
const product_transfer_model_1 = require("./product_transfer.model");
const product_transfer_detail_model_1 = require("./product_transfer_detail.model");
const create = async (companyId, userId, createProductTransferInput) => {
    if (createProductTransferInput.origin_warehouse ===
        createProductTransferInput.destination_warehouse) {
        throw new Error("No se puede transferir productos al mismo almacén de origen.");
    }
    const newProductTransfer = await product_transfer_model_1.ProductTransfer.create({
        company: companyId,
        code: await (0, codeGenerator_service_1.generate)(companyId, orderType_enum_1.codeType.PRODUCT_TRANSFER),
        date: createProductTransferInput.date,
        origin_warehouse: createProductTransferInput.origin_warehouse,
        destination_warehouse: createProductTransferInput.destination_warehouse,
        created_by: userId,
    });
    await (0, codeGenerator_service_1.increment)(companyId, orderType_enum_1.codeType.PRODUCT_TRANSFER);
    const populatedTransfer = await product_transfer_model_1.ProductTransfer.findOne({
        _id: newProductTransfer._id,
        company: companyId,
    })
        .populate("origin_warehouse")
        .populate("destination_warehouse")
        .populate("created_by");
    return populatedTransfer;
};
exports.create = create;
const createDetail = async (companyId, createProductTransferDetailInput) => {
    if (createProductTransferDetailInput.quantity <= 0) {
        throw new Error("La cantidad debe ser mayor a cero");
    }
    const foundProduct = await product_model_1.Product.findOne({
        _id: createProductTransferDetailInput.product,
        company: companyId,
    });
    if (!foundProduct)
        throw new Error("Producto no encontrado");
    const foundTransfer = await product_transfer_model_1.ProductTransfer.findOne({
        _id: createProductTransferDetailInput.product_transfer,
        company: companyId,
    });
    if (!foundTransfer)
        throw new Error("Transferencia no encontrada");
    const foundDetail = await product_transfer_detail_model_1.ProductTransferDetail.findOne({
        company: companyId,
        product_transfer: foundTransfer._id,
        product: foundProduct._id,
    });
    if (foundDetail)
        throw new Error("El producto ya esta en la transferencia");
    const newDetail = await product_transfer_detail_model_1.ProductTransferDetail.create({
        company: companyId,
        product_transfer: createProductTransferDetailInput.product_transfer,
        product: createProductTransferDetailInput.product,
        quantity: createProductTransferDetailInput.quantity,
        serials: [],
    });
    if (foundProduct.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
        const inventories = await product_inventory_model_1.ProductInventory.find({
            company: companyId,
            product: foundProduct._id,
            warehouse: foundTransfer.origin_warehouse,
            available: { $gt: 0 },
        }).sort({ createdAt: 1 }); // FIFO
        const totalAvailable = inventories.reduce((acc, inv) => acc + inv.available, 0);
        if (totalAvailable < createProductTransferDetailInput.quantity) {
            await product_transfer_detail_model_1.ProductTransferDetail.deleteOne({ _id: newDetail._id, company: companyId });
            throw new Error(`Stock insuficiente en el almacén origen. Disponible: ${totalAvailable}`);
        }
        let remaining = createProductTransferDetailInput.quantity;
        const modifiedInventories = [];
        const inventoryUsage = [];
        for (const inv of inventories) {
            if (remaining <= 0)
                break;
            const transferQty = Math.min(inv.available, remaining);
            inv.available -= transferQty;
            inv.reserved += transferQty;
            await inv.save();
            modifiedInventories.push({ inv, qty: transferQty });
            inventoryUsage.push({
                purchase_order_detail: inv.purchase_order_detail ?? null,
                quantity: transferQty,
            });
            remaining -= transferQty;
        }
        // Crear nuevo ProductInventory en almacén destino en estado BORRADOR
        try {
            await product_inventory_model_1.ProductInventory.create({
                company: companyId,
                product: foundProduct._id,
                warehouse: foundTransfer.destination_warehouse,
                product_transfer_detail: newDetail._id,
                quantity: createProductTransferDetailInput.quantity,
                available: createProductTransferDetailInput.quantity,
                status: productInventoryStatus_enum_1.productInventoryStatus.BORRADOR,
            });
        }
        catch (inventoryError) {
            for (const { inv, qty } of modifiedInventories) {
                inv.available += qty;
                inv.reserved -= qty;
                await inv.save();
            }
            await product_transfer_detail_model_1.ProductTransferDetail.deleteOne({ _id: newDetail._id, company: companyId });
            throw new Error("Error al crear el inventario de destino. Se revirtieron los cambios.");
        }
        // Guardar inventory_usage para poder revertir exactamente los mismos batches después
        await product_transfer_detail_model_1.ProductTransferDetail.updateOne({ _id: newDetail._id, company: companyId }, { $set: { inventory_usage: inventoryUsage } });
    }
    else if (foundProduct.stock_type === stockType_enum_1.stockType.SERIALIZADO) {
        const availableSerials = await product_serial_model_1.ProductSerial.countDocuments({
            company: companyId,
            product: foundProduct._id,
            warehouse: foundTransfer.origin_warehouse,
            status: productSerialStatus_enum_1.productSerialStatus.DISPONIBLE,
        });
        if (availableSerials < createProductTransferDetailInput.quantity) {
            await product_transfer_detail_model_1.ProductTransferDetail.deleteOne({ _id: newDetail._id, company: companyId });
            throw new Error(`Stock insuficiente en el almacén origen. Disponible: ${availableSerials}`);
        }
    }
    return await product_transfer_detail_model_1.ProductTransferDetail.findById(newDetail._id)
        .populate({
        path: "product_transfer",
        populate: [
            { path: "origin_warehouse" },
            { path: "destination_warehouse" },
            { path: "created_by" },
        ],
    })
        .populate("product")
        .lean();
};
exports.createDetail = createDetail;
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
    return await product_transfer_model_1.ProductTransfer.find(filter)
        .sort({ date: -1 })
        .populate("origin_warehouse")
        .populate("destination_warehouse")
        .populate("created_by")
        .lean();
};
exports.findAll = findAll;
const findProductTransfer = async (companyId, transferId) => {
    const transfer = await product_transfer_model_1.ProductTransfer.findOne({
        _id: transferId,
        company: companyId,
    })
        .populate("origin_warehouse")
        .populate("destination_warehouse")
        .populate("created_by")
        .lean();
    if (!transfer) {
        throw new Error("Transferencia no encontrada");
    }
    return transfer;
};
exports.findProductTransfer = findProductTransfer;
const findDetail = async (companyId, transferId) => {
    return await product_transfer_detail_model_1.ProductTransferDetail.find({
        company: companyId,
        product_transfer: transferId,
    })
        .populate({
        path: "product_transfer",
        populate: [
            { path: "origin_warehouse" },
            { path: "destination_warehouse" },
            { path: "created_by" },
        ],
    })
        .populate("product")
        .lean();
};
exports.findDetail = findDetail;
const addSerialToTransferDetail = async (companyId, input) => {
    const foundDetail = await product_transfer_detail_model_1.ProductTransferDetail.findOne({
        _id: input.product_transfer_detail,
        company: companyId,
    });
    if (!foundDetail) {
        throw new Error("Detalle de transferencia no encontrado");
    }
    const foundTransfer = await product_transfer_model_1.ProductTransfer.findOne({
        _id: foundDetail.product_transfer,
        company: companyId,
    });
    if (!foundTransfer) {
        throw new Error("Transferencia no encontrada");
    }
    if (foundTransfer.status !== productTransferStatus_enum_1.productTransferStatus.BORRADOR) {
        throw new Error("Solo se pueden agregar seriales a transferencias en borrador");
    }
    const foundProduct = await product_model_1.Product.findOne({
        _id: foundDetail.product,
        company: companyId,
    });
    if (!foundProduct || foundProduct.stock_type !== stockType_enum_1.stockType.SERIALIZADO) {
        throw new Error("El producto no es de tipo serializado");
    }
    if (foundDetail.serials.length >= foundDetail.quantity) {
        throw new Error("El detalle ya tiene todos sus seriales asignados");
    }
    if (foundDetail.serials.includes(input.serial)) {
        throw new Error("El serial ya fue agregado a esta transferencia");
    }
    const foundSerial = await product_serial_model_1.ProductSerial.findOne({
        company: companyId,
        product: foundDetail.product,
        warehouse: foundTransfer.origin_warehouse,
        serial: input.serial,
        status: productSerialStatus_enum_1.productSerialStatus.DISPONIBLE,
    });
    if (!foundSerial) {
        throw new Error("Serial no encontrado o no disponible en el almacén origen");
    }
    foundSerial.status = productSerialStatus_enum_1.productSerialStatus.RESERVADO;
    await foundSerial.save();
    try {
        await product_transfer_detail_model_1.ProductTransferDetail.updateOne({ _id: foundDetail._id, company: companyId }, { $push: { serials: input.serial } });
    }
    catch (updateError) {
        foundSerial.status = productSerialStatus_enum_1.productSerialStatus.DISPONIBLE;
        await foundSerial.save();
        throw new Error("Error al agregar el serial a la transferencia. Se revirtió el estado del serial.");
    }
    return foundSerial;
};
exports.addSerialToTransferDetail = addSerialToTransferDetail;
const removeSerialFromTransferDetail = async (companyId, transferDetailId, serial) => {
    const foundDetail = await product_transfer_detail_model_1.ProductTransferDetail.findOne({
        _id: transferDetailId,
        company: companyId,
    });
    if (!foundDetail) {
        throw new Error("Detalle de transferencia no encontrado");
    }
    const foundTransfer = await product_transfer_model_1.ProductTransfer.findOne({
        _id: foundDetail.product_transfer,
        company: companyId,
    });
    if (!foundTransfer || foundTransfer.status !== productTransferStatus_enum_1.productTransferStatus.BORRADOR) {
        throw new Error("Solo se pueden quitar seriales de transferencias en borrador");
    }
    if (!foundDetail.serials.includes(serial)) {
        throw new Error("El serial no pertenece a este detalle");
    }
    const foundSerial = await product_serial_model_1.ProductSerial.findOne({
        company: companyId,
        product: foundDetail.product,
        serial,
        status: productSerialStatus_enum_1.productSerialStatus.RESERVADO,
    });
    if (!foundSerial) {
        throw new Error("Serial no encontrado");
    }
    foundSerial.status = productSerialStatus_enum_1.productSerialStatus.DISPONIBLE;
    await foundSerial.save();
    try {
        await product_transfer_detail_model_1.ProductTransferDetail.updateOne({ _id: foundDetail._id, company: companyId }, { $pull: { serials: serial } });
    }
    catch (updateError) {
        foundSerial.status = productSerialStatus_enum_1.productSerialStatus.RESERVADO;
        await foundSerial.save();
        throw new Error("Error al quitar el serial de la transferencia. Se revirtió el estado del serial.");
    }
    return { success: true };
};
exports.removeSerialFromTransferDetail = removeSerialFromTransferDetail;
const restoreDetailStock = async (companyId, detail, originWarehouse) => {
    const foundProduct = await product_model_1.Product.findOne({
        _id: detail.product,
        company: companyId,
    });
    if (!foundProduct)
        return;
    if (foundProduct.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
        await product_inventory_model_1.ProductInventory.deleteOne({
            company: companyId,
            product_transfer_detail: detail._id,
        });
        // Usar inventory_usage para restaurar exactamente los batches reservados
        if (detail.inventory_usage && detail.inventory_usage.length > 0) {
            for (const usage of detail.inventory_usage) {
                const inv = await product_inventory_model_1.ProductInventory.findOne({
                    company: companyId,
                    product: foundProduct._id,
                    warehouse: originWarehouse,
                    purchase_order_detail: usage.purchase_order_detail ?? null,
                });
                if (inv) {
                    inv.reserved -= usage.quantity;
                    if (inv.reserved < 0)
                        inv.reserved = 0;
                    inv.available += usage.quantity;
                    await inv.save();
                }
            }
        }
        else {
            // Fallback para registros sin inventory_usage (datos previos al fix)
            let remaining = detail.quantity;
            const originInventories = await product_inventory_model_1.ProductInventory.find({
                company: companyId,
                product: foundProduct._id,
                warehouse: originWarehouse,
                reserved: { $gt: 0 },
            }).sort({ createdAt: 1 });
            for (const inv of originInventories) {
                if (remaining <= 0)
                    break;
                const restoreQty = Math.min(inv.reserved, remaining);
                inv.reserved -= restoreQty;
                inv.available += restoreQty;
                await inv.save();
                remaining -= restoreQty;
            }
        }
    }
    else if (foundProduct.stock_type === stockType_enum_1.stockType.SERIALIZADO) {
        if (detail.serials && detail.serials.length > 0) {
            await product_serial_model_1.ProductSerial.updateMany({
                company: companyId,
                product: foundProduct._id,
                serial: { $in: detail.serials },
                status: productSerialStatus_enum_1.productSerialStatus.RESERVADO,
            }, { status: productSerialStatus_enum_1.productSerialStatus.DISPONIBLE });
        }
    }
};
const deleteProductFromTransfer = async (companyId, transferDetailId) => {
    const foundDetail = await product_transfer_detail_model_1.ProductTransferDetail.findOne({
        _id: transferDetailId,
        company: companyId,
    });
    if (!foundDetail) {
        throw new Error("Detalle de transferencia no encontrado");
    }
    const foundTransfer = await product_transfer_model_1.ProductTransfer.findOne({
        _id: foundDetail.product_transfer,
        company: companyId,
    });
    if (!foundTransfer) {
        throw new Error("Transferencia no encontrada");
    }
    if (foundTransfer.status !== productTransferStatus_enum_1.productTransferStatus.BORRADOR) {
        throw new Error("No se puede modificar una transferencia aprobada");
    }
    await restoreDetailStock(companyId, foundDetail, foundTransfer.origin_warehouse);
    const deleted = await product_transfer_detail_model_1.ProductTransferDetail.deleteOne({
        _id: transferDetailId,
        company: companyId,
    });
    return { success: deleted.deletedCount > 0 };
};
exports.deleteProductFromTransfer = deleteProductFromTransfer;
const deleteProductTransfer = async (companyId, transferId) => {
    const foundTransfer = await product_transfer_model_1.ProductTransfer.findOne({
        _id: transferId,
        company: companyId,
    });
    if (!foundTransfer) {
        throw new Error("Transferencia no encontrada");
    }
    if (foundTransfer.status !== productTransferStatus_enum_1.productTransferStatus.BORRADOR) {
        throw new Error("Solo se pueden eliminar transferencias en borrador");
    }
    const details = await product_transfer_detail_model_1.ProductTransferDetail.find({
        company: companyId,
        product_transfer: transferId,
    });
    for (const detail of details) {
        await restoreDetailStock(companyId, detail, foundTransfer.origin_warehouse);
    }
    await product_transfer_detail_model_1.ProductTransferDetail.deleteMany({
        company: companyId,
        product_transfer: transferId,
    });
    const deleted = await product_transfer_model_1.ProductTransfer.deleteOne({
        _id: transferId,
        company: companyId,
    });
    return { success: deleted.deletedCount > 0 };
};
exports.deleteProductTransfer = deleteProductTransfer;
const approveProductTransfer = async (companyId, transferId) => {
    const foundTransfer = await product_transfer_model_1.ProductTransfer.findOne({
        _id: transferId,
        company: companyId,
    });
    if (!foundTransfer) {
        throw new Error("Transferencia no encontrada");
    }
    if (foundTransfer.status === productTransferStatus_enum_1.productTransferStatus.APROBADO) {
        throw new Error("La transferencia ya fue aprobada");
    }
    const details = await product_transfer_detail_model_1.ProductTransferDetail.find({
        company: companyId,
        product_transfer: transferId,
    }).populate("product");
    if (details.length === 0) {
        throw new Error("La transferencia debe tener al menos un producto");
    }
    const missingSerials = details.some((detail) => detail.product.stock_type === stockType_enum_1.stockType.SERIALIZADO &&
        detail.serials.length !== detail.quantity);
    if (missingSerials) {
        throw new Error("Faltan asignar seriales a uno o más productos de la transferencia");
    }
    for (const detail of details) {
        if (detail.product.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
            // Usar inventory_usage para mover exactamente los batches reservados a transferred
            if (detail.inventory_usage && detail.inventory_usage.length > 0) {
                for (const usage of detail.inventory_usage) {
                    const inv = await product_inventory_model_1.ProductInventory.findOne({
                        company: companyId,
                        product: detail.product._id,
                        warehouse: foundTransfer.origin_warehouse,
                        purchase_order_detail: usage.purchase_order_detail ?? null,
                    });
                    if (inv) {
                        inv.reserved -= usage.quantity;
                        if (inv.reserved < 0)
                            inv.reserved = 0;
                        inv.transferred += usage.quantity;
                        await inv.save();
                    }
                }
            }
            else {
                // Fallback para registros sin inventory_usage (datos previos al fix)
                let remaining = detail.quantity;
                const originInventories = await product_inventory_model_1.ProductInventory.find({
                    company: companyId,
                    product: detail.product._id,
                    warehouse: foundTransfer.origin_warehouse,
                    reserved: { $gt: 0 },
                }).sort({ createdAt: 1 });
                for (const inv of originInventories) {
                    if (remaining <= 0)
                        break;
                    const moveQty = Math.min(inv.reserved, remaining);
                    inv.reserved -= moveQty;
                    inv.transferred += moveQty;
                    await inv.save();
                    remaining -= moveQty;
                }
            }
            await product_inventory_model_1.ProductInventory.updateOne({
                company: companyId,
                product_transfer_detail: detail._id,
            }, {
                status: productInventoryStatus_enum_1.productInventoryStatus.DISPONIBLE,
            });
        }
        else if (detail.product.stock_type === stockType_enum_1.stockType.SERIALIZADO) {
            await product_serial_model_1.ProductSerial.updateMany({
                company: companyId,
                product: detail.product._id,
                serial: { $in: detail.serials },
                status: productSerialStatus_enum_1.productSerialStatus.RESERVADO,
            }, {
                warehouse: foundTransfer.destination_warehouse,
                status: productSerialStatus_enum_1.productSerialStatus.DISPONIBLE,
            });
        }
    }
    foundTransfer.status = productTransferStatus_enum_1.productTransferStatus.APROBADO;
    await foundTransfer.save();
    return await product_transfer_model_1.ProductTransfer.findById(foundTransfer._id)
        .populate("origin_warehouse")
        .populate("destination_warehouse")
        .populate("created_by")
        .lean();
};
exports.approveProductTransfer = approveProductTransfer;
