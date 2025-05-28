import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { ProductTransferInput } from "../../interfaces/productTransfer.interface";
import { ProductTransferDetailInput } from "../../interfaces/productTransferDetail.interface";
import { codeType } from "../../utils/enums/orderType.enum";
import { productInventoryStatus } from "../../utils/enums/productInventoryStatus.enum";
import { productSerialStatus } from "../../utils/enums/productSerialStatus.enum";
import { stockType } from "../../utils/enums/stockType.enum";
import { generate, increment } from "../codeGenerator/codeGenerator.service";
import { Product } from "../product/product.model";
import { ProductInventory } from "../product/product_inventory.model";
import { ProductSerial } from "../product/product_serial.model";
import { ProductTransfer } from "./product_transfer.model";
import { ProductTransferDetail } from "./product_transfer_detail.model";

export const create = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  createProductTransferInput: ProductTransferInput
) => {
  if (
    createProductTransferInput.origin_warehouse ===
    createProductTransferInput.destination_warehouse
  ) {
    throw new Error(
      "No se puede transferir productos al mismo almacén de origen."
    );
  }

  const newProductTransfer = await await ProductTransfer.create({
    company: companyId,
    code: await generate(companyId, codeType.PRODUCT_TRANSFER),
    date: createProductTransferInput.date,
    origin_warehouse: createProductTransferInput.origin_warehouse,
    destination_warehouse: createProductTransferInput.destination_warehouse,
    created_by: userId,
  });

  await increment(companyId, codeType.PRODUCT_TRANSFER);

  const populatedTransfer = await ProductTransfer.findOne({
    _id: newProductTransfer._id,
    company: companyId,
  })
    .populate("origin_warehouse")
    .populate("destination_warehouse")
    .populate("created_by");

  return populatedTransfer;
};

export const createDetail = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  createProductTransferDetailInput: ProductTransferDetailInput
) => {
  if (createProductTransferDetailInput.quantity <= 0) {
    throw new Error("La cantidad debe ser mayor a cero");
  }

  const foundProduct = await Product.findOne({
    _id: createProductTransferDetailInput.product,
    company: companyId,
  });

  if (!foundProduct) throw new Error("Producto no encontrado");

  const foundTransfer = await ProductTransfer.findOne({
    _id: createProductTransferDetailInput.product_transfer,
    company: companyId,
  });

  if (!foundTransfer) throw new Error("Transferencia no encontrada");

  const foundDetail = await ProductTransferDetail.findOne({
    company: companyId,
    product_transfer: foundTransfer._id,
    product: foundProduct._id,
  });

  if (foundDetail) throw new Error("El producto ya esta en la transferencia");

  const newDetail = await ProductTransferDetail.create({
    company: companyId,
    product_transfer: createProductTransferDetailInput.product_transfer,
    product: createProductTransferDetailInput.product,
    quantity: createProductTransferDetailInput.quantity,
    serials: [],
  });

  if (foundProduct.stock_type === stockType.INDIVIDUAL) {
    const inventories = await ProductInventory.find({
      company: companyId,
      product: foundProduct._id,
      warehouse: foundTransfer.origin_warehouse,
      available: { $gt: 0 },
    }).sort({ createdAt: 1 }); // FIFO

    const totalAvailable = inventories.reduce(
      (acc, inv) => acc + inv.available,
      0
    );

    if (totalAvailable < createProductTransferDetailInput.quantity) {
      throw new Error(
        `Stock insuficiente en el almacén origen. Disponible: ${totalAvailable}`
      );
    }

    let remaining = createProductTransferDetailInput.quantity;

    for (const inv of inventories) {
      if (remaining <= 0) break;

      const transferQty = Math.min(inv.available, remaining);
      inv.available -= transferQty;
      inv.reserved += transferQty;

      await inv.save();
      remaining -= transferQty;
    }

    // Crear nuevo ProductInventory en almacén destino en estado BORRADOR
    await ProductInventory.create({
      company: companyId,
      product: foundProduct._id,
      warehouse: foundTransfer.destination_warehouse,
      product_transfer_detail: newDetail._id,
      quantity: createProductTransferDetailInput.quantity,
      available: createProductTransferDetailInput.quantity,
      status: productInventoryStatus.BORRADOR,
    });
  } else if (foundProduct.stock_type === stockType.SERIALIZADO) {
    const availableSerials = await ProductSerial.countDocuments({
      company: companyId,
      product: foundProduct._id,
      warehouse: foundTransfer.origin_warehouse,
      status: productSerialStatus.DISPONIBLE,
    });

    if (availableSerials < createProductTransferDetailInput.quantity) {
      throw new Error(
        `Stock insuficiente en el almacén origen. Disponible: ${availableSerials}`
      );
    }
  }

  return newDetail;
};
