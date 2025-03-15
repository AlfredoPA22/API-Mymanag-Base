import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { IProductSerial } from "../../interfaces/productSerial.interface";
import {
  ISaleOrder,
  ISaleOrderByYear,
  ISaleOrderToPDF,
  SaleOrderInput,
} from "../../interfaces/saleOrder.interface";
import {
  AddSerialToSaleOrderDetailInput,
  ISaleOrderDetail,
  ISaleOrderDetailToPDF,
  SaleOrderDetailInput,
  UpdateSaleOrderDetailInput,
} from "../../interfaces/saleOrderDetail.interface";
import { codeType } from "../../utils/enums/orderType.enum";
import { productSerialStatus } from "../../utils/enums/productSerialStatus.enum";
import { productStatus } from "../../utils/enums/productStatus.enum";
import { saleOrderStatus } from "../../utils/enums/saleOrderStatus.enum";
import { generate, increment } from "../codeGenerator/codeGenerator.service";
import { Product } from "../product/product.model";
import { ProductSerial } from "../product/product_serial.model";
import { SaleOrder } from "./sale_order.model";
import { SaleOrderDetail } from "./sale_order_detail.model";
import { IProduct } from "../../interfaces/product.interface";
import { stockType } from "../../utils/enums/stockType.enum";
import { IPurchaseOrderDetail } from "../../interfaces/purchaseOrderDetail.interface";

export const findAll = async (): Promise<ISaleOrder[]> => {
  return await SaleOrder.find().populate("client").lean<ISaleOrder[]>();
};

export const findDetail = async (
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISaleOrderDetail[]> => {
  const listDetail = await SaleOrderDetail.find({
    sale_order: saleOrderId,
  })
    .populate("sale_order")
    .populate({
      path: "product",
      populate: {
        path: "brand",
      },
    })
    .lean<ISaleOrderDetail[]>();

  return listDetail;
};

export const findSaleOrder = async (
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISaleOrder> => {
  return await SaleOrder.findById(saleOrderId)
    .populate("client")
    .lean<ISaleOrder>();
};

export const findSaleOrderToPDF = async (
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISaleOrderToPDF> => {
  const saleOrder: ISaleOrder = await findSaleOrder(saleOrderId);
  const saleOrderDetail: ISaleOrderDetail[] = await findDetail(saleOrderId);

  const saleOrderDetailToPDF: ISaleOrderDetailToPDF[] = await Promise.all(
    saleOrderDetail.map(async (detail: ISaleOrderDetail) => {
      const productSerials: IProductSerial[] = await ProductSerial.find({
        sale_order_detail: detail._id,
      }).lean<IProductSerial[]>();

      return {
        saleOrderDetail: detail,
        productSerial: productSerials,
      };
    })
  );

  const response: ISaleOrderToPDF = {
    saleOrder,
    saleOrderDetail: saleOrderDetailToPDF,
  };
  return response;
};

export const create = async (createSaleOrderInput: SaleOrderInput) => {
  const newSaleOrder = await (
    await SaleOrder.create({
      code: await generate(codeType.SALE_ORDER),
      date: createSaleOrderInput.date,
      client: createSaleOrderInput.client,
    })
  ).populate("client");

  await increment(codeType.SALE_ORDER);

  return newSaleOrder;
};

export const createDetail = async (
  createSaleOrderDetailInput: SaleOrderDetailInput
) => {
  const foundDetail = await SaleOrderDetail.findOne({
    sale_order: createSaleOrderDetailInput.sale_order,
    product: createSaleOrderDetailInput.product,
  });

  const foundOrder = await SaleOrder.findOne({
    _id: createSaleOrderDetailInput.sale_order,
  });

  if (foundDetail) {
    throw new Error("El producto ya existe en la venta");
  }

  if (createSaleOrderDetailInput.sale_price <= 0) {
    throw new Error("Ingrese un precio mayor a 0");
  }

  if (createSaleOrderDetailInput.quantity <= 0) {
    throw new Error("Ingrese una cantidad mayor a 0");
  }

  const foundProduct = await Product.findById(
    createSaleOrderDetailInput.product
  );

  if (createSaleOrderDetailInput.quantity > foundProduct.stock) {
    throw new Error("No hay suficiente stock");
  }

  const subtotal: number =
    Math.round(
      createSaleOrderDetailInput.quantity *
        createSaleOrderDetailInput.sale_price *
        100
    ) / 100;

  const newSaleOrderDetail = await (
    await (
      await SaleOrderDetail.create({
        ...createSaleOrderDetailInput,
        subtotal,
      })
    ).populate("sale_order")
  ).populate("product");

  const updatedTotal = parseFloat((foundOrder.total + subtotal).toFixed(2));

  await SaleOrder.findByIdAndUpdate(
    createSaleOrderDetailInput.sale_order,
    {
      total: updatedTotal,
    },
    { new: true }
  );

  const foundSaleOrderDetail = await (
    await (
      await SaleOrderDetail.findById(newSaleOrderDetail._id)
    ).populate("sale_order")
  ).populate("product");

  return foundSaleOrderDetail;
};

export const incrementSerials = async (
  saleOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  await SaleOrderDetail.updateOne(
    { _id: saleOrderDetailId },
    { $inc: { serials: 1 } }
  );
};

export const decrementSerials = async (
  saleOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  await SaleOrderDetail.updateOne(
    { _id: saleOrderDetailId },
    { $inc: { serials: -1 } }
  );
};

export const addSerialToOrder = async (
  addSerialToOrder: AddSerialToSaleOrderDetailInput
) => {
  const foundSaleOrderDetail = await SaleOrderDetail.findById(
    addSerialToOrder.sale_order_detail
  );

  if (!foundSaleOrderDetail) {
    throw new Error("No existe el detalle en la venta");
  }

  const foundProduct: IProduct = await Product.findById(
    foundSaleOrderDetail.product
  );

  if (foundProduct.stock_type === stockType.INDIVIDUAL) {
    throw new Error("No se pueden agregar seriales a este producto");
  }

  if (foundSaleOrderDetail.serials >= foundSaleOrderDetail.quantity) {
    throw new Error("El detalle ya tiene asignado todos sus seriales");
  }

  const foundProductSerial = await ProductSerial.findOne({
    serial: addSerialToOrder.serial,
  });

  if (!foundProductSerial) {
    throw new Error("No existe el serial");
  }

  if (
    foundProductSerial.sale_order_detail &&
    foundProductSerial.sale_order_detail.toString() ===
      addSerialToOrder.sale_order_detail.toString()
  ) {
    throw new Error("El serial ya está asignado a este detalle de venta");
  }

  if (
    foundProductSerial.product.toString() !==
    foundSaleOrderDetail.product.toString()
  ) {
    throw new Error("El serial no pertenece a este producto");
  } else if (foundProductSerial.status === productSerialStatus.VENDIDO) {
    throw new Error("El serial ya fue vendido");
  } else if (foundProductSerial.status === productSerialStatus.RESERVADO) {
    throw new Error(
      "El serial fue registrado en otra venta con estado (Borrador)"
    );
  } else if (foundProductSerial.status === productSerialStatus.BORRADOR) {
    throw new Error("El serial no esta disponible");
  }

  await ProductSerial.updateOne(
    {
      _id: foundProductSerial._id,
    },
    {
      $set: {
        sale_order_detail: addSerialToOrder.sale_order_detail,
        status: productSerialStatus.RESERVADO,
      },
    }
  );

  await incrementSerials(addSerialToOrder.sale_order_detail);

  const updatedProductSerial = await ProductSerial.findOne({
    _id: foundProductSerial._id,
  });

  return updatedProductSerial;
};

export const deleteSerialToOrder = async (
  productSerialId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundProductSerial = await ProductSerial.findById(productSerialId);

  if (!foundProductSerial) {
    throw new Error("Serial no fue encontrado");
  }

  if (foundProductSerial.status !== productSerialStatus.RESERVADO) {
    throw new Error("No se puede borrar el serial");
  } else if (!foundProductSerial.sale_order_detail) {
    throw new Error("No se puede borrar el serial");
  }

  await decrementSerials(foundProductSerial.sale_order_detail._id);

  await ProductSerial.updateOne(
    {
      _id: foundProductSerial._id,
    },
    {
      $set: {
        sale_order_detail: null,
        status: productSerialStatus.DISPONIBLE,
      },
    }
  );
  return {
    success: true,
  };
};

export const deleteProductToOrder = async (
  saleOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundSaleOrderDetail =
    await SaleOrderDetail.findById(saleOrderDetailId);

  if (!foundSaleOrderDetail) {
    throw new Error("El detalle no fue encontrado");
  }

  const foundSaleOrder = await SaleOrder.findById(
    foundSaleOrderDetail.sale_order._id
  );

  if (!foundSaleOrder) {
    throw new Error("La orden no fue encontrada");
  }

  if (foundSaleOrder.status !== saleOrderStatus.BORRADOR) {
    throw new Error("No se puede borrar el detalle");
  }

  await ProductSerial.updateMany(
    { sale_order_detail: saleOrderDetailId },
    {
      $set: { sale_order_detail: null, status: productSerialStatus.DISPONIBLE },
    }
  );
  const deleteProductToSaleOrderDetail = await SaleOrderDetail.deleteOne({
    _id: saleOrderDetailId,
  });

  if (deleteProductToSaleOrderDetail.deletedCount > 0) {
    const updatedTotal = parseFloat(
      (foundSaleOrder.total - foundSaleOrderDetail.subtotal).toFixed(2)
    );

    await SaleOrder.updateOne(
      { _id: foundSaleOrder._id },
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

export const deleteSaleOrder = async (
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundSaleOrder = await SaleOrder.findById(saleOrderId);

  if (!foundSaleOrder) {
    throw new Error("La venta no fue encontrada");
  }

  const foundSaleOrderDetails = await SaleOrderDetail.find({
    sale_order: saleOrderId,
  });

  // Proceso para estado "APROBADO"
  if (foundSaleOrder.status === saleOrderStatus.APROBADO) {
    await Promise.all(
      foundSaleOrderDetails.map(async (detail) => {
        // Actualizar el stock del producto
        const productUpdate = await Product.findByIdAndUpdate(
          detail.product._id,
          {
            $inc: { stock: detail.quantity }, // Sumar la cantidad vendida al stock
          },
          { new: true }
        );

        // Si el producto estaba sin stock y ahora tiene stock, cambiar a "disponible"
        if (
          productUpdate.stock > 0 &&
          productUpdate.status === productStatus.SIN_STOCK
        ) {
          await Product.findByIdAndUpdate(detail.product._id, {
            status: productStatus.DISPONIBLE,
          });
        }

        // Actualizar los seriales del producto
        await ProductSerial.updateMany(
          {
            sale_order_detail: detail._id,
            product: detail.product._id,
          },
          {
            status: productSerialStatus.DISPONIBLE, // Cambiar a "disponible"
            sale_order_detail: null, // Poner el campo sale_order_detail a null
          }
        );

        // Eliminar el detalle de la orden de venta
        await SaleOrderDetail.deleteOne({ _id: detail._id });
      })
    );

    // Eliminar la orden de venta
    const deleteSaleOrder = await SaleOrder.deleteOne({
      _id: saleOrderId,
    });

    if (deleteSaleOrder.deletedCount > 0) {
      return {
        success: true,
      };
    }
  }

  // Proceso para estado "BORRADOR"
  if (foundSaleOrder.status === saleOrderStatus.BORRADOR) {
    // En estado borrador solo eliminamos los detalles de la orden y la orden de venta
    await Promise.all(
      foundSaleOrderDetails.map(async (detail) => {
        await ProductSerial.updateMany(
          {
            sale_order_detail: detail._id,
            product: detail.product._id,
          },
          {
            status: productSerialStatus.DISPONIBLE, // Cambiar a "disponible"
            sale_order_detail: null, // Poner el campo sale_order_detail a null
          }
        );

        // Eliminar el detalle de la orden de venta
        await SaleOrderDetail.deleteOne({ _id: detail._id });
      })
    );

    // Eliminar la orden de venta
    const deleteSaleOrder = await SaleOrder.deleteOne({
      _id: saleOrderId,
    });

    if (deleteSaleOrder.deletedCount > 0) {
      return {
        success: true,
      };
    }
  }

  return {
    success: false,
  };
};

export const approve = async (
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundOrder = await SaleOrder.findById(saleOrderId);
  const foundDetail: ISaleOrderDetail[] = await SaleOrderDetail.find({
    sale_order: saleOrderId,
  })
    .populate("product")
    .lean<ISaleOrderDetail[]>();

  if (!foundOrder) {
    throw new Error("La venta no fue encontrada");
  }

  if (foundOrder.status === saleOrderStatus.APROBADO) {
    throw new Error("La venta ya fue aprobada");
  }

  if (foundOrder.status === saleOrderStatus.CANCELADO) {
    throw new Error("La venta esta cancelada");
  }

  if (foundDetail.length === 0) {
    throw new Error("La venta debe tener almenos un producto");
  }

  const hasSerialsInZero = foundDetail.some(
    (detail: ISaleOrderDetail) =>
      detail.product.stock_type === stockType.SERIALIZADO &&
      detail.serials !== detail.quantity
  );

  if (hasSerialsInZero) {
    throw new Error("Faltan agregar seriales a la venta");
  }

  await Promise.all(
    foundDetail.map(async (detail) => {
      if (detail.product.stock_type === stockType.INDIVIDUAL) {
        const product = await Product.findById(detail.product._id);
        if (product && product.stock < detail.quantity) {
          throw new Error(
            `No hay suficiente stock para el producto ${product.name}. Solo quedan ${product.stock} unidades disponibles.`
          );
        }
      }
    })
  );

  await Promise.all(
    foundDetail.map(async (detail) => {
      const productUpdate = await Product.findByIdAndUpdate(
        detail.product._id,
        {
          $inc: { stock: -detail.quantity },
        },
        { new: true }
      );

      if (productUpdate.stock <= 0) {
        await Product.findByIdAndUpdate(
          detail.product._id,
          { status: productStatus.SIN_STOCK },
          { new: true }
        );
      }

      await ProductSerial.updateMany(
        {
          sale_order_detail: detail._id,
          product: detail.product._id,
        },
        {
          status: productSerialStatus.VENDIDO,
        }
      );
    })
  );

  foundOrder.status = saleOrderStatus.APROBADO;

  await foundOrder.save();

  return foundOrder;
};

export const updateSaleOrderDetail = async (
  saleOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateSaleOrderInput: UpdateSaleOrderDetailInput
) => {
  const findSaleOrderDetail = await SaleOrderDetail.findById(saleOrderDetailId);
  if (!findSaleOrderDetail) {
    throw new Error("No se encontro el detalle");
  }

  const findSaleOrder = await SaleOrder.findById(
    findSaleOrderDetail.sale_order
  );
  if (!findSaleOrder) {
    throw new Error("No se encontro la orden");
  }
  if (findSaleOrder.status === saleOrderStatus.APROBADO) {
    throw new Error(
      "No se se puede editar el detalle porque la venta esta aprobada."
    );
  }
  const stockProduct = await Product.findById(findSaleOrderDetail.product);

  if (updateSaleOrderInput.quantity > stockProduct.stock) {
    throw new Error("No hay stock suficiente.");
  }

  if (updateSaleOrderInput.quantity < findSaleOrderDetail.serials) {
    throw new Error(
      "La nueva cantidad no puede ser menor que la cantidad de seriales."
    );
  }

  findSaleOrderDetail.sale_price = updateSaleOrderInput.sale_price;
  findSaleOrderDetail.quantity = updateSaleOrderInput.quantity;
  findSaleOrderDetail.subtotal =
    Math.round(
      updateSaleOrderInput.sale_price * updateSaleOrderInput.quantity * 100
    ) / 100;
  await findSaleOrderDetail.save();

  const saleOrderDetails = await SaleOrderDetail.find({
    sale_order: findSaleOrder._id,
  });
  let newTotal = 0;
  saleOrderDetails.forEach((detail) => {
    newTotal += detail.subtotal;
  });
  findSaleOrder.total = parseFloat(newTotal.toFixed(2));
  await findSaleOrder.save();

  return findSaleOrderDetail;
};

export const reportSaleOrderByYear = async () => {
  const currentYear = new Date().getFullYear();

  const salesByMonth = await SaleOrder.aggregate([
    {
      $match: {
        status: saleOrderStatus.APROBADO,
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

  const report: ISaleOrderByYear[] = monthsOfYear.map((month, index) => {
    const sale = salesByMonth.find((s) => s._id === index + 1);
    return {
      month: month || "Unknown",
      total: sale ? sale.total : 0,
    };
  });

  return report;
};

export const reportEarningsByYear = async () => {
  const currentYear = new Date().getFullYear();

  const earningsByMonth = await SaleOrder.aggregate([
    {
      $match: {
        status: saleOrderStatus.APROBADO,
        date: {
          $gte: new Date(`${currentYear}-01-01`),
          $lt: new Date(`${currentYear + 1}-01-01`),
        },
      },
    },
    {
      $lookup: {
        from: "purchaseorders", // La colección de compras
        localField: "date", // O el campo que relaciona ventas y compras
        foreignField: "date", // O el campo correspondiente en las compras
        as: "purchases",
      },
    },
    {
      $unwind: {
        path: "$purchases",
        preserveNullAndEmptyArrays: true, // Para manejar ventas sin compras
      },
    },
    {
      $group: {
        _id: { $month: "$date" },
        totalSales: { $sum: "$total" },
        totalPurchases: { $sum: "$purchases.total" }, // Sumamos el total de las compras
      },
    },
    {
      $project: {
        month: "$_id",
        earnings: { $subtract: ["$totalSales", "$totalPurchases"] }, // Restamos las compras de las ventas
      },
    },
    {
      $sort: { month: 1 },
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

  const report: ISaleOrderByYear[] = monthsOfYear.map((month, index) => {
    const earnings = earningsByMonth.find((e) => e.month === index + 1);
    return {
      month: month || "Unknown",
      total: earnings ? earnings.earnings : 0,
    };
  });

  return report;
};
