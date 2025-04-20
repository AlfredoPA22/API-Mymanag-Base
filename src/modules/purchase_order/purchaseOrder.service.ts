import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { IProduct } from "../../interfaces/product.interface";
import { IProductSerial } from "../../interfaces/productSerial.interface";
import {
  FilterPurchaseOrderInput,
  IPurchaseOrder,
  IPurchaseOrderByYear,
  IPurchaseOrderToPDF,
  PurchaseOrderInput,
} from "../../interfaces/purchaseOrder.interface";
import {
  AddSerialToPurchaseOrderDetailInput,
  IPurchaseOrderDetail,
  IPurchaseOrderDetailToPDF,
  PurchaseOrderDetailInput,
  UpdatePurchaseOrderDetailInput,
} from "../../interfaces/purchaseOrderDetail.interface";
import { codeType } from "../../utils/enums/orderType.enum";
import { productInventoryStatus } from "../../utils/enums/productInventoryStatus.enum";
import { productSerialStatus } from "../../utils/enums/productSerialStatus.enum";
import { productStatus } from "../../utils/enums/productStatus.enum";
import { purchaseOrderStatus } from "../../utils/enums/purchaseOrderStatus.enum";
import { stockType } from "../../utils/enums/stockType.enum";
import { generate, increment } from "../codeGenerator/codeGenerator.service";
import { Product } from "../product/product.model";
import { createProductSerial } from "../product/product.service";
import { ProductInventory } from "../product/product_inventory.model";
import { ProductSerial } from "../product/product_serial.model";
import { PurchaseOrder } from "./purchase_order.model";
import { PurchaseOrderDetail } from "./purchase_order_detail.model";
import { IUser } from "../../interfaces/user.interface";
import { User } from "../user/user.model";

export const findAll = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IPurchaseOrder[]> => {
  const foundUser: IUser | null = await User.findById(userId);

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const filter = foundUser.is_global ? {} : { created_by: userId };

  return await PurchaseOrder.find(filter)
    .sort({ date: -1 })
    .populate("provider")
    .populate("created_by")
    .lean<IPurchaseOrder[]>();
};

export const purchaseOrderReport = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  filterPurchaseOrderInput: FilterPurchaseOrderInput
): Promise<IPurchaseOrder[]> => {
  const foundUser: IUser | null = await User.findById(userId);

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const query: any = {};

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

  if (
    filterPurchaseOrderInput.status &&
    filterPurchaseOrderInput.status !== "Todos"
  ) {
    query.status = filterPurchaseOrderInput.status;
  }

  const purchaseOrders = await PurchaseOrder.find(query)
    .populate("provider")
    .lean<IPurchaseOrder[]>();

  return purchaseOrders;
};

export const findDetail = async (
  purchaseOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IPurchaseOrderDetail[]> => {
  const listDetail = await PurchaseOrderDetail.find({
    purchase_order: purchaseOrderId,
  })
    .populate("purchase_order")
    .populate({
      path: "product",
      populate: {
        path: "brand",
      },
    })
    .lean<IPurchaseOrderDetail[]>();

  return listDetail;
};

export const findPurchaseOrder = async (
  purchaseOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IPurchaseOrder> => {
  return await PurchaseOrder.findById(purchaseOrderId)
    .populate("provider")
    .lean<IPurchaseOrder>();
};

export const findPurchaseOrderToPDF = async (
  purchaseOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IPurchaseOrderToPDF> => {
  const purchaseOrder: IPurchaseOrder =
    await findPurchaseOrder(purchaseOrderId);
  const purchaseOrderDetail: IPurchaseOrderDetail[] =
    await findDetail(purchaseOrderId);

  const purchaseOrderDetailToPDF: IPurchaseOrderDetailToPDF[] =
    await Promise.all(
      purchaseOrderDetail.map(async (detail: IPurchaseOrderDetail) => {
        const productSerials: IProductSerial[] = await ProductSerial.find({
          purchase_order_detail: detail._id,
        }).lean<IProductSerial[]>();

        return {
          purchaseOrderDetail: detail,
          productSerial: productSerials,
        };
      })
    );

  const response: IPurchaseOrderToPDF = {
    purchaseOrder,
    purchaseOrderDetail: purchaseOrderDetailToPDF,
  };
  return response;
};

export const create = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  createPurchaseOrderInput: PurchaseOrderInput
) => {
  const newPurchaseOrder = await (
    await PurchaseOrder.create({
      code: await generate(codeType.PURCHASE_ORDER),
      date: createPurchaseOrderInput.date,
      provider: createPurchaseOrderInput.provider,
      created_by: userId,
    })
  ).populate("provider");

  await increment(codeType.PURCHASE_ORDER);

  return newPurchaseOrder;
};

export const createDetail = async (
  createPurchaseOrderDetailInput: PurchaseOrderDetailInput
) => {
  const foundDetail = await PurchaseOrderDetail.findOne({
    purchase_order: createPurchaseOrderDetailInput.purchase_order,
    product: createPurchaseOrderDetailInput.product,
  });

  const foundOrder = await PurchaseOrder.findOne({
    _id: createPurchaseOrderDetailInput.purchase_order,
  });

  if (foundDetail) {
    throw new Error("El producto ya existe en la compra");
  }

  if (createPurchaseOrderDetailInput.purchase_price <= 0) {
    throw new Error("Ingrese un precio mayor a 0");
  }

  if (createPurchaseOrderDetailInput.quantity <= 0) {
    throw new Error("Ingrese una cantidad mayor a 0");
  }

  const foundProduct = await Product.findById(
    createPurchaseOrderDetailInput.product
  );

  if (foundProduct.stock_type === stockType.INDIVIDUAL) {
    if (!createPurchaseOrderDetailInput.warehouse) {
      throw new Error("Seleccione un almacén de recepción");
    }
  }

  const subtotal: number =
    Math.round(
      createPurchaseOrderDetailInput.quantity *
        createPurchaseOrderDetailInput.purchase_price *
        100
    ) / 100;

  const newPurchaseOrderDetail: IPurchaseOrderDetail = await (
    await (
      await PurchaseOrderDetail.create({
        ...createPurchaseOrderDetailInput,
        subtotal,
      })
    ).populate("purchase_order")
  ).populate("product");

  const updatedTotal = parseFloat((foundOrder.total + subtotal).toFixed(2));

  await PurchaseOrder.findByIdAndUpdate(
    createPurchaseOrderDetailInput.purchase_order,
    {
      total: updatedTotal,
    },
    { new: true }
  );

  if (newPurchaseOrderDetail.product.stock_type === stockType.INDIVIDUAL) {
    await ProductInventory.create({
      product: createPurchaseOrderDetailInput.product,
      warehouse: createPurchaseOrderDetailInput.warehouse,
      purchase_order_detail: newPurchaseOrderDetail._id,
      quantity: createPurchaseOrderDetailInput.quantity,
      status: productInventoryStatus.BORRADOR,
    });
  }

  const foundPurchaseOrderDetail = await (
    await (
      await PurchaseOrderDetail.findById(newPurchaseOrderDetail._id)
    ).populate("purchase_order")
  ).populate("product");

  return foundPurchaseOrderDetail;
};

export const addSerialToOrder = async (
  addSerialToOrder: AddSerialToPurchaseOrderDetailInput
) => {
  const foundPurchaseOrderDetail = await PurchaseOrderDetail.findById(
    addSerialToOrder.purchase_order_detail
  );

  if (!foundPurchaseOrderDetail) {
    throw new Error("No existe el detalle en la compra");
  }

  const foundProduct: IProduct = await Product.findById(
    foundPurchaseOrderDetail.product
  );

  if (foundProduct.stock_type === stockType.INDIVIDUAL) {
    throw new Error("No se pueden agregar seriales a este producto");
  }

  if (foundPurchaseOrderDetail.serials >= foundPurchaseOrderDetail.quantity) {
    throw new Error("El detalle ya tiene asignado todos sus seriales");
  }

  const newProductSerial = await createProductSerial({
    purchase_order_detail: addSerialToOrder.purchase_order_detail,
    warehouse: addSerialToOrder.warehouse,
    product: foundPurchaseOrderDetail.product._id,
    serial: addSerialToOrder.serial,
  });

  await incrementSerials(addSerialToOrder.purchase_order_detail);

  return newProductSerial;
};

export const deleteSerialToOrder = async (
  productSerialId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundProductSerial = await ProductSerial.findById(productSerialId);

  if (!foundProductSerial) {
    throw new Error("Serial no fue encontrado");
  }

  if (foundProductSerial.status !== productSerialStatus.BORRADOR) {
    throw new Error("No se puede borrar el serial");
  } else if (!foundProductSerial.purchase_order_detail) {
    throw new Error("No se puede borrar el serial");
  }

  const deleteProductSerial = await ProductSerial.deleteOne({
    _id: productSerialId,
  });

  if (deleteProductSerial.deletedCount > 0) {
    await decrementSerials(foundProductSerial.purchase_order_detail._id);
    return {
      success: true,
    };
  }
  return {
    success: false,
  };
};

export const deleteProductToOrder = async (
  purchaseOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundPurchaseOrderDetail = await PurchaseOrderDetail.findById(
    purchaseOrderDetailId
  );

  if (!foundPurchaseOrderDetail) {
    throw new Error("El detalle no fue encontrado");
  }

  const foundPurchaseOrder = await PurchaseOrder.findById(
    foundPurchaseOrderDetail.purchase_order._id
  );

  if (!foundPurchaseOrder) {
    throw new Error("La orden no fue encontrada");
  }

  if (foundPurchaseOrder.status !== purchaseOrderStatus.BORRADOR) {
    throw new Error("No se puede borrar el detalle");
  }

  await ProductSerial.deleteMany({
    purchase_order_detail: purchaseOrderDetailId,
  });

  await ProductInventory.deleteOne({
    purchase_order_detail: purchaseOrderDetailId,
  });

  const deleteProductToPurchaseOrderDetail =
    await PurchaseOrderDetail.deleteOne({
      _id: purchaseOrderDetailId,
    });

  if (deleteProductToPurchaseOrderDetail.deletedCount > 0) {
    const updatedTotal = parseFloat(
      (foundPurchaseOrder.total - foundPurchaseOrderDetail.subtotal).toFixed(2)
    );

    await PurchaseOrder.updateOne(
      { _id: foundPurchaseOrder._id },
      {
        total: updatedTotal,
      }
    );
    return {
      success: true,
    };
  } else {
    return {
      success: false,
    };
  }
};

export const deletePurchaseOrder = async (
  purchaseOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundPurchaseOrder = await PurchaseOrder.findById(purchaseOrderId);

  if (!foundPurchaseOrder) {
    throw new Error("La compra no fue encontrada");
  }

  const foundPurchaseOrderDetails = await PurchaseOrderDetail.find({
    purchase_order: purchaseOrderId,
  });

  if (foundPurchaseOrder.status === purchaseOrderStatus.APROBADO) {
    const soldOrReservedSerials = await ProductSerial.find({
      purchase_order_detail: {
        $in: foundPurchaseOrderDetails.map((d) => d._id),
      },
      status: {
        $in: [productSerialStatus.VENDIDO, productSerialStatus.RESERVADO],
      },
    });

    const blockedInventory = await ProductInventory.find({
      purchase_order_detail: {
        $in: foundPurchaseOrderDetails.map((d) => d._id),
      },
      $or: [{ sold: { $gt: 0 } }, { reserved: { $gt: 0 } }],
    });

    if (soldOrReservedSerials.length > 0 || blockedInventory.length > 0) {
      throw new Error(
        "No se puede eliminar la compra porque existen productos vendidos o reservados."
      );
    }

    await Promise.all(
      foundPurchaseOrderDetails.map(async (detail) => {
        // Actualizar el stock del producto
        const productUpdate = await Product.findByIdAndUpdate(
          detail.product._id,
          {
            $inc: { stock: -detail.quantity }, // Restar la cantidad comprada al stock
          },
          { new: true }
        );

        // Si el producto estaba disponible y ahora no tiene stock, cambiar a "sin stcock"
        if (
          productUpdate.stock <= 0 &&
          productUpdate.status === productStatus.DISPONIBLE
        ) {
          await Product.findByIdAndUpdate(detail.product._id, {
            status: productStatus.SIN_STOCK,
          });
        }

        // Actualizar los seriales del producto
        await ProductSerial.deleteMany({
          purchase_order_detail: detail._id,
          product: detail.product._id,
        });

        await ProductInventory.deleteOne({
          purchase_order_detail: detail._id,
          product: detail.product._id,
        });

        // Eliminar el detalle de la orden de venta
        await PurchaseOrderDetail.deleteOne({ _id: detail._id });
      })
    );

    // Eliminar la orden de compra
    const deletePurchaseOrder = await PurchaseOrder.deleteOne({
      _id: purchaseOrderId,
    });
    if (deletePurchaseOrder.deletedCount > 0) {
      return {
        success: true,
      };
    }
  }
  // Proceso para estado "BORRADOR"
  if (foundPurchaseOrder.status === purchaseOrderStatus.BORRADOR) {
    // En estado borrador solo eliminamos los detalles de la orden y la orden de compra
    await Promise.all(
      foundPurchaseOrderDetails.map(async (detail) => {
        await ProductSerial.deleteMany({
          purchase_order_detail: detail._id,
          product: detail.product._id,
        });

        // Eliminar el detalle de la orden de compra
        await PurchaseOrderDetail.deleteOne({ _id: detail._id });
      })
    );

    // Eliminar la orden de venta
    const deletePurchaseOrder = await PurchaseOrder.deleteOne({
      _id: purchaseOrderId,
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

export const incrementSerials = async (
  purchaseOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  await PurchaseOrderDetail.updateOne(
    { _id: purchaseOrderDetailId },
    { $inc: { serials: 1 } }
  );
};

export const decrementSerials = async (
  purchaseOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  await PurchaseOrderDetail.updateOne(
    { _id: purchaseOrderDetailId },
    { $inc: { serials: -1 } }
  );
};

export const approve = async (
  purchaseOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundOrder = await PurchaseOrder.findById(purchaseOrderId);
  const foundDetail: IPurchaseOrderDetail[] = await PurchaseOrderDetail.find({
    purchase_order: purchaseOrderId,
  })
    .populate("product")
    .lean<IPurchaseOrderDetail[]>();

  if (!foundOrder) {
    throw new Error("La compra no fue encontrada");
  }

  if (foundOrder.status === purchaseOrderStatus.APROBADO) {
    throw new Error("La compra ya fue aprobada");
  }

  if (foundOrder.status === purchaseOrderStatus.CANCELADO) {
    throw new Error("La compra esta cancelada");
  }

  if (foundDetail.length === 0) {
    throw new Error("La compra debe tener almenos un producto");
  }

  const hasSerialsInZero = foundDetail.some(
    (detail: IPurchaseOrderDetail) =>
      detail.product.stock_type === stockType.SERIALIZADO &&
      detail.serials !== detail.quantity
  );

  if (hasSerialsInZero) {
    throw new Error("Faltan agregar seriales a la compra");
  }

  await Promise.all(
    foundDetail.map(async (detail) => {
      await Product.findByIdAndUpdate(
        detail.product._id,
        {
          $inc: { stock: detail.quantity },
          $set: {
            last_cost_price: detail.purchase_price,
            status: productStatus.DISPONIBLE,
          },
        },
        { new: true }
      );

      await ProductSerial.updateMany(
        {
          purchase_order_detail: detail._id,
          product: detail.product._id,
        },
        {
          status: productSerialStatus.DISPONIBLE,
        }
      );

      await ProductInventory.updateOne(
        {
          purchase_order_detail: detail._id,
          product: detail.product._id,
        },
        {
          status: productInventoryStatus.DISPONIBLE,
        }
      );
    })
  );

  foundOrder.status = purchaseOrderStatus.APROBADO;

  await foundOrder.save();

  return foundOrder;
};

export const updatePurchaseOrderDetail = async (
  purchaseOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updatePurchaseOrderInput: UpdatePurchaseOrderDetailInput
) => {
  const findPurchaseOrderDetail = await PurchaseOrderDetail.findById(
    purchaseOrderDetailId
  );

  const findPurchaseOrderDetailLean: IPurchaseOrderDetail =
    await PurchaseOrderDetail.findById(purchaseOrderDetailId)
      .populate("product")
      .lean<IPurchaseOrderDetail>();

  if (!findPurchaseOrderDetail) {
    throw new Error("No se encontro el detalle");
  }

  const findPurchaseOrder = await PurchaseOrder.findById(
    findPurchaseOrderDetail.purchase_order
  );
  if (!findPurchaseOrder) {
    throw new Error("No se encontro la orden");
  }

  if (findPurchaseOrder.status === purchaseOrderStatus.APROBADO) {
    throw new Error(
      "No se se puede editar el detalle porque la compra esta aprobada."
    );
  }

  if (updatePurchaseOrderInput.quantity < findPurchaseOrderDetail.serials) {
    throw new Error(
      "La nueva cantidad no puede ser menor que la cantidad de seriales."
    );
  }

  if (findPurchaseOrderDetailLean.product.stock_type === stockType.INDIVIDUAL) {
    await ProductInventory.findOneAndUpdate(
      { purchase_order_detail: purchaseOrderDetailId },
      { $set: { quantity: updatePurchaseOrderInput.quantity } }
    );
  }

  findPurchaseOrderDetail.purchase_price =
    updatePurchaseOrderInput.purchase_price;
  findPurchaseOrderDetail.quantity = updatePurchaseOrderInput.quantity;
  findPurchaseOrderDetail.subtotal =
    Math.round(
      updatePurchaseOrderInput.purchase_price *
        updatePurchaseOrderInput.quantity *
        100
    ) / 100;
  await findPurchaseOrderDetail.save();

  const purchaseOrderDetails = await PurchaseOrderDetail.find({
    purchase_order: findPurchaseOrder._id,
  });
  let newTotal = 0;
  purchaseOrderDetails.forEach((detail) => {
    newTotal += detail.subtotal;
  });
  findPurchaseOrder.total = parseFloat(newTotal.toFixed(2));
  await findPurchaseOrder.save();

  return findPurchaseOrderDetail;
};

export const reportPurhaseOrderByYear = async () => {
  const currentYear = new Date().getFullYear();

  const purchaseByMonth = await PurchaseOrder.aggregate([
    {
      $match: {
        status: purchaseOrderStatus.APROBADO,
        date: {
          $gte: new Date(`${currentYear}-01-01`),
          $lt: new Date(`${currentYear + 1}-01-01`),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$date" },
        total: { $sum: "$total" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  const monthsOfYear = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const report: IPurchaseOrderByYear[] = monthsOfYear.map((month, index) => {
    const sale = purchaseByMonth.find((s) => s._id === index + 1);
    return {
      month: month || "Unknown",
      total: sale ? sale.total : 0,
    };
  });

  return report;
};
