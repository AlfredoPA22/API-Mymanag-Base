import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { IGeneralData } from "../../interfaces/home.interface";
import {
  FilterProductInput,
  IPreviewProductImport,
  IProduct,
  ProductInput,
  UpdateProductInput,
} from "../../interfaces/product.interface";
import { IProductInventory } from "../../interfaces/productInventory.interface";
import {
  IProductSerial,
  ProductSerialInput,
} from "../../interfaces/productSerial.interface";
import { ISaleOrder } from "../../interfaces/saleOrder.interface";
import { IUser } from "../../interfaces/user.interface";
import { codeType } from "../../utils/enums/orderType.enum";
import { productSerialStatus } from "../../utils/enums/productSerialStatus.enum";
import { productStatus } from "../../utils/enums/productStatus.enum";
import { saleOrderStatus } from "../../utils/enums/saleOrderStatus.enum";
import { paymentMethod } from "../../utils/enums/saleOrderPaymentMethod";
import {
  addCount as addCountBrand,
  subtractCount as subtractCountBrand,
} from "../brand/brand.service";
import {
  addCount as addCountCategory,
  subtractCount as subtractCountCategory,
} from "../category/category.service";
import { generate, increment } from "../codeGenerator/codeGenerator.service";
import { CodeGenerator } from "../codeGenerator/codeGenerator.model";
import { PurchaseOrderDetail } from "../purchase_order/purchase_order_detail.model";
import { ProductTransferDetail } from "../product_transfer/product_transfer_detail.model";
import { SaleOrder } from "../sale_order/sale_order.model";
import { SaleOrderDetail } from "../sale_order/sale_order_detail.model";
import { SalePayment } from "../sale_payment/sale_payment.model";
import { User } from "../user/user.model";
import { Product } from "./product.model";
import { ProductInventory } from "./product_inventory.model";
import { ProductSerial } from "./product_serial.model";
import { Company } from "../company/company.model";
import { companyPlanLimits } from "../../utils/planLimits";
import { companyPlan, PLAN_LABELS } from "../../utils/enums/companyPlan.enum";
import { assertPlanLimit } from "../../utils/assertPlanLimit";
import { round2, toBaseCurrencyExpr, toOrderCurrency } from "../../utils/money";
import * as XLSX from "xlsx";
import { stockType } from "../../utils/enums/stockType.enum";
import { Brand } from "../brand/brand.model";
import { Category } from "../category/category.model";

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProduct[]> => {
  const products = await Product.find({
    company: companyId,
  })
    .populate("category")
    .populate("brand")
    .populate("company")
    .lean<IProduct[]>();

  return await attachAvailableStock(companyId, products);
};

// `stock` (el contador agregado en Product) no baja apenas algo queda
// reservado por otra venta en Borrador — para Individual porque
// ProductInventory.reserved/available cambian pero Product.stock no se toca
// hasta aprobar; para Serializado porque un serial pasa a status Reservado
// (ver addSerialToOrder) sin que Product.stock se decremente hasta aprobar.
// En ambos casos, "stock" puede seguir mostrando como libre algo que en
// realidad ya está comprometido en otra nota. Se calcula el disponible real
// en una sola agregación por tipo (no una query por producto) y se adjunta
// como available_stock, sin tocar `stock`.
const attachAvailableStock = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  products: IProduct[]
): Promise<IProduct[]> => {
  const companyObjectId = new MongooseTypes.ObjectId(companyId.toString());
  const individualIds = products
    .filter((p) => p.stock_type === stockType.INDIVIDUAL)
    .map((p) => p._id);
  const serializadoIds = products
    .filter((p) => p.stock_type === stockType.SERIALIZADO)
    .map((p) => p._id);

  if (individualIds.length === 0 && serializadoIds.length === 0) return products;

  const [availableByInventory, availableBySerial] = await Promise.all([
    individualIds.length === 0
      ? []
      : ProductInventory.aggregate([
          { $match: { company: companyObjectId, product: { $in: individualIds } } },
          { $group: { _id: "$product", available: { $sum: "$available" } } },
        ]),
    serializadoIds.length === 0
      ? []
      : ProductSerial.aggregate([
          {
            $match: {
              company: companyObjectId,
              product: { $in: serializadoIds },
              status: productSerialStatus.DISPONIBLE,
            },
          },
          { $group: { _id: "$product", available: { $sum: 1 } } },
        ]),
  ]);

  const availableMap = new Map<string, number>();
  for (const row of [...availableByInventory, ...availableBySerial]) {
    availableMap.set(row._id.toString(), row.available);
  }

  return products.map((p) =>
    p.stock_type === stockType.INDIVIDUAL || p.stock_type === stockType.SERIALIZADO
      ? { ...p, available_stock: availableMap.get(p._id.toString()) ?? 0 }
      : p
  );
};

export const listLowStockProduct = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProduct[]> => {
  return await Product.find({
    company: companyId,
    $or: [
      { $expr: { $lt: ["$stock", "$min_stock"] } },
      { stock: { $lte: 0 } },
    ],
  })
    .populate("category")
    .populate("brand")
    .populate("company")
    .lean<IProduct[]>();
};

export const productReport = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  filterProductInput: FilterProductInput
): Promise<IProduct[]> => {
  const query: any = { company: companyId };
  if (filterProductInput.category) {
    query.category = filterProductInput.category;
  }
  if (filterProductInput.brand) {
    query.brand = filterProductInput.brand;
  }
  if (filterProductInput.status && filterProductInput.status !== "Todos") {
    query.status = filterProductInput.status;
  }

  const listProduct = await Product.find(query)
    .populate("category")
    .populate("brand")
    .populate("company")
    .lean<IProduct[]>();

  return listProduct;
};

export const findAllWithParams = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  categoryId?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  brandId?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  warehouseId?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProduct[]> => {
  if (!categoryId && !brandId && !warehouseId) {
    throw new Error(
      "Debe proporcionar al menos un parámetro: categoria, marca o almacén"
    );
  }

  let filter: any = { company: companyId };

  if (categoryId) filter.category = categoryId;
  if (brandId) filter.brand = brandId;

  let productIdsByWarehouse: MongooseTypes.ObjectId[] = [];

  if (warehouseId) {
    // Obtener TODOS los productos serializados en ese almacén (sin filtrar por estado)
    const serialProducts = await ProductSerial.distinct("product", {
      warehouse: warehouseId,
    });

    // Obtener los productos de inventario en ese almacén
    const inventoryProducts = await ProductInventory.distinct("product", {
      warehouse: warehouseId,
    });

    // Unir los productos de seriales e inventario y eliminar duplicados
    productIdsByWarehouse = [
      ...new Set([...serialProducts, ...inventoryProducts]),
    ];

    // Asegurarse de filtrar solo los productos que existen en el almacén
    filter._id = { $in: productIdsByWarehouse };
  }

  const products = await Product.find(filter)
    .populate("category")
    .populate("brand")
    .populate("company")
    .lean<IProduct[]>();

  if (!warehouseId) return products;

  const productIds = products.map((p) => p._id);

  // $match de una agregación NO castea strings a ObjectId como sí hace
  // .find() — hay que convertir explícitamente (mismo patrón que
  // attachAvailableStock), si no la comparación nunca matchea y todo da 0.
  const companyObjectId = new MongooseTypes.ObjectId(companyId.toString());
  const warehouseObjectId = new MongooseTypes.ObjectId(warehouseId.toString());

  // Stock por producto en ese almacén: se suma porque puede haber varios
  // ProductInventory por almacén/producto (uno por lote de compra o por
  // transferencia aprobada) — un solo findOne agarraría el lote
  // equivocado, igual que el bug ya corregido en la búsqueda de POS.
  // `stock` = todo lo que está físicamente ahí (disponible + reservado en
  // ventas pendientes de aprobar); `available_stock` = lo que de verdad se
  // puede vender ahora mismo. Se muestran ambos porque lo reservado sigue
  // en el almacén, no se fue a ningún lado, solo que ya está comprometido.
  const [inventoryTotals, serialTotals] = await Promise.all([
    ProductInventory.aggregate([
      { $match: { company: companyObjectId, product: { $in: productIds }, warehouse: warehouseObjectId } },
      { $group: { _id: "$product", available: { $sum: "$available" }, reserved: { $sum: "$reserved" } } },
    ]),
    ProductSerial.aggregate([
      {
        $match: {
          company: companyObjectId,
          product: { $in: productIds },
          warehouse: warehouseObjectId,
          status: { $in: [productSerialStatus.DISPONIBLE, productSerialStatus.RESERVADO] },
        },
      },
      { $group: { _id: { product: "$product", status: "$status" }, count: { $sum: 1 } } },
    ]),
  ]);

  const stockMap = new Map<string, number>();
  const availableMap = new Map<string, number>();
  for (const row of inventoryTotals) {
    const key = row._id.toString();
    availableMap.set(key, (availableMap.get(key) ?? 0) + row.available);
    stockMap.set(key, (stockMap.get(key) ?? 0) + row.available + row.reserved);
  }
  for (const row of serialTotals) {
    const key = row._id.product.toString();
    stockMap.set(key, (stockMap.get(key) ?? 0) + row.count);
    if (row._id.status === productSerialStatus.DISPONIBLE) {
      availableMap.set(key, (availableMap.get(key) ?? 0) + row.count);
    }
  }

  return products.map((product) => ({
    ...product,
    stock: stockMap.get(product._id.toString()) ?? 0,
    available_stock: availableMap.get(product._id.toString()) ?? 0,
  }));
};

export const findProduct = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  productId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProduct> => {
  const product = await Product.findOne({
    _id: productId,
    company: companyId,
  })
    .populate("brand")
    .populate("category")
    .populate("company")
    .lean<IProduct>();

  if (!product) {
    throw new Error("No existe el producto");
  }

  const [withAvailableStock] = await attachAvailableStock(companyId, [product]);
  return withAvailableStock;
};

export const listProductSerialByPurchaseOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  purchaseOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProductSerial[]> => {
  const listSerial = await ProductSerial.find({
    company: companyId,
    purchase_order_detail: purchaseOrderDetailId,
  })
    .populate("product")
    .populate("purchase_order_detail")
    .populate("warehouse")
    .populate("company")
    .lean<IProductSerial[]>();

  return listSerial;
};

export const listProductSerialBySaleOrder = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  saleOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProductSerial[]> => {
  const listSerial = await ProductSerial.find({
    company: companyId,
    sale_order_detail: saleOrderDetailId,
  })
    .populate("product")
    .populate("sale_order_detail")
    .populate("warehouse")
    .populate("company")
    .lean<IProductSerial[]>();

  return listSerial;
};

export const listProductSerialByProduct = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  productId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProductSerial[]> => {
  const listSerial = await ProductSerial.find({
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
    .lean<IProductSerial[]>();

  return listSerial;
};

export const listProductInventoryByProduct = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  productId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProductInventory[]> => {
  const listProduct = await ProductInventory.find({
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
    .lean<IProductInventory[]>();

  return listProduct;
};

export const searchProduct = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  argument: string,
  // Al leer un serial (lector físico + Enter, o cámara) el dato tiene que
  // matchear un serial exacto — nada de caer al fallback difuso de
  // nombre/código de acá abajo, que agarraría cualquier texto parecido.
  exact?: boolean,
  // Almacén de cabecera de la nota (si tiene) — si el serial escaneado
  // pertenece a otro almacén, se corta acá antes de crear ningún detalle.
  warehouseId?: string
): Promise<IProduct> => {
  const foundProductSerial: IProductSerial | null = await ProductSerial.findOne(
    {
      company: companyId,
      serial: argument,
    }
  );

  if (foundProductSerial) {
    // Un serial exacto solo sirve para agregar/seleccionar si de verdad está
    // libre — si ya está Vendido/Reservado/Borrador, no tiene sentido dejar
    // pasar el producto (addSerialToOrder lo va a rechazar igual, pero para
    // entonces el detalle ya se creó sin serial).
    if (exact && foundProductSerial.status === productSerialStatus.VENDIDO) {
      throw new Error("Este serial ya fue vendido");
    }
    if (exact && foundProductSerial.status === productSerialStatus.RESERVADO) {
      throw new Error("Este serial está reservado en otra venta");
    }
    if (exact && foundProductSerial.status === productSerialStatus.BORRADOR) {
      throw new Error("Este serial no está disponible");
    }
    if (
      exact &&
      warehouseId &&
      foundProductSerial.warehouse.toString() !== warehouseId
    ) {
      throw new Error("Este serial pertenece a otro almacén");
    }

    const product = await Product.findOne({
      _id: foundProductSerial.product,
      company: companyId,
    })
      .populate("brand")
      .populate("category")
      .populate("company")
      .lean<IProduct | null>();

    if (!product) {
      throw new Error("Producto no encontrado");
    }

    return product;
  }

  if (exact) {
    throw new Error("No se encontró ningún producto con ese serial");
  }

  const product: IProduct | null = await Product.findOne({
    company: companyId,
    $or: [
      { name: { $regex: argument, $options: "i" } },
      { code: { $regex: argument, $options: "i" } },
    ],
  })
    .populate("brand")
    .populate("category")
    .populate("company")
    .lean<IProduct>();

  if (!product) {
    throw new Error(
      "No se encontró ningún producto con ese nombre, código o serial"
    );
  }

  return product;
};

// Dado solo el string de un serial, devuelve el ProductSerial con su
// almacén — usado por el frontend cuando searchProduct/addSerialToOrder
// rechazan un serial por estar en otro almacén, para saber cuál es ese
// almacén y ofrecer transferirlo (no hay otra forma de saberlo, ya que un
// error de GraphQL solo trae un mensaje de texto).
export const findProductSerialBySerial = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  serial: string
): Promise<IProductSerial | null> => {
  return await ProductSerial.findOne({
    company: companyId,
    serial,
  })
    .populate("warehouse")
    .populate("product")
    .lean<IProductSerial | null>();
};

export const generalData = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  startDate?: Date | string,
  endDate?: Date | string
): Promise<IGeneralData> => {
  const foundUser: IUser | null = await User.findOne({
    _id: userId,
    company: companyId,
  });
  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const currentYear = new Date().getFullYear();
  const dateFrom = startDate
    ? new Date(startDate)
    : new Date(`${currentYear}-01-01T00:00:00.000`);
  const dateTo = endDate
    ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })()
    : new Date(`${currentYear + 1}-01-01T00:00:00.000`);

  const total_products_number: number = await Product.countDocuments({
    company: companyId,
  });

  const total_products_low: number = await Product.countDocuments({
    company: companyId,
    $or: [
      { $expr: { $lt: ["$stock", "$min_stock"] } },
      { stock: { $lte: 0 } },
    ],
  });

  const totalStock = await Product.aggregate([
    {
      $match: {
        company: new MongooseTypes.ObjectId(`${companyId}`),
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$stock" },
      },
    },
  ]);

  const stock: number = totalStock.length > 0 ? totalStock[0].total : 0;

  const mostSoldProduct = await SaleOrderDetail.aggregate([
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
        "order.status": saleOrderStatus.APROBADO,
        "order.company": new MongooseTypes.ObjectId(`${companyId}`),
        "order.date": { $gte: dateFrom, $lte: dateTo },
        ...(foundUser.is_global
          ? {}
          : { "order.created_by": new MongooseTypes.ObjectId(`${userId}`) }),
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

  const best_product =
    mostSoldProduct.length > 0 ? mostSoldProduct[0].product : null;
  const best_product_sales_number =
    mostSoldProduct.length > 0 ? mostSoldProduct[0].totalSold : 0;

  const total_sales_number: number = await SaleOrder.countDocuments({
    company: companyId,
    status: saleOrderStatus.APROBADO,
    date: { $gte: dateFrom, $lte: dateTo },
    ...(foundUser.is_global ? {} : { created_by: userId }),
  });

  const total_sales_value_aggregate = await SaleOrder.aggregate([
    {
      $match: {
        company: new MongooseTypes.ObjectId(`${companyId}`),
        status: saleOrderStatus.APROBADO,
        date: { $gte: dateFrom, $lte: dateTo },
        ...(foundUser.is_global
          ? {}
          : { created_by: new MongooseTypes.ObjectId(`${userId}`) }),
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: toBaseCurrencyExpr("$total", "$currency", "$exchange_rate") },
      },
    },
  ]);

  const total_sales_value: number =
    total_sales_value_aggregate.length > 0
      ? round2(total_sales_value_aggregate[0].total)
      : 0;

  // "Por cobrar" es el saldo pendiente ACTUAL, no algo limitado al período
  // seleccionado en el dashboard — una venta a crédito de hace dos meses que
  // sigue sin pagarse debe seguir contando como pendiente hoy. Por eso este
  // match NO filtra por `date`, a diferencia del resto de las métricas del
  // header (que sí son "de este período"). Así coincide con Pagos, que
  // tampoco filtra por fecha por defecto.
  const creditPendingMatch: any = {
    company: new MongooseTypes.ObjectId(`${companyId}`),
    status: saleOrderStatus.APROBADO,
    payment_method: paymentMethod.CREDITO,
    is_paid: false,
    ...(foundUser.is_global ? {} : { created_by: new MongooseTypes.ObjectId(`${userId}`) }),
  };

  // Las notas a crédito y sus pagos pueden estar cada uno en una moneda
  // distinta (nota en $ pagada parcialmente en Bs, etc.) — el pendiente de
  // cada nota se calcula en JS con toOrderCurrency(), el mismo patrón que
  // usa salePayment.service.ts para el saldo de una nota. En vez de
  // convertir todo a una sola moneda (lo que confunde: "¿es lo mismo pero
  // en otra moneda?"), se separa el pendiente en dos totales — uno por cada
  // moneda en la que realmente están las notas — igual que en PaymentList.
  const creditPendingOrders = await SaleOrder.find(creditPendingMatch).lean<ISaleOrder[]>();
  const creditPendingPayments = await SalePayment.find({
    sale_order: { $in: creditPendingOrders.map((o) => o._id) },
  }).lean();

  const paymentsByOrder = new Map<string, typeof creditPendingPayments>();
  for (const payment of creditPendingPayments) {
    const key = (payment as any).sale_order.toString();
    if (!paymentsByOrder.has(key)) paymentsByOrder.set(key, []);
    paymentsByOrder.get(key)!.push(payment);
  }

  let total_credit_pending = 0;
  let total_credit_pending_bs = 0;
  for (const order of creditPendingOrders) {
    const orderCurrency = order.currency ?? company.currency;
    const payments = paymentsByOrder.get((order as any)._id.toString()) ?? [];
    const totalPaidInOrderCurrency = payments.reduce(
      (sum, p: any) =>
        sum + toOrderCurrency(p.amount, p.currency, p.exchange_rate, company.currency, orderCurrency),
      0
    );
    const pendingInOrderCurrency = Math.max(order.total - totalPaidInOrderCurrency, 0);
    // OJO: se compara `order.currency` (el campo crudo) y no `orderCurrency`
    // (que ya cae a company.currency cuando es null). Una empresa que opera
    // en Bs tiene `order.currency` null en TODAS sus notas — usar la versión
    // resuelta mandaría todo su pendiente al bucket "_bs" por error.
    if (order.currency === "Bs") {
      total_credit_pending_bs += pendingInOrderCurrency;
    } else {
      total_credit_pending += pendingInOrderCurrency;
    }
  }
  total_credit_pending = round2(total_credit_pending);
  total_credit_pending_bs = round2(total_credit_pending_bs);
  const total_credit_pending_count: number = creditPendingOrders.length;

  // Igual que el pendiente: cada pago queda en su propia moneda, así que se
  // agrupan por moneda en vez de convertirse a una sola — para que "Cobrado"
  // muestre la misma info que "Por cobrar" en cada tarjeta.
  const creditCollectedAgg = await SalePayment.aggregate([
    {
      $match: {
        company: new MongooseTypes.ObjectId(`${companyId}`),
        date: { $gte: dateFrom, $lte: dateTo },
        ...(foundUser.is_global ? {} : { created_by: new MongooseTypes.ObjectId(`${userId}`) }),
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
    if (row._id === "Bs") total_credit_collected_bs = round2(row.total);
    else total_credit_collected = round2(row.total);
  }

  const response: IGeneralData = {
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

export const createProduct = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  createProductInput: ProductInput
) => {
  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const productCount = await Product.countDocuments({ company: companyId });
  const planLimits = companyPlanLimits[company.plan as companyPlan];

  assertPlanLimit(company.plan as companyPlan, "productos", productCount, planLimits.maxProduct);

  const productNameValidation = await Product.findOne({
    company: companyId,
    name: createProductInput.name,
  });

  if (productNameValidation) {
    throw new Error("El producto ya existe");
  }

  if (
    createProductInput.min_stock !== undefined &&
    createProductInput.max_stock !== undefined &&
    createProductInput.min_stock > createProductInput.max_stock
  ) {
    throw new Error("El stock mínimo no puede ser mayor que el stock máximo");
  }

  if (
    createProductInput.min_sale_price != null &&
    createProductInput.sale_price != null &&
    createProductInput.min_sale_price > createProductInput.sale_price
  ) {
    throw new Error("El precio de venta mínimo no puede ser mayor que el precio de venta");
  }

  const customDataProduct: ProductInput = {
    code: createProductInput.code
      ? createProductInput.code
      : await generate(companyId, codeType.PRODUCT),
    name: createProductInput.name,
    description: createProductInput.description,
    image: createProductInput.image,
    images: createProductInput.images,
    show_in_store: createProductInput.show_in_store,
    sale_price: createProductInput.sale_price,
    min_sale_price: createProductInput.min_sale_price,
    store_price: createProductInput.store_price,
    store_discount_price: createProductInput.store_discount_price,
    category: createProductInput.category,
    brand: createProductInput.brand,
    stock_type: createProductInput.stock_type,
    min_stock: createProductInput.min_stock,
    max_stock: createProductInput.max_stock,
  };

  const newProduct = await (
    await Product.create({ ...customDataProduct, company: companyId })
  ).populate("category");

  await increment(companyId, codeType.PRODUCT);

  if (createProductInput.category) {
    await addCountCategory(createProductInput.category);
  }

  if (createProductInput.brand) {
    await addCountBrand(createProductInput.brand);
  }

  return newProduct;
};

export const createProductSerial = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  createProductSerialInput: ProductSerialInput
) => {
  const productSerialValidation = await ProductSerial.findOne({
    company: companyId,
    serial: createProductSerialInput.serial,
  });

  if (productSerialValidation) {
    throw new Error("El Serial ya existe");
  }

  const newProductSerial: IProductSerial = await (
    await (
      await ProductSerial.create({
        ...createProductSerialInput,
        company: companyId,
      })
    ).populate("product")
  ).populate("purchase_order_detail");

  return newProductSerial;
};

export const deleteProduct = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  productId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const findPurchase = await PurchaseOrderDetail.find({
    company: companyId,
    product: productId,
  });

  if (findPurchase.length > 0) {
    throw new Error("No se puede eliminar porque pertenece a una compra");
  }

  // Defensa adicional independiente del chequeo de arriba: si por algún otro
  // camino quedó inventario, seriales o una transferencia apuntando a este
  // producto sin que exista ya un PurchaseOrderDetail (ej. la compra que lo
  // originó se borró), no lo dejamos borrar igual — evita dejar esas
  // colecciones con una referencia a un producto inexistente.
  const [findInventory, findSerial, findTransferDetail] = await Promise.all([
    ProductInventory.findOne({ company: companyId, product: productId }),
    ProductSerial.findOne({ company: companyId, product: productId }),
    ProductTransferDetail.findOne({ company: companyId, product: productId }),
  ]);

  if (findInventory || findSerial || findTransferDetail) {
    throw new Error("No se puede eliminar porque tiene inventario, seriales o transferencias asociadas");
  }

  const product = await Product.findOne({ _id: productId, company: companyId });

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  const deleted = await Product.deleteOne({
    _id: productId,
    company: companyId,
  });

  if (deleted.deletedCount > 0) {
    if (product.brand) {
      await subtractCountBrand(product.brand);
    }

    if (product.category) {
      await subtractCountCategory(product.category);
    }
    return {
      success: true,
    };
  }
  return {
    success: false,
  };
};

export const update = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  productId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateProductInput: UpdateProductInput
) => {
  const existingProduct = await Product.findOne({
    _id: productId,
    company: companyId,
  });

  if (!existingProduct) {
    throw new Error("Producto no encontrado.");
  }

  if (updateProductInput.code !== existingProduct.code) {
    const codeExists = await Product.findOne({
      company: companyId,
      code: updateProductInput.code,
      _id: { $ne: productId },
    });

    if (codeExists) {
      throw new Error("Ya existe un producto con este código.");
    }
  }

  if (updateProductInput.name !== existingProduct.name) {
    const nameExists = await Product.findOne({
      company: companyId,
      name: updateProductInput.name,
      _id: { $ne: productId },
    });

    if (nameExists) {
      throw new Error("Ya existe un producto con este nombre.");
    }
  }

  const isStockTypeChanged =
    updateProductInput.stock_type !== existingProduct.stock_type;

  if (isStockTypeChanged) {
    const serialCount = await ProductSerial.countDocuments({
      company: companyId,
      product: productId,
    });
    const inventoryCount = await ProductInventory.countDocuments({
      company: companyId,
      product: productId,
    });
    // Una compra pendiente ya "decidió" cómo se va a manejar el stock de este
    // producto (serial vs. inventario por almacén) al momento de agregarlo.
    // Si se cambia el tipo después, esos detalles quedan desincronizados y la
    // compra no podrá aprobarse ("Faltan registros de inventario...").
    const purchaseOrderDetailCount = await PurchaseOrderDetail.countDocuments({
      company: companyId,
      product: productId,
    });

    if (serialCount > 0 || inventoryCount > 0 || purchaseOrderDetailCount > 0) {
      throw new Error(
        "No se puede cambiar el tipo de stock porque ya existen registros relacionados (compras, seriales o inventario)."
      );
    }
  }

  if (!updateProductInput.image) {
    updateProductInput.image = existingProduct.image;
  }

  if (
    updateProductInput.min_stock !== undefined &&
    updateProductInput.max_stock !== undefined &&
    updateProductInput.min_stock > updateProductInput.max_stock
  ) {
    throw new Error("El stock mínimo no puede ser mayor que el stock máximo.");
  }

  if (
    updateProductInput.min_sale_price != null &&
    updateProductInput.sale_price != null &&
    updateProductInput.min_sale_price > updateProductInput.sale_price
  ) {
    throw new Error("El precio de venta mínimo no puede ser mayor que el precio de venta.");
  }

  const brandChanged =
    updateProductInput.brand?.toString() !== existingProduct.brand.toString();
  const categoryChanged =
    updateProductInput.category?.toString() !==
    existingProduct.category.toString();

  const productUpdated = await Product.findOneAndUpdate(
    {
      _id: productId,
      company: companyId,
    },
    { $set: updateProductInput },
    { new: true }
  );

  if (!productUpdated) {
    throw new Error("Ocurrio un error al actualizar el producto.");
  }

  if (brandChanged) {
    if (existingProduct.brand)
      await subtractCountBrand(existingProduct.brand._id);
    if (productUpdated.brand) await addCountBrand(productUpdated.brand);
  }

  if (categoryChanged) {
    if (existingProduct.category)
      await subtractCountCategory(existingProduct.category._id);
    if (productUpdated.category)
      await addCountCategory(productUpdated.category);
  }

  return productUpdated;
};

export const previewImportProducts = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  file: File
): Promise<IPreviewProductImport[]> => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "buffer" });
  if (!workbook.SheetNames.length) {
    throw new Error("El archivo Excel no contiene ninguna hoja.");
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("El archivo está vacío o no contiene datos válidos.");
  }

  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const productCount = await Product.countDocuments({ company: companyId });
  const planLimits = companyPlanLimits[company.plan as companyPlan];

  if (
    planLimits.maxProduct &&
    productCount + data.length > planLimits.maxProduct
  ) {
    const planLabel = PLAN_LABELS[company.plan as companyPlan] ?? company.plan;
    const overLimitHint =
      productCount >= planLimits.maxProduct
        ? " (ya tenías más de lo que tu plan permite antes de esta importación, probablemente por un cambio de plan)"
        : "";
    throw new Error(
      `Tu plan actual (${planLabel}) solo permite hasta ${planLimits.maxProduct} productos. Ya tienes ${productCount} y estás intentando importar ${data.length}${overLimitHint}.`
    );
  }

  const existingProducts = await Product.find(
    { company: companyId },
    { code: 1, name: 1 }
  ).lean();

  const existingCodes = new Set(
    existingProducts.map((p) => p.code.toLowerCase())
  );
  const existingNames = new Set(
    existingProducts.map((p) => p.name.toLowerCase())
  );

  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();

  const preview: IPreviewProductImport[] = data.map(
    (row: any, index: number) => {
      const errors: string[] = [];

      const code = (row.code || "").trim();
      const name = (row.name || "").trim();

      if (code) {
        if (typeof code !== "string") {
          errors.push("Código inválido");
        } else {
          const lowerCode = code.toLowerCase();
          if (existingCodes.has(lowerCode)) {
            errors.push("El código ya existe");
          }
          if (seenCodes.has(lowerCode)) {
            errors.push("Código duplicado en la lista");
          } else {
            seenCodes.add(lowerCode);
          }
        }
      }

      if (!name || typeof name !== "string") {
        errors.push("Nombre inválido");
      } else {
        const lowerName = name.toLowerCase();
        if (existingNames.has(lowerName)) {
          errors.push("El nombre ya existe");
        }
        if (seenNames.has(lowerName)) {
          errors.push("Nombre duplicado en la lista");
        } else {
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

      if (
        ![stockType.INDIVIDUAL, stockType.SERIALIZADO].includes(row.stock_type)
      ) {
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

      // "Mostrar en tienda" — vacío se toma como "sí" (mismo default que el
      // schema de Product), igual que el resto de columnas opcionales.
      const rawShowInStore = String(row.show_in_store ?? "").trim().toLowerCase();
      const TRUE_VALUES = ["si", "sí", "true", "1", "x"];
      const FALSE_VALUES = ["no", "false", "0"];
      let show_in_store = true;
      if (rawShowInStore) {
        if (TRUE_VALUES.includes(rawShowInStore)) {
          show_in_store = true;
        } else if (FALSE_VALUES.includes(rawShowInStore)) {
          show_in_store = false;
        } else {
          errors.push('"Mostrar en tienda" inválido (usa si/no)');
        }
      }

      // Precio/descuento de tienda: opcionales — vacío queda en null, igual
      // que en el formulario manual de producto.
      let store_price: number | null = null;
      if (String(row.store_price ?? "").trim() !== "") {
        const parsed = Number(row.store_price);
        if (isNaN(parsed) || parsed < 0) {
          errors.push("Precio de tienda inválido");
        } else {
          store_price = parsed;
        }
      }

      let store_discount_price: number | null = null;
      if (String(row.store_discount_price ?? "").trim() !== "") {
        const parsed = Number(row.store_discount_price);
        if (isNaN(parsed) || parsed < 0) {
          errors.push("Precio de descuento de tienda inválido");
        } else {
          store_discount_price = parsed;
        }
      }

      if (
        store_price !== null &&
        store_discount_price !== null &&
        store_discount_price > store_price
      ) {
        errors.push("El precio de descuento de tienda no puede ser mayor al precio de tienda");
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
        show_in_store,
        store_price,
        store_discount_price,
        isValid: errors.length === 0,
        errors,
      };
    }
  );

  return preview;
};

// Antes hacía todo esto por FILA, secuencial (await adentro de un for...of):
// buscar/crear marca, buscar/crear categoría, contar productos de la empresa,
// buscar nombre duplicado, generar+persistir código, crear el producto,
// popular, incrementar contador de código, leer+escribir contador de marca y
// de categoría — ~15 round-trips a Mongo por fila. Con un Excel de varios
// cientos de filas eso es la causa directa de la lentitud reportada. Acá se
// resuelve todo en memoria una sola vez y se escribe en lotes (insertMany /
// bulkWrite), sin importar cuántas filas traiga el archivo.
export const saveImportProducts = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  dataProducts: IPreviewProductImport[]
) => {
  if (!dataProducts.length) {
    throw new Error("No hay productos para guardar.");
  }

  const allValid = dataProducts.every((p) => p.isValid);
  if (!allValid) {
    throw new Error("Algunos productos no son válidos. No se puede guardar.");
  }

  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const planLimits = companyPlanLimits[company.plan as companyPlan];
  const currentProductCount = await Product.countDocuments({ company: companyId });
  // Mismo chequeo que antes se hacía fila por fila dentro de createProduct —
  // acá se valida una sola vez para el lote completo.
  assertPlanLimit(
    company.plan as companyPlan,
    "productos",
    currentProductCount + dataProducts.length - 1,
    planLimits.maxProduct
  );

  // Revalida nombres duplicados justo antes de guardar (preview pudo haber
  // corrido hace rato) — una sola query en vez de una por fila.
  const existingByName = await Product.find(
    { company: companyId, name: { $in: dataProducts.map((p) => p.name) } },
    { name: 1 }
  ).lean();
  if (existingByName.length > 0) {
    throw new Error(
      `Ya existen productos con estos nombres: ${existingByName.map((p) => p.name).join(", ")}`
    );
  }

  // Precarga marcas y categorías existentes de la empresa — se resuelven en
  // memoria en vez de una consulta por fila.
  const [existingBrands, existingCategories] = await Promise.all([
    Brand.find({ company: companyId }).lean(),
    Category.find({ company: companyId }).lean(),
  ]);

  const brandMap = new Map<string, MongooseTypes.ObjectId>(
    existingBrands.map((b: any) => [String(b.name).trim().toLowerCase(), b._id])
  );
  const categoryMap = new Map<string, MongooseTypes.ObjectId>(
    existingCategories.map((c: any) => [String(c.name).trim().toLowerCase(), c._id])
  );

  const missingBrandNames = [
    ...new Set(
      dataProducts
        .map((p) => p.brand?.trim())
        .filter((n): n is string => !!n && !brandMap.has(n.toLowerCase()))
    ),
  ];
  const missingCategoryNames = [
    ...new Set(
      dataProducts
        .map((p) => p.category?.trim())
        .filter((n): n is string => !!n && !categoryMap.has(n.toLowerCase()))
    ),
  ];

  if (missingBrandNames.length > 0) {
    const created = await Brand.insertMany(
      missingBrandNames.map((name) => ({ name, company: companyId })),
      { ordered: false }
    );
    created.forEach((b: any) => brandMap.set(String(b.name).trim().toLowerCase(), b._id));
  }

  if (missingCategoryNames.length > 0) {
    const created = await Category.insertMany(
      missingCategoryNames.map((name) => ({ name, company: companyId })),
      { ordered: false }
    );
    created.forEach((c: any) => categoryMap.set(String(c.name).trim().toLowerCase(), c._id));
  }

  // Códigos: las filas que ya traen código explícito lo usan tal cual (ya
  // validado como único en el preview). Las que no, comparten un solo
  // contador — se reserva todo el rango de una — en vez de leer y escribir
  // el mismo documento contador dos veces por fila (generate() + increment()).
  const rowsNeedingCode = dataProducts.filter((p) => !p.code).length;
  let codeGeneratorDoc = await CodeGenerator.findOne({
    type: codeType.PRODUCT,
    company: companyId,
  });
  if (!codeGeneratorDoc && rowsNeedingCode > 0) {
    codeGeneratorDoc = await CodeGenerator.create({
      company: companyId,
      type: codeType.PRODUCT,
      code: "SKU_",
      sequence: "00000",
    });
  }

  let seq = codeGeneratorDoc ? parseInt(codeGeneratorDoc.sequence) : 0;
  const seqLength = codeGeneratorDoc?.sequence.length ?? 5;
  const codePrefix = codeGeneratorDoc?.code ?? "SKU_";

  const productsToInsert = dataProducts.map((p) => {
    let code = p.code;
    if (!code) {
      seq++;
      code = `${codePrefix}${seq.toString().padStart(seqLength, "0")}`;
    }

    const brandId = p.brand ? brandMap.get(p.brand.trim().toLowerCase()) : undefined;
    const categoryId = p.category ? categoryMap.get(p.category.trim().toLowerCase()) : undefined;

    if (!brandId || !categoryId) {
      throw new Error(`Fila ${p.row}: no se pudo resolver la marca o categoría`);
    }

    return {
      code,
      name: p.name,
      description: p.description,
      show_in_store: p.show_in_store,
      sale_price: p.sale_price,
      store_price: p.store_price,
      store_discount_price: p.store_discount_price,
      category: categoryId,
      brand: brandId,
      stock_type: p.stock_type as stockType,
      min_stock: p.min_stock,
      max_stock: p.max_stock,
      company: companyId,
    };
  });

  if (rowsNeedingCode > 0 && codeGeneratorDoc) {
    await CodeGenerator.updateOne(
      { _id: codeGeneratorDoc._id },
      { sequence: seq.toString().padStart(seqLength, "0") }
    );
  }

  const createdProducts = await Product.insertMany(productsToInsert, { ordered: false });

  // Conteo de productos por marca/categoría — un $inc atómico por marca y
  // por categoría (bulkWrite), en vez de leer+escribir cada documento una
  // vez por producto (lo que además no era atómico).
  const brandCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const p of productsToInsert) {
    brandCounts.set(String(p.brand), (brandCounts.get(String(p.brand)) ?? 0) + 1);
    categoryCounts.set(String(p.category), (categoryCounts.get(String(p.category)) ?? 0) + 1);
  }

  await Promise.all([
    brandCounts.size > 0
      ? Brand.bulkWrite(
          [...brandCounts.entries()].map(([id, count]) => ({
            updateOne: { filter: { _id: id }, update: { $inc: { count_product: count } } },
          }))
        )
      : Promise.resolve(),
    categoryCounts.size > 0
      ? Category.bulkWrite(
          [...categoryCounts.entries()].map(([id, count]) => ({
            updateOne: { filter: { _id: id }, update: { $inc: { count_product: count } } },
          }))
        )
      : Promise.resolve(),
  ]);

  return createdProducts;
};

// Genera el .xlsx de plantilla al vuelo con las columnas que la importación
// soporta hoy — antes era un archivo estático subido a mano a Cloudinary,
// que quedaba desactualizado cada vez que se agregaba una columna nueva acá.
export const generateProductImportTemplate = (): Buffer => {
  const headers = [
    "code",
    "name",
    "description",
    "sale_price",
    "brand",
    "category",
    "stock_type",
    "min_stock",
    "max_stock",
    "show_in_store",
    "store_price",
    "store_discount_price",
  ];

  const exampleRows = [
    {
      code: "",
      name: "Mouse Logitech G502 HERO",
      description: "Mouse gaming con sensor HERO 25K",
      sale_price: 45.9,
      brand: "Logitech",
      category: "Periféricos",
      stock_type: "individual",
      min_stock: 5,
      max_stock: 40,
      show_in_store: "si",
      store_price: "",
      store_discount_price: "",
    },
    {
      code: "",
      name: "Laptop Dell Inspiron 15 3000",
      description: "i5, 8GB RAM, 256GB SSD",
      sale_price: 520,
      brand: "Dell",
      category: "Laptops",
      stock_type: "serializado",
      min_stock: 1,
      max_stock: 10,
      show_in_store: "no",
      store_price: "",
      store_discount_price: "",
    },
  ];

  const sheet = XLSX.utils.json_to_sheet(exampleRows, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Productos");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

// Exporta todos los productos de la empresa a .xlsx — mismas columnas que la
// plantilla de importación (para poder editar y reimportar) más algunas de
// solo lectura (stock actual, último costo, estado) que no se pueden
// importar pero sirven para un reporte/respaldo completo.
export const exportProducts = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<Buffer> => {
  const products = await Product.find({ company: companyId })
    .populate("brand")
    .populate("category")
    .sort({ name: 1 })
    .lean<IProduct[]>();

  const headers = [
    "code",
    "name",
    "description",
    "sale_price",
    "brand",
    "category",
    "stock_type",
    "min_stock",
    "max_stock",
    "show_in_store",
    "store_price",
    "store_discount_price",
    "stock",
    "last_cost_price",
    "status",
  ];

  const rows = products.map((p: any) => ({
    code: p.code,
    name: p.name,
    description: p.description,
    sale_price: p.sale_price,
    brand: p.brand?.name ?? "",
    category: p.category?.name ?? "",
    stock_type: p.stock_type,
    min_stock: p.min_stock,
    max_stock: p.max_stock,
    show_in_store: p.show_in_store ? "si" : "no",
    store_price: p.store_price ?? "",
    store_discount_price: p.store_discount_price ?? "",
    stock: p.stock,
    last_cost_price: p.last_cost_price,
    status: p.status,
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Productos");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};
