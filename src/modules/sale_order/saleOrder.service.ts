import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { IProduct } from "../../interfaces/product.interface";
import { IProductSerial } from "../../interfaces/productSerial.interface";
import {
  FilterSaleOrderInput,
  ISaleOrder,
  ISaleOrderByProduct,
  ISaleOrderToPDF,
  ISalesReportByCategory,
  ISalesReportByClient,
  SaleOrderInput,
} from "../../interfaces/saleOrder.interface";
import {
  AddSerialToSaleOrderDetailInput,
  ISaleOrderDetail,
  ISaleOrderDetailToPDF,
  SaleOrderDetailInput,
  UpdateSaleOrderDetailInput,
} from "../../interfaces/saleOrderDetail.interface";
import { IUser } from "../../interfaces/user.interface";
import { codeType } from "../../utils/enums/orderType.enum";
import { productInventoryStatus } from "../../utils/enums/productInventoryStatus.enum";
import { productSerialStatus } from "../../utils/enums/productSerialStatus.enum";
import { productStatus } from "../../utils/enums/productStatus.enum";
import { paymentMethod } from "../../utils/enums/saleOrderPaymentMethod";
import { saleOrderStatus } from "../../utils/enums/saleOrderStatus.enum";
import { stockType } from "../../utils/enums/stockType.enum";
import { generate, increment } from "../codeGenerator/codeGenerator.service";
import { Product } from "../product/product.model";
import { ProductInventory } from "../product/product_inventory.model";
import { ProductSerial } from "../product/product_serial.model";
import { SalePayment } from "../sale_payment/sale_payment.model";
import { User } from "../user/user.model";
import { SaleOrder } from "./sale_order.model";
import { SaleOrderDetail } from "./sale_order_detail.model";
import { Company } from "../company/company.model";
import dayjs from "dayjs";
import { companyPlanLimits } from "../../utils/planLimits";
import { companyPlan } from "../../utils/enums/companyPlan.enum";

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISaleOrder[]> => {
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

  return await SaleOrder.find(filter)
    .sort({ date: -1 })
    .populate("client")
    .populate("created_by")
    .lean<ISaleOrder[]>();
};

export const listSaleOrderByProduct = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  productId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISaleOrderByProduct[]> => {
  const foundUser: IUser | null = await User.findOne({
    _id: userId,
    company: companyId,
  });

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const details: ISaleOrderDetail[] = await SaleOrderDetail.find({
    company: companyId,
    product: productId,
  });

  if (!details.length) return [];

  const saleOrderIds = details.map((d) => d.sale_order);

  const saleOrders: ISaleOrder[] = await SaleOrder.find({
    _id: { $in: saleOrderIds },
    company: companyId,
    ...(foundUser.is_global ? {} : { created_by: userId }),
  })
    .populate("client")
    .populate("created_by")
    .lean<ISaleOrder[]>();

  const allowedOrderIds = new Set(saleOrders.map((so) => so._id.toString()));

  const result: ISaleOrderByProduct[] = details
    .filter((detail) => allowedOrderIds.has(detail.sale_order.toString()))
    .map((detail) => {
      const order = saleOrders.find(
        (so) => so._id.toString() === detail.sale_order.toString()
      );
      return {
        saleOrder: order!,
        saleOrderDetail: detail,
      };
    });

  return result.sort((a, b) => {
    return (
      new Date(b.saleOrder.date).getTime() -
      new Date(a.saleOrder.date).getTime()
    );
  });
};

export const saleOrderReport = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  filterSaleOrderInput: FilterSaleOrderInput
): Promise<ISaleOrder[]> => {
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

  const saleOrders = await SaleOrder.find(query)
    .populate("client")
    .populate("company")
    .lean<ISaleOrder[]>();

  return saleOrders;
};

export const findDetail = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISaleOrderDetail[]> => {
  const listDetail = await SaleOrderDetail.find({
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
    .lean<ISaleOrderDetail[]>();

  return listDetail;
};

export const findSaleOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISaleOrder> => {
  const saleOrder = await SaleOrder.findOne({
    _id: saleOrderId,
    company: companyId,
  })
    .populate("client")
    .populate("company")
    .lean<ISaleOrder | null>();

  if (!saleOrder) {
    throw new Error("Orden de venta no encontrada");
  }

  return saleOrder;
};

export const findSaleOrderToPDF = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISaleOrderToPDF> => {
  const saleOrder: ISaleOrder = await findSaleOrder(companyId, saleOrderId);
  const saleOrderDetail: ISaleOrderDetail[] = await findDetail(
    companyId,
    saleOrderId
  );

  const saleOrderDetailToPDF: ISaleOrderDetailToPDF[] = await Promise.all(
    saleOrderDetail.map(async (detail: ISaleOrderDetail) => {
      const productSerials: IProductSerial[] = await ProductSerial.find({
        company: companyId,
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

export const create = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  createSaleOrderInput: SaleOrderInput
) => {
  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const inputDate = dayjs(createSaleOrderInput.date);
  const startOfMonth = inputDate.startOf("month").toDate();
  const endOfMonth = inputDate.endOf("month").toDate();

  const saleOrderCount = await SaleOrder.countDocuments({
    company: companyId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  });

  const planLimits = companyPlanLimits[company.plan as companyPlan];

  if (planLimits.maxSaleOrder && saleOrderCount >= planLimits.maxSaleOrder) {
    throw new Error(
      `Tu plan actual (${company.plan}) solo permite hasta ${planLimits.maxSaleOrder} órdenes de venta por mes}`
    );
  }

  const isPaid: boolean =
    createSaleOrderInput.payment_method === paymentMethod.CONTADO
      ? true
      : false;

  const newSaleOrder = await (
    await SaleOrder.create({
      company: companyId,
      code: await generate(companyId, codeType.SALE_ORDER),
      date: createSaleOrderInput.date,
      client: createSaleOrderInput.client,
      payment_method: createSaleOrderInput.payment_method,
      is_paid: isPaid,
      created_by: userId,
    })
  ).populate("client");

  await increment(companyId, codeType.SALE_ORDER);

  return newSaleOrder;
};

export const createDetail = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  createSaleOrderDetailInput: SaleOrderDetailInput
) => {
  const foundDetail = await SaleOrderDetail.findOne({
    company: companyId,
    sale_order: createSaleOrderDetailInput.sale_order,
    product: createSaleOrderDetailInput.product,
  });

  const foundOrder = await SaleOrder.findOne({
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

  const foundProduct = await Product.findOne({
    _id: createSaleOrderDetailInput.product,
    company: companyId,
  });

  if (!foundProduct) {
    throw new Error("Producto no encontrado");
  }

  if (createSaleOrderDetailInput.quantity > foundProduct.stock) {
    throw new Error("No hay suficiente stock");
  }

  if (foundProduct.stock_type === stockType.INDIVIDUAL) {
    if (!createSaleOrderDetailInput.warehouse) {
      throw new Error("Seleccione un almacén");
    }

    const productInventories = await ProductInventory.find({
      company: companyId,
      product: createSaleOrderDetailInput.product,
      warehouse: createSaleOrderDetailInput.warehouse,
    });

    if (productInventories.length === 0) {
      throw new Error(
        "No hay stock registrado para este producto en este almacén"
      );
    }

    let quantityToAssign = createSaleOrderDetailInput.quantity;
    let inventoryUsage: any[] = [];

    const totalAvailableStock = productInventories.reduce(
      (total, inventory) => total + inventory.available,
      0
    );

    if (totalAvailableStock < quantityToAssign) {
      throw new Error("No hay suficiente stock disponible en los inventarios");
    }

    for (const productInventory of productInventories) {
      if (quantityToAssign <= 0) break;

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
  } else {
    delete createSaleOrderDetailInput.warehouse;
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
        company: companyId,
        ...createSaleOrderDetailInput,
        subtotal,
      })
    ).populate("sale_order")
  ).populate("product");

  const updatedTotal = parseFloat((foundOrder.total + subtotal).toFixed(2));

  await SaleOrder.findOneAndUpdate(
    { _id: createSaleOrderDetailInput.sale_order, company: companyId },
    {
      total: updatedTotal,
    },
    { new: true }
  );

  const foundSaleOrderDetail = await SaleOrderDetail.findOne({
    _id: newSaleOrderDetail._id,
    company: companyId,
  })
    .populate("sale_order")
    .populate("product")
    .lean<ISaleOrderDetail | null>();

  if (!foundSaleOrderDetail) {
    throw new Error("Detalle de venta no encontrado");
  }

  return foundSaleOrderDetail;
};

export const incrementSerials = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  await SaleOrderDetail.updateOne(
    { _id: saleOrderDetailId, company: companyId },
    { $inc: { serials: 1 } }
  );
};

export const decrementSerials = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  await SaleOrderDetail.updateOne(
    { _id: saleOrderDetailId, company: companyId },
    { $inc: { serials: -1 } }
  );
};

export const addSerialToOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  addSerialToOrder: AddSerialToSaleOrderDetailInput
) => {
  const foundSaleOrderDetail = await SaleOrderDetail.findOne({
    _id: addSerialToOrder.sale_order_detail,
    company: companyId,
  });

  if (!foundSaleOrderDetail) {
    throw new Error("No existe el detalle en la venta");
  }

  const foundProduct = await Product.findOne({
    _id: foundSaleOrderDetail.product,
    company: companyId,
  });

  if (!foundProduct) {
    throw new Error("Producto no encontrado");
  }

  if (foundProduct.stock_type === stockType.INDIVIDUAL) {
    throw new Error("No se pueden agregar seriales a este producto");
  }

  if (foundSaleOrderDetail.serials >= foundSaleOrderDetail.quantity) {
    throw new Error("El detalle ya tiene asignado todos sus seriales");
  }

  const foundProductSerial = await ProductSerial.findOne({
    company: companyId,
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
      company: companyId,
    },
    {
      $set: {
        sale_order_detail: addSerialToOrder.sale_order_detail,
        status: productSerialStatus.RESERVADO,
      },
    }
  );

  await incrementSerials(companyId, addSerialToOrder.sale_order_detail);

  const updatedProductSerial = await ProductSerial.findOne({
    _id: foundProductSerial._id,
    company: companyId,
  });

  return updatedProductSerial;
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

  if (foundProductSerial.status !== productSerialStatus.RESERVADO) {
    throw new Error("No se puede borrar el serial");
  } else if (!foundProductSerial.sale_order_detail) {
    throw new Error("No se puede borrar el serial");
  }

  await decrementSerials(companyId, foundProductSerial.sale_order_detail._id);

  await ProductSerial.updateOne(
    {
      _id: foundProductSerial._id,
      company: companyId,
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
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundSaleOrderDetail = await SaleOrderDetail.findOne({
    _id: saleOrderDetailId,
    company: companyId,
  })
    .populate("product")
    .populate("sale_order")
    .lean<ISaleOrderDetail>();

  if (!foundSaleOrderDetail) {
    throw new Error("El detalle no fue encontrado");
  }

  const foundSaleOrder = await SaleOrder.findOne({
    _id: foundSaleOrderDetail.sale_order._id,
    company: companyId,
  });

  if (!foundSaleOrder) {
    throw new Error("La orden no fue encontrada");
  }

  if (foundSaleOrder.status !== saleOrderStatus.BORRADOR) {
    throw new Error("No se puede borrar el detalle");
  }

  if (foundSaleOrderDetail.product.stock_type === stockType.INDIVIDUAL) {
    for (const inventoryUsage of foundSaleOrderDetail.inventory_usage) {
      const productInventory = await ProductInventory.findOne({
        company: companyId,
        product: foundSaleOrderDetail.product,
        warehouse: inventoryUsage.warehouse,
        purchase_order_detail: inventoryUsage.purchase_order_detail,
      });

      if (productInventory) {
        productInventory.available += inventoryUsage.quantity!;
        productInventory.reserved -= inventoryUsage.quantity!;
        await productInventory.save();
      }
    }
  }

  await ProductSerial.updateMany(
    { sale_order_detail: saleOrderDetailId, company: companyId },
    {
      $set: { sale_order_detail: null, status: productSerialStatus.DISPONIBLE },
    }
  );

  const deleteProductToSaleOrderDetail = await SaleOrderDetail.deleteOne({
    _id: saleOrderDetailId,
    company: companyId,
  });

  if (deleteProductToSaleOrderDetail.deletedCount > 0) {
    const updatedTotal = parseFloat(
      (foundSaleOrder.total - foundSaleOrderDetail.subtotal).toFixed(2)
    );

    await SaleOrder.updateOne(
      { _id: foundSaleOrder._id, company: companyId },
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
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundSaleOrder = await SaleOrder.findOne({
    _id: saleOrderId,
    company: companyId,
  });

  if (!foundSaleOrder) {
    throw new Error("La venta no fue encontrada");
  }

  const foundPayments = await SalePayment.find({
    sale_order: saleOrderId,
    company: companyId,
  });

  if (foundPayments.length > 0) {
    throw new Error(
      "No se puede eliminar venta porque tiene pagos registrados"
    );
  }

  const foundSaleOrderDetails = await SaleOrderDetail.find({
    company: companyId,
    sale_order: saleOrderId,
  });

  // Proceso para estado "APROBADO"
  if (foundSaleOrder.status === saleOrderStatus.APROBADO) {
    await Promise.all(
      foundSaleOrderDetails.map(async (detail) => {
        // Actualizar el stock del producto
        const productUpdate = await Product.findOneAndUpdate(
          { _id: detail.product._id, company: companyId },
          {
            $inc: { stock: detail.quantity }, // Sumar la cantidad vendida al stock
          },
          { new: true }
        );

        // Si el producto estaba sin stock y ahora tiene stock, cambiar a "disponible"
        if (
          productUpdate &&
          productUpdate.stock > 0 &&
          productUpdate.status === productStatus.SIN_STOCK
        ) {
          await Product.findOneAndUpdate(
            { _id: detail.product._id, company: companyId },
            {
              status: productStatus.DISPONIBLE,
            }
          );
        }

        // Actualizar los seriales del producto
        await ProductSerial.updateMany(
          {
            company: companyId,
            sale_order_detail: detail._id,
            product: detail.product._id,
          },
          {
            status: productSerialStatus.DISPONIBLE, // Cambiar a "disponible"
            sale_order_detail: null, // Poner el campo sale_order_detail a null
          }
        );

        if (detail.inventory_usage && Array.isArray(detail.inventory_usage)) {
          await Promise.all(
            detail.inventory_usage.map(async (usage: any) => {
              const inventory = await ProductInventory.findOne({
                company: companyId,
                product: detail.product._id,
                warehouse: usage.warehouse,
                purchase_order_detail: usage.purchase_order_detail,
              });

              if (inventory) {
                inventory.sold -= usage.quantity;
                if (inventory.sold < 0) inventory.sold = 0;
                inventory.available += usage.quantity;

                // Actualizar estado del inventario
                if (inventory.available > 0) {
                  inventory.status = productInventoryStatus.DISPONIBLE;
                }

                await inventory.save();
              }
            })
          );
        }

        // Eliminar el detalle de la orden de venta
        await SaleOrderDetail.deleteOne({
          _id: detail._id,
          company: companyId,
        });
      })
    );

    // Eliminar la orden de venta
    const deleteSaleOrder = await SaleOrder.deleteOne({
      _id: saleOrderId,
      company: companyId,
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
            company: companyId,
            sale_order_detail: detail._id,
            product: detail.product._id,
          },
          {
            status: productSerialStatus.DISPONIBLE, // Cambiar a "disponible"
            sale_order_detail: null, // Poner el campo sale_order_detail a null
          }
        );

        // Eliminar el detalle de la orden de venta
        await SaleOrderDetail.deleteOne({
          _id: detail._id,
          company: companyId,
        });
      })
    );

    // Eliminar la orden de venta
    const deleteSaleOrder = await SaleOrder.deleteOne({
      _id: saleOrderId,
      company: companyId,
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
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const foundOrder = await SaleOrder.findOne({
    _id: saleOrderId,
    company: companyId,
  });
  const foundDetail: ISaleOrderDetail[] = await SaleOrderDetail.find({
    company: companyId,
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

  for (const detail of foundDetail) {
    if (detail.product.stock_type === stockType.INDIVIDUAL) {
      const product = await Product.findOne({
        _id: detail.product._id,
        company: companyId,
      });
      if (product && product.stock < detail.quantity) {
        throw new Error(
          `No hay suficiente stock para el producto ${product.name}. Solo quedan ${product.stock} unidades disponibles.`
        );
      }
    }
  }

  await Promise.all(
    foundDetail.map(async (detail) => {
      if (detail.product.stock_type === stockType.INDIVIDUAL) {
        const product = await Product.findOne({
          _id: detail.product._id,
          company: companyId,
        });
        if (product && product.stock < detail.quantity) {
          throw new Error(
            `No hay suficiente stock para el producto ${product.name}. Solo quedan ${product.stock} unidades disponibles.`
          );
        }
      }
    })
  );

  for (const detail of foundDetail) {
    const product = await Product.findOneAndUpdate(
      { _id: detail.product._id, company: companyId },
      { $inc: { stock: -detail.quantity } },
      { new: true }
    );

    if (product && product?.stock <= 0) {
      await Product.findOneAndUpdate(
        { _id: detail.product._id, company: companyId },
        { status: productStatus.SIN_STOCK },
        { new: true }
      );
    }

    // Actualizar seriales a VENDIDO
    await ProductSerial.updateMany(
      {
        company: companyId,
        sale_order_detail: detail._id,
        product: detail.product._id,
      },
      {
        status: productSerialStatus.VENDIDO,
      }
    );

    // 👇 Aquí modificamos los inventarios asociados
    const inventories = await ProductInventory.find({
      company: companyId,
      product: detail.product._id,
      reserved: { $gt: 0 }, // solo inventarios con reservas
    });

    let quantityToSell = detail.quantity;

    for (const inventory of inventories) {
      if (quantityToSell <= 0) break;

      const canSellFromThis = Math.min(inventory.reserved, quantityToSell);

      inventory.sold += canSellFromThis;
      inventory.reserved -= canSellFromThis;
      quantityToSell -= canSellFromThis;

      if (inventory.reserved === 0 && inventory.available === 0) {
        inventory.status = productInventoryStatus.SIN_STOCK;
      }

      await inventory.save();
    }
  }

  foundOrder.status = saleOrderStatus.APROBADO;

  await foundOrder.save();

  return foundOrder;
};

export const updateSaleOrderDetail = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateSaleOrderInput: UpdateSaleOrderDetailInput
) => {
  const findSaleOrderDetail = await SaleOrderDetail.findOne({
    _id: saleOrderDetailId,
    company: companyId,
  })
    .populate("product")
    .populate("sale_order");

  if (!findSaleOrderDetail) {
    throw new Error("No se encontro el detalle");
  }

  const findSaleOrder = await SaleOrder.findOne({
    _id: findSaleOrderDetail.sale_order,
    company: companyId,
  });

  if (!findSaleOrder) {
    throw new Error("No se encontro la orden");
  }

  if (findSaleOrder.status === saleOrderStatus.APROBADO) {
    throw new Error(
      "No se se puede editar el detalle porque la venta esta aprobada."
    );
  }

  const stockProduct = await Product.findOne({
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
    throw new Error(
      "La nueva cantidad no puede ser menor que la cantidad de seriales."
    );
  }

  if (stockProduct.stock_type === stockType.INDIVIDUAL) {
    for (const usage of findSaleOrderDetail.inventory_usage) {
      const productInventory = await ProductInventory.findOne({
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

    const warehousesUsed = findSaleOrderDetail.inventory_usage.map(
      (usage) => usage.warehouse
    );

    const productInventories = await ProductInventory.find({
      company: companyId,
      product: stockProduct._id,
      warehouse: { $in: warehousesUsed },
    });

    let quantityToAssign = updateSaleOrderInput.quantity;
    const inventoryUsage: any[] = [];

    const totalAvailableStock = productInventories.reduce(
      (total, inventory) => total + inventory.available,
      0
    );

    if (totalAvailableStock < quantityToAssign) {
      throw new Error("No hay suficiente stock disponible en los inventarios");
    }

    for (const productInventory of productInventories) {
      if (quantityToAssign <= 0) break;

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

    findSaleOrderDetail.inventory_usage.splice(
      0,
      findSaleOrderDetail.inventory_usage.length,
      ...inventoryUsage
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
    company: companyId,
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

export const reportSaleOrderByClient = async (
  companyId: MongooseTypes.ObjectId,
  userId: MongooseTypes.ObjectId // Usamos solo MongooseTypes.ObjectId
) => {
  const foundUser: IUser | null = await User.findOne({
    _id: userId,
    company: companyId,
  });

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const currentYear = new Date().getFullYear();

  const matchStage: any = {
    company: new MongooseTypes.ObjectId(companyId),
    status: saleOrderStatus.APROBADO,
    date: {
      $gte: new Date(`${currentYear}-01-01`),
      $lt: new Date(`${currentYear + 1}-01-01`),
    },
  };

  if (!foundUser.is_global) {
    matchStage["created_by"] = new MongooseTypes.ObjectId(userId);
  }

  const topClients = await SaleOrder.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$client",
        total: { $sum: "$total" },
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
    { $limit: 5 },
  ]);

  return topClients as ISalesReportByClient[];
};

export const reportSaleOrderByCategory = async (
  companyId: MongooseTypes.ObjectId,
  userId: MongooseTypes.ObjectId // Usa MongooseTypes.ObjectId
) => {
  const foundUser: IUser | null = await User.findOne({
    _id: userId,
    company: companyId,
  });

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const currentYear = new Date().getFullYear();

  const matchStage: any = {
    "orderData.company": new MongooseTypes.ObjectId(companyId),
    "orderData.status": saleOrderStatus.APROBADO,
    "orderData.date": {
      $gte: new Date(`${currentYear}-01-01`),
      $lt: new Date(`${currentYear + 1}-01-01`),
    },
  };

  if (!foundUser.is_global) {
    matchStage["orderData.created_by"] = new MongooseTypes.ObjectId(userId);
  }

  const topCategories = await SaleOrderDetail.aggregate([
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
        total: { $sum: "$subtotal" },
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

  return topCategories as ISalesReportByCategory[];
};

export const reportSaleOrderByMonth = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISaleOrder[]> => {
  const foundUser: IUser | null = await User.findOne({
    _id: userId,
    company: companyId,
  });

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );

  const filter: any = {
    company: companyId,
    date: {
      $gte: startOfMonth,
      $lte: endOfMonth,
    },
    status: saleOrderStatus.APROBADO,
  };

  if (!foundUser.is_global) {
    filter.created_by = userId;
  }

  return await SaleOrder.find(filter)
    .sort({ date: -1 }) // Ordena por fecha de manera descendente (más recientes primero)
    .limit(10) // Limita a las últimas 10 ventas
    .populate("client")
    .populate("created_by") // Llenar información del cliente
    .lean<ISaleOrder[]>();
};
