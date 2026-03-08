import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import {
  IProductTransfer,
  ProductTransferInput,
} from "../../interfaces/productTransfer.interface";
import {
  AddSerialToTransferDetailInput,
  IProductTransferDetail,
  ProductTransferDetailInput,
} from "../../interfaces/productTransferDetail.interface";
import { IUser } from "../../interfaces/user.interface";
import { codeType } from "../../utils/enums/orderType.enum";
import { productInventoryStatus } from "../../utils/enums/productInventoryStatus.enum";
import { productSerialStatus } from "../../utils/enums/productSerialStatus.enum";
import { productTransferStatus } from "../../utils/enums/productTransferStatus.enum";
import { stockType } from "../../utils/enums/stockType.enum";
import { generate, increment } from "../codeGenerator/codeGenerator.service";
import { Product } from "../product/product.model";
import { ProductInventory } from "../product/product_inventory.model";
import { ProductSerial } from "../product/product_serial.model";
import { User } from "../user/user.model";
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

  return await ProductTransferDetail.findById(newDetail._id)
    .populate({
      path: "product_transfer",
      populate: [
        { path: "origin_warehouse" },
        { path: "destination_warehouse" },
        { path: "created_by" },
      ],
    })
    .populate("product")
    .lean<IProductTransferDetail>();
};

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProductTransfer[]> => {
  const foundUser: IUser | null = await User.findOne({
    _id: userId,
    company: companyId,
  });

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const filter = foundUser.is_global
    ? { company: companyId }
    : { company: companyId, created_by: userId };

  return await ProductTransfer.find(filter)
    .sort({ date: -1 })
    .populate("origin_warehouse")
    .populate("destination_warehouse")
    .populate("created_by")
    .lean<IProductTransfer[]>();
};

export const findProductTransfer = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  transferId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProductTransfer> => {
  const transfer = await ProductTransfer.findOne({
    _id: transferId,
    company: companyId,
  })
    .populate("origin_warehouse")
    .populate("destination_warehouse")
    .populate("created_by")
    .lean<IProductTransfer | null>();

  if (!transfer) {
    throw new Error("Transferencia no encontrada");
  }

  return transfer;
};

export const findDetail = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  transferId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProductTransferDetail[]> => {
  return await ProductTransferDetail.find({
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
    .lean<IProductTransferDetail[]>();
};

export const addSerialToTransferDetail = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  input: AddSerialToTransferDetailInput
) => {
  const foundDetail = await ProductTransferDetail.findOne({
    _id: input.product_transfer_detail,
    company: companyId,
  });

  if (!foundDetail) {
    throw new Error("Detalle de transferencia no encontrado");
  }

  const foundTransfer = await ProductTransfer.findOne({
    _id: foundDetail.product_transfer,
    company: companyId,
  });

  if (!foundTransfer) {
    throw new Error("Transferencia no encontrada");
  }

  if (foundTransfer.status !== productTransferStatus.BORRADOR) {
    throw new Error("Solo se pueden agregar seriales a transferencias en borrador");
  }

  const foundProduct = await Product.findOne({
    _id: foundDetail.product,
    company: companyId,
  });

  if (!foundProduct || foundProduct.stock_type !== stockType.SERIALIZADO) {
    throw new Error("El producto no es de tipo serializado");
  }

  if (foundDetail.serials.length >= foundDetail.quantity) {
    throw new Error("El detalle ya tiene todos sus seriales asignados");
  }

  if (foundDetail.serials.includes(input.serial)) {
    throw new Error("El serial ya fue agregado a esta transferencia");
  }

  const foundSerial = await ProductSerial.findOne({
    company: companyId,
    product: foundDetail.product,
    warehouse: foundTransfer.origin_warehouse,
    serial: input.serial,
    status: productSerialStatus.DISPONIBLE,
  });

  if (!foundSerial) {
    throw new Error(
      "Serial no encontrado o no disponible en el almacén origen"
    );
  }

  foundSerial.status = productSerialStatus.RESERVADO;
  await foundSerial.save();

  await ProductTransferDetail.updateOne(
    { _id: foundDetail._id, company: companyId },
    { $push: { serials: input.serial } }
  );

  return foundSerial;
};

export const removeSerialFromTransferDetail = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  transferDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  serial: string
) => {
  const foundDetail = await ProductTransferDetail.findOne({
    _id: transferDetailId,
    company: companyId,
  });

  if (!foundDetail) {
    throw new Error("Detalle de transferencia no encontrado");
  }

  const foundTransfer = await ProductTransfer.findOne({
    _id: foundDetail.product_transfer,
    company: companyId,
  });

  if (!foundTransfer || foundTransfer.status !== productTransferStatus.BORRADOR) {
    throw new Error("Solo se pueden quitar seriales de transferencias en borrador");
  }

  if (!foundDetail.serials.includes(serial)) {
    throw new Error("El serial no pertenece a este detalle");
  }

  const foundSerial = await ProductSerial.findOne({
    company: companyId,
    product: foundDetail.product,
    serial,
    status: productSerialStatus.RESERVADO,
  });

  if (!foundSerial) {
    throw new Error("Serial no encontrado");
  }

  foundSerial.status = productSerialStatus.DISPONIBLE;
  await foundSerial.save();

  await ProductTransferDetail.updateOne(
    { _id: foundDetail._id, company: companyId },
    { $pull: { serials: serial } }
  );

  return { success: true };
};

const restoreDetailStock = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  detail: any,
  originWarehouse: any
) => {
  const foundProduct = await Product.findOne({
    _id: detail.product,
    company: companyId,
  });

  if (!foundProduct) return;

  if (foundProduct.stock_type === stockType.INDIVIDUAL) {
    await ProductInventory.deleteOne({
      company: companyId,
      product_transfer_detail: detail._id,
    });

    let remaining = detail.quantity;
    const originInventories = await ProductInventory.find({
      company: companyId,
      product: foundProduct._id,
      warehouse: originWarehouse,
      reserved: { $gt: 0 },
    }).sort({ createdAt: 1 });

    for (const inv of originInventories) {
      if (remaining <= 0) break;
      const restoreQty = Math.min(inv.reserved, remaining);
      inv.reserved -= restoreQty;
      inv.available += restoreQty;
      await inv.save();
      remaining -= restoreQty;
    }
  } else if (foundProduct.stock_type === stockType.SERIALIZADO) {
    if (detail.serials && detail.serials.length > 0) {
      await ProductSerial.updateMany(
        {
          company: companyId,
          product: foundProduct._id,
          serial: { $in: detail.serials },
          status: productSerialStatus.RESERVADO,
        },
        { status: productSerialStatus.DISPONIBLE }
      );
    }
  }
};

export const deleteProductFromTransfer = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  transferDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundDetail = await ProductTransferDetail.findOne({
    _id: transferDetailId,
    company: companyId,
  });

  if (!foundDetail) {
    throw new Error("Detalle de transferencia no encontrado");
  }

  const foundTransfer = await ProductTransfer.findOne({
    _id: foundDetail.product_transfer,
    company: companyId,
  });

  if (!foundTransfer) {
    throw new Error("Transferencia no encontrada");
  }

  if (foundTransfer.status !== productTransferStatus.BORRADOR) {
    throw new Error("No se puede modificar una transferencia aprobada");
  }

  await restoreDetailStock(
    companyId,
    foundDetail,
    foundTransfer.origin_warehouse
  );

  const deleted = await ProductTransferDetail.deleteOne({
    _id: transferDetailId,
    company: companyId,
  });

  return { success: deleted.deletedCount > 0 };
};

export const deleteProductTransfer = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  transferId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundTransfer = await ProductTransfer.findOne({
    _id: transferId,
    company: companyId,
  });

  if (!foundTransfer) {
    throw new Error("Transferencia no encontrada");
  }

  if (foundTransfer.status !== productTransferStatus.BORRADOR) {
    throw new Error("Solo se pueden eliminar transferencias en borrador");
  }

  const details = await ProductTransferDetail.find({
    company: companyId,
    product_transfer: transferId,
  });

  for (const detail of details) {
    await restoreDetailStock(
      companyId,
      detail,
      foundTransfer.origin_warehouse
    );
  }

  await ProductTransferDetail.deleteMany({
    company: companyId,
    product_transfer: transferId,
  });

  const deleted = await ProductTransfer.deleteOne({
    _id: transferId,
    company: companyId,
  });

  return { success: deleted.deletedCount > 0 };
};

export const approveProductTransfer = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  transferId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProductTransfer> => {
  const foundTransfer = await ProductTransfer.findOne({
    _id: transferId,
    company: companyId,
  });

  if (!foundTransfer) {
    throw new Error("Transferencia no encontrada");
  }

  if (foundTransfer.status === productTransferStatus.APROBADO) {
    throw new Error("La transferencia ya fue aprobada");
  }

  const details = await ProductTransferDetail.find({
    company: companyId,
    product_transfer: transferId,
  }).populate("product");

  if (details.length === 0) {
    throw new Error("La transferencia debe tener al menos un producto");
  }

  const missingSerials = details.some(
    (detail: any) =>
      detail.product.stock_type === stockType.SERIALIZADO &&
      detail.serials.length !== detail.quantity
  );

  if (missingSerials) {
    throw new Error(
      "Faltan asignar seriales a uno o más productos de la transferencia"
    );
  }

  for (const detail of details as any[]) {
    if (detail.product.stock_type === stockType.INDIVIDUAL) {
      let remaining = detail.quantity;
      const originInventories = await ProductInventory.find({
        company: companyId,
        product: detail.product._id,
        warehouse: foundTransfer.origin_warehouse,
        reserved: { $gt: 0 },
      }).sort({ createdAt: 1 });

      for (const inv of originInventories) {
        if (remaining <= 0) break;
        const moveQty = Math.min(inv.reserved, remaining);
        inv.reserved -= moveQty;
        inv.transferred += moveQty;
        await inv.save();
        remaining -= moveQty;
      }

      await ProductInventory.updateOne(
        {
          company: companyId,
          product_transfer_detail: detail._id,
        },
        {
          status: productInventoryStatus.DISPONIBLE,
        }
      );
    } else if (detail.product.stock_type === stockType.SERIALIZADO) {
      await ProductSerial.updateMany(
        {
          company: companyId,
          product: detail.product._id,
          serial: { $in: detail.serials },
          status: productSerialStatus.RESERVADO,
        },
        {
          warehouse: foundTransfer.destination_warehouse,
          status: productSerialStatus.DISPONIBLE,
        }
      );
    }
  }

  foundTransfer.status = productTransferStatus.APROBADO;
  await foundTransfer.save();

  return await ProductTransfer.findById(foundTransfer._id)
    .populate("origin_warehouse")
    .populate("destination_warehouse")
    .populate("created_by")
    .lean<IProductTransfer>() as IProductTransfer;
};
