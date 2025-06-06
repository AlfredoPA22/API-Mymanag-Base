import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { IGeneralData } from "../../interfaces/home.interface";
import {
  FilterProductInput,
  IProduct,
  ProductInput,
  UpdateProductInput,
} from "../../interfaces/product.interface";
import { IProductInventory } from "../../interfaces/productInventory.interface";
import {
  IProductSerial,
  ProductSerialInput,
} from "../../interfaces/productSerial.interface";
import { IUser } from "../../interfaces/user.interface";
import { codeType } from "../../utils/enums/orderType.enum";
import { productSerialStatus } from "../../utils/enums/productSerialStatus.enum";
import { productStatus } from "../../utils/enums/productStatus.enum";
import { saleOrderStatus } from "../../utils/enums/saleOrderStatus.enum";
import {
  addCount as addCountBrand,
  subtractCount as subtractCountBrand,
} from "../brand/brand.service";
import {
  addCount as addCountCategory,
  subtractCount as subtractCountCategory,
} from "../category/category.service";
import { generate, increment } from "../codeGenerator/codeGenerator.service";
import { PurchaseOrderDetail } from "../purchase_order/purchase_order_detail.model";
import { SaleOrder } from "../sale_order/sale_order.model";
import { SaleOrderDetail } from "../sale_order/sale_order_detail.model";
import { User } from "../user/user.model";
import { Product } from "./product.model";
import { ProductInventory } from "./product_inventory.model";
import { ProductSerial } from "./product_serial.model";
import { Company } from "../company/company.model";
import { companyPlanLimits } from "../../utils/planLimits";
import { companyPlan } from "../../utils/enums/companyPlan.enum";

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProduct[]> => {
  return await Product.find({
    company: companyId,
  })
    .populate("category")
    .populate("brand")
    .populate("company")
    .lean<IProduct[]>();
};

export const listLowStockProduct = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProduct[]> => {
  return await Product.find({
    company: companyId,
    $expr: { $lt: ["$stock", "$min_stock"] },
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

  // Mapear productos con stock específico en ese almacén
  const updatedProducts = await Promise.all(
    products.map(async (product) => {
      // Stock de inventario (no serializados)
      const inventory = await ProductInventory.findOne({
        company: companyId,
        product: product._id,
        warehouse: warehouseId,
      });

      // Stock de productos serializados (solo los DISPONIBLES)
      const serialCount = await ProductSerial.countDocuments({
        company: companyId,
        product: product._id,
        warehouse: warehouseId,
        status: productSerialStatus.DISPONIBLE, // Solo contar seriales DISPONIBLES
      });

      // Calcular el stock total sumando inventarios y seriales DISPONIBLES
      const stockTotal = (inventory?.quantity || 0) + serialCount;

      return {
        ...product,
        stock: stockTotal,
      };
    })
  );

  return updatedProducts;
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

  return product;
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
  argument: string
): Promise<IProduct> => {
  const foundProductSerial: IProductSerial | null = await ProductSerial.findOne(
    {
      company: companyId,
      serial: argument,
    }
  );

  if (foundProductSerial) {
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

export const generalData = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IGeneralData> => {
  const foundUser: IUser | null = await User.findOne({
    _id: userId,
    company: companyId,
  });
  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const total_products_number: number = await Product.countDocuments({
    company: companyId,
  });

  const total_products_low: number = await Product.countDocuments({
    company: companyId,
    $expr: { $lt: ["$stock", "$min_stock"] },
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
    ...(foundUser.is_global ? {} : { created_by: userId }),
  });

  const total_sales_value_aggregate = await SaleOrder.aggregate([
    {
      $match: {
        company: new MongooseTypes.ObjectId(`${companyId}`),
        status: saleOrderStatus.APROBADO,
        ...(foundUser.is_global
          ? {}
          : { created_by: new MongooseTypes.ObjectId(`${userId}`) }),
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$total" },
      },
    },
  ]);

  const total_sales_value: number =
    total_sales_value_aggregate.length > 0
      ? total_sales_value_aggregate[0].total
      : 0;

  const response: IGeneralData = {
    best_product,
    stock,
    total_products_number,
    total_products_low,
    total_sales_number,
    total_sales_value,
    best_product_sales_number,
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

  if (planLimits.maxProduct && productCount >= planLimits.maxProduct) {
    throw new Error(
      `Tu plan actual (${company.plan}) solo permite hasta ${planLimits.maxProduct} productos`
    );
  }

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

  const customDataProduct: ProductInput = {
    code: createProductInput.code
      ? createProductInput.code
      : await generate(companyId, codeType.PRODUCT),
    name: createProductInput.name,
    description: createProductInput.description,
    image: createProductInput.image,
    sale_price: createProductInput.sale_price,
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

    if (serialCount > 0 || inventoryCount > 0) {
      throw new Error(
        "No se puede cambiar el tipo de stock porque ya existen registros relacionados."
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
