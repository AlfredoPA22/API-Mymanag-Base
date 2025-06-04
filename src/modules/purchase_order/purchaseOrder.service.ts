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
import { IUser } from "../../interfaces/user.interface";
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
import { User } from "../user/user.model";
import { PurchaseOrder } from "./purchase_order.model";
import { PurchaseOrderDetail } from "./purchase_order_detail.model";
import { Company } from "../company/company.model";
import { companyPlanLimits } from "../../utils/planLimits";
import { companyPlan } from "../../utils/enums/companyPlan.enum";
import dayjs from "dayjs";

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IPurchaseOrder[]> => {
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

  return await PurchaseOrder.find(filter)
    .sort({ date: -1 })
    .populate("provider")
    .populate("created_by")
    .populate("company")
    .lean<IPurchaseOrder[]>();
};

export const purchaseOrderReport = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  filterPurchaseOrderInput: FilterPurchaseOrderInput
): Promise<IPurchaseOrder[]> => {
  const foundUser: IUser | null = await User.findOne({
    _id: userId,
    company: companyId,
  });

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const query: any = { company: companyId };

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
    .populate("company")
    .lean<IPurchaseOrder[]>();

  return purchaseOrders;
};

export const findDetail = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  purchaseOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IPurchaseOrderDetail[]> => {
  const listDetail = await PurchaseOrderDetail.find({
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
    .lean<IPurchaseOrderDetail[]>();

  return listDetail;
};

export const findPurchaseOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  purchaseOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IPurchaseOrder> => {
  const purchaseOrder = await PurchaseOrder.findOne({
    _id: purchaseOrderId,
    company: companyId,
  })
    .populate("provider")
    .populate("company")
    .lean<IPurchaseOrder | null>();

  if (!purchaseOrder) {
    throw new Error("Orden de compra no encontrada");
  }

  return purchaseOrder;
};

export const findPurchaseOrderToPDF = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  purchaseOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IPurchaseOrderToPDF> => {
  const purchaseOrder: IPurchaseOrder = await findPurchaseOrder(
    companyId,
    purchaseOrderId
  );
  const purchaseOrderDetail: IPurchaseOrderDetail[] = await findDetail(
    companyId,
    purchaseOrderId
  );

  const purchaseOrderDetailToPDF: IPurchaseOrderDetailToPDF[] =
    await Promise.all(
      purchaseOrderDetail.map(async (detail: IPurchaseOrderDetail) => {
        const productSerials: IProductSerial[] = await ProductSerial.find({
          company: companyId,
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
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  createPurchaseOrderInput: PurchaseOrderInput
) => {
  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const inputDate = dayjs(createPurchaseOrderInput.date);
  const startOfMonth = inputDate.startOf("month").toDate();
  const endOfMonth = inputDate.endOf("month").toDate();

  const purchaseOrderCount = await PurchaseOrder.countDocuments({
    company: companyId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  });

  const planLimits = companyPlanLimits[company.plan as companyPlan];

  if (
    planLimits.maxPurchaseOrder &&
    purchaseOrderCount >= planLimits.maxPurchaseOrder
  ) {
    throw new Error(
      `Tu plan actual (${company.plan}) solo permite hasta ${planLimits.maxPurchaseOrder} órdenes de compra por mes}`
    );
  }

  const newPurchaseOrder = await (
    await PurchaseOrder.create({
      company: companyId,
      code: await generate(companyId, codeType.PURCHASE_ORDER),
      date: createPurchaseOrderInput.date,
      provider: createPurchaseOrderInput.provider,
      created_by: userId,
    })
  ).populate("provider");

  await increment(companyId, codeType.PURCHASE_ORDER);

  return newPurchaseOrder;
};

export const createDetail = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  createPurchaseOrderDetailInput: PurchaseOrderDetailInput
) => {
  const foundDetail = await PurchaseOrderDetail.findOne({
    company: companyId,
    purchase_order: createPurchaseOrderDetailInput.purchase_order,
    product: createPurchaseOrderDetailInput.product,
  });

  const foundOrder = await PurchaseOrder.findOne({
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

  const foundProduct = await Product.findOne({
    _id: createPurchaseOrderDetailInput.product,
    company: companyId,
  });

  if (!foundProduct) {
    throw new Error("Producto no encontrado");
  }

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
        company: companyId,
        ...createPurchaseOrderDetailInput,
        subtotal,
      })
    ).populate("purchase_order")
  ).populate("product");

  const updatedTotal = parseFloat((foundOrder.total + subtotal).toFixed(2));

  await PurchaseOrder.findOneAndUpdate(
    { _id: createPurchaseOrderDetailInput.purchase_order, company: companyId },
    {
      total: updatedTotal,
    },
    { new: true }
  );

  if (newPurchaseOrderDetail.product.stock_type === stockType.INDIVIDUAL) {
    await ProductInventory.create({
      company: companyId,
      product: createPurchaseOrderDetailInput.product,
      warehouse: createPurchaseOrderDetailInput.warehouse,
      purchase_order_detail: newPurchaseOrderDetail._id,
      quantity: createPurchaseOrderDetailInput.quantity,
      status: productInventoryStatus.BORRADOR,
    });
  }

  const foundPurchaseOrderDetail = await PurchaseOrderDetail.findOne({
    _id: newPurchaseOrderDetail._id,
    company: companyId,
  })
    .populate("purchase_order")
    .populate("product")
    .lean<IPurchaseOrderDetail | null>();

  if (!foundPurchaseOrderDetail) {
    throw new Error("Detalle de orden no encontrado después de crear");
  }

  return foundPurchaseOrderDetail;
};

export const addSerialToOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  addSerialToOrder: AddSerialToPurchaseOrderDetailInput
) => {
  const foundPurchaseOrderDetail = await PurchaseOrderDetail.findOne({
    _id: addSerialToOrder.purchase_order_detail,
    company: companyId,
  });

  if (!foundPurchaseOrderDetail) {
    throw new Error("No existe el detalle en la compra");
  }

  const foundProduct = await Product.findOne({
    _id: foundPurchaseOrderDetail.product,
    company: companyId,
  });

  if (!foundProduct) {
    throw new Error("Producto no encontrado");
  }

  if (foundProduct.stock_type === stockType.INDIVIDUAL) {
    throw new Error("No se pueden agregar seriales a este producto");
  }

  if (foundPurchaseOrderDetail.serials >= foundPurchaseOrderDetail.quantity) {
    throw new Error("El detalle ya tiene asignado todos sus seriales");
  }

  const newProductSerial = await createProductSerial(companyId, {
    purchase_order_detail: addSerialToOrder.purchase_order_detail,
    warehouse: addSerialToOrder.warehouse,
    product: foundPurchaseOrderDetail.product._id,
    serial: addSerialToOrder.serial,
  });

  await incrementSerials(companyId, addSerialToOrder.purchase_order_detail);

  return newProductSerial;
};

export const deleteSerialToOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  productSerialId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundProductSerial = await ProductSerial.findOne({
    _id: productSerialId,
    company: companyId,
  });

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
    company: companyId,
  });

  if (deleteProductSerial.deletedCount > 0) {
    await decrementSerials(
      companyId,
      foundProductSerial.purchase_order_detail._id
    );
    return {
      success: true,
    };
  }
  return {
    success: false,
  };
};

export const deleteProductToOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  purchaseOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundPurchaseOrderDetail = await PurchaseOrderDetail.findOne({
    _id: purchaseOrderDetailId,
    company: companyId,
  });

  if (!foundPurchaseOrderDetail) {
    throw new Error("El detalle no fue encontrado");
  }

  const foundPurchaseOrder = await PurchaseOrder.findOne({
    _id: foundPurchaseOrderDetail.purchase_order._id,
    company: companyId,
  });

  if (!foundPurchaseOrder) {
    throw new Error("La orden no fue encontrada");
  }

  if (foundPurchaseOrder.status !== purchaseOrderStatus.BORRADOR) {
    throw new Error("No se puede borrar el detalle");
  }

  await ProductSerial.deleteMany({
    company: companyId,
    purchase_order_detail: purchaseOrderDetailId,
  });

  await ProductInventory.deleteOne({
    company: companyId,
    purchase_order_detail: purchaseOrderDetailId,
  });

  const deleteProductToPurchaseOrderDetail =
    await PurchaseOrderDetail.deleteOne({
      _id: purchaseOrderDetailId,
      company: companyId,
    });

  if (deleteProductToPurchaseOrderDetail.deletedCount > 0) {
    const updatedTotal = parseFloat(
      (foundPurchaseOrder.total - foundPurchaseOrderDetail.subtotal).toFixed(2)
    );

    await PurchaseOrder.updateOne(
      { _id: foundPurchaseOrder._id, company: companyId },
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
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  purchaseOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundPurchaseOrder = await PurchaseOrder.findOne({
    _id: purchaseOrderId,
    company: companyId,
  });

  if (!foundPurchaseOrder) {
    throw new Error("La compra no fue encontrada");
  }

  const foundPurchaseOrderDetails = await PurchaseOrderDetail.find({
    company: companyId,
    purchase_order: purchaseOrderId,
  });

  if (foundPurchaseOrder.status === purchaseOrderStatus.APROBADO) {
    const soldOrReservedSerials = await ProductSerial.find({
      company: companyId,
      purchase_order_detail: {
        $in: foundPurchaseOrderDetails.map((d) => d._id),
      },
      status: {
        $in: [productSerialStatus.VENDIDO, productSerialStatus.RESERVADO],
      },
    });

    const blockedInventory = await ProductInventory.find({
      company: companyId,
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
        const productUpdate = await Product.findOneAndUpdate(
          { _id: detail.product._id, company: companyId },
          {
            $inc: { stock: -detail.quantity }, // Restar la cantidad comprada al stock
          },
          { new: true }
        );

        if (!productUpdate) {
          throw new Error("No se puede actualizar.");
        }

        // Si el producto estaba disponible y ahora no tiene stock, cambiar a "sin stcock"
        if (
          productUpdate.stock <= 0 &&
          productUpdate.status === productStatus.DISPONIBLE
        ) {
          await Product.findOneAndUpdate(
            { _id: detail.product._id, company: companyId },
            {
              status: productStatus.SIN_STOCK,
            }
          );
        }

        // Actualizar los seriales del producto
        await ProductSerial.deleteMany({
          company: companyId,
          purchase_order_detail: detail._id,
          product: detail.product._id,
        });

        await ProductInventory.deleteOne({
          company: companyId,
          purchase_order_detail: detail._id,
          product: detail.product._id,
        });

        // Eliminar el detalle de la orden de venta
        await PurchaseOrderDetail.deleteOne({
          _id: detail._id,
          company: companyId,
        });
      })
    );

    // Eliminar la orden de compra
    const deletePurchaseOrder = await PurchaseOrder.deleteOne({
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
  if (foundPurchaseOrder.status === purchaseOrderStatus.BORRADOR) {
    // En estado borrador solo eliminamos los detalles de la orden y la orden de compra
    await Promise.all(
      foundPurchaseOrderDetails.map(async (detail) => {
        await ProductSerial.deleteMany({
          company: companyId,
          purchase_order_detail: detail._id,
          product: detail.product._id,
        });

        // Eliminar el detalle de la orden de compra
        await PurchaseOrderDetail.deleteOne({
          _id: detail._id,
          company: companyId,
        });
      })
    );

    // Eliminar la orden de venta
    const deletePurchaseOrder = await PurchaseOrder.deleteOne({
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

export const incrementSerials = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  purchaseOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  await PurchaseOrderDetail.updateOne(
    { _id: purchaseOrderDetailId, company: companyId },
    { $inc: { serials: 1 } }
  );
};

export const decrementSerials = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  purchaseOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  await PurchaseOrderDetail.updateOne(
    { _id: purchaseOrderDetailId, company: companyId },
    { $inc: { serials: -1 } }
  );
};

export const approve = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  purchaseOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundOrder = await PurchaseOrder.findOne({
    _id: purchaseOrderId,
    company: companyId,
  });
  const foundDetail: IPurchaseOrderDetail[] = await PurchaseOrderDetail.find({
    company: companyId,
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
      await Product.findOneAndUpdate(
        { _id: detail.product._id, company: companyId },
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
          company: companyId,
          purchase_order_detail: detail._id,
          product: detail.product._id,
        },
        {
          status: productSerialStatus.DISPONIBLE,
        }
      );

      await ProductInventory.updateOne(
        {
          company: companyId,
          purchase_order_detail: detail._id,
          product: detail.product._id,
        },
        {
          status: productInventoryStatus.DISPONIBLE,
          available: detail.quantity,
        }
      );
    })
  );

  foundOrder.status = purchaseOrderStatus.APROBADO;

  await foundOrder.save();

  return foundOrder;
};

export const updatePurchaseOrderDetail = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  purchaseOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updatePurchaseOrderInput: UpdatePurchaseOrderDetailInput
) => {
  const findPurchaseOrderDetail = await PurchaseOrderDetail.findOne({
    _id: purchaseOrderDetailId,
    company: companyId,
  });

  const findPurchaseOrderDetailLean = await PurchaseOrderDetail.findOne({
    _id: purchaseOrderDetailId,
    company: companyId,
  })
    .populate("product")
    .lean<IPurchaseOrderDetail>();

  if (!findPurchaseOrderDetailLean) {
    throw new Error("No se encontro el detalle");
  }

  if (!findPurchaseOrderDetail) {
    throw new Error("No se encontro el detalle");
  }

  const findPurchaseOrder = await PurchaseOrder.findOne({
    _id: findPurchaseOrderDetail.purchase_order,
    company: companyId,
  });

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
      { purchase_order_detail: purchaseOrderDetailId, company: companyId },
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
    company: companyId,
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
