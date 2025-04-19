import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { IGeneralData } from "../../interfaces/home.interface";
import {
  FilterProductInput,
  IProduct,
  ProductInput,
  UpdateProductInput,
} from "../../interfaces/product.interface";
import {
  IProductSerial,
  ProductSerialInput,
} from "../../interfaces/productSerial.interface";
import { codeType } from "../../utils/enums/orderType.enum";
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
import { Product } from "./product.model";
import { ProductSerial } from "./product_serial.model";
import { IProductInventory } from "../../interfaces/productInventory.interface";
import { ProductInventory } from "./product_inventory.model";
import { IUser } from "../../interfaces/user.interface";
import { User } from "../user/user.model";

export const findAll = async (): Promise<IProduct[]> => {
  const listProduct = await Product.find()
    .populate("category")
    .populate("brand")
    .lean<IProduct[]>();

  return listProduct;
};

export const productReport = async (
  filterProductInput: FilterProductInput
): Promise<IProduct[]> => {
  const query: any = {};
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
    .lean<IProduct[]>();

  return listProduct;
};

export const findAllWithParams = async (
  categoryId?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  brandId?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  warehouseId?: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProduct[]> => {
  if (!categoryId && !brandId && !warehouseId) {
    throw new Error(
      "Debe proporcionar al menos un parámetro: categoria, marca o almacén"
    );
  }

  let filter: any = {};

  if (categoryId) filter.category = categoryId;
  if (brandId) filter.brand = brandId;

  let productIdsByWarehouse:
    | MongooseSchema.Types.ObjectId
    | MongooseTypes.ObjectId[] = [];

  if (warehouseId) {
    const serialProducts = await ProductSerial.distinct("product", {
      warehouse: warehouseId,
    });

    const inventoryProducts = await ProductInventory.distinct("product", {
      warehouse: warehouseId,
    });

    productIdsByWarehouse = [
      ...new Set([...serialProducts, ...inventoryProducts]),
    ];

    filter._id = { $in: productIdsByWarehouse };
  }

  const products = await Product.find(filter)
    .populate("category")
    .populate("brand")
    .lean<IProduct[]>();

  if (!warehouseId) return products;

  // Mapear productos con stock específico del almacén
  const updatedProducts = await Promise.all(
    products.map(async (product) => {
      // Stock de inventario (no serializados)
      const inventory = await ProductInventory.findOne({
        product: product._id,
        warehouse: warehouseId,
      });

      // Stock de productos serializados
      const serialCount = await ProductSerial.countDocuments({
        product: product._id,
        warehouse: warehouseId,
      });

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
  productId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProduct> => {
  const product: IProduct = await Product.findById(productId)
    .populate("brand")
    .populate("category")
    .lean<IProduct>();

  if (!product) {
    throw new Error("No existe el producto");
  }

  return product;
};

export const listProductSerialByPurchaseOrder = async (
  purchaseOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProductSerial[]> => {
  const listSerial = await ProductSerial.find({
    purchase_order_detail: purchaseOrderDetailId,
  })
    .populate("product")
    .populate("purchase_order_detail")
    .populate("warehouse")
    .lean<IProductSerial[]>();

  return listSerial;
};

export const listProductSerialBySaleOrder = async (
  saleOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProductSerial[]> => {
  const listSerial = await ProductSerial.find({
    sale_order_detail: saleOrderDetailId,
  })
    .populate("product")
    .populate("sale_order_detail")
    .populate("warehouse")
    .lean<IProductSerial[]>();

  return listSerial;
};

export const listProductSerialByProduct = async (
  productId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProductSerial[]> => {
  const listSerial = await ProductSerial.find({
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
    .lean<IProductSerial[]>();

  return listSerial;
};

export const listProductInventoryByProduct = async (
  productId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProductInventory[]> => {
  const listProduct = await ProductInventory.find({
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
    .lean<IProductInventory[]>();

  return listProduct;
};

export const searchProduct = async (argument: string): Promise<IProduct> => {
  const foundProductSerial: IProductSerial | null = await ProductSerial.findOne(
    {
      serial: argument,
    }
  );

  if (foundProductSerial) {
    const product: IProduct = await Product.findById(foundProductSerial.product)
      .populate("brand")
      .populate("category")
      .lean<IProduct>();

    return product;
  }

  const product: IProduct | null = await Product.findOne({
    $or: [
      { name: { $regex: argument, $options: "i" } },
      { code: { $regex: argument, $options: "i" } },
    ],
  })
    .populate("brand")
    .populate("category")
    .lean<IProduct>();

  if (!product) {
    throw new Error(
      "No se encontró ningún producto con ese nombre, código o serial"
    );
  }

  return product;
};

export const generalData = async (
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IGeneralData> => {
  const foundUser: IUser | null = await User.findById(userId);
  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const total_products_number: number = await Product.countDocuments();

  const total_products_out: number = await Product.countDocuments({
    status: productStatus.SIN_STOCK,
  });

  const totalStock = await Product.aggregate([
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
    status: saleOrderStatus.APROBADO,
    ...(foundUser.is_global ? {} : { created_by: userId }),
  });

  const total_sales_value_aggregate = await SaleOrder.aggregate([
    {
      $match: {
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
    total_products_out,
    total_sales_number,
    total_sales_value,
    best_product_sales_number,
  };

  return response;
};

export const createProduct = async (createProductInput: ProductInput) => {
  const productNameValidation = await Product.findOne({
    name: createProductInput.name,
  });

  if (productNameValidation) {
    throw new Error("El producto ya existe");
  }

  const customDataProduct: ProductInput = {
    code: createProductInput.code
      ? createProductInput.code
      : await generate(codeType.PRODUCT),
    name: createProductInput.name,
    description: createProductInput.description,
    image: createProductInput.image,
    sale_price: createProductInput.sale_price,
    category: createProductInput.category,
    brand: createProductInput.brand,
    stock_type: createProductInput.stock_type,
  };

  const newProduct = await (
    await Product.create(customDataProduct)
  ).populate("category");

  await increment(codeType.PRODUCT);

  if (createProductInput.category) {
    await addCountCategory(createProductInput.category);
  }

  if (createProductInput.brand) {
    await addCountBrand(createProductInput.brand);
  }

  return newProduct;
};

export const createProductSerial = async (
  createProductSerialInput: ProductSerialInput
) => {
  const productSerialValidation = await ProductSerial.findOne({
    serial: createProductSerialInput.serial,
  });

  if (productSerialValidation) {
    throw new Error("El Serial ya existe");
  }

  const newProductSerial: IProductSerial = await (
    await (
      await ProductSerial.create(createProductSerialInput)
    ).populate("product")
  ).populate("purchase_order_detail");

  return newProductSerial;
};

export const deleteProduct = async (
  productId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const findPurchase = await PurchaseOrderDetail.find({
    product: productId,
  });

  if (findPurchase.length > 0) {
    throw new Error("No se puede eliminar porque pertenece a una compra");
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  const deleted = await Product.deleteOne({
    _id: productId,
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
  productId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateProductInput: UpdateProductInput
) => {
  const productUpdated = await Product.findByIdAndUpdate(
    productId,
    { $set: updateProductInput },
    { new: true }
  );

  if (!productUpdated) {
    throw new Error("Ocurrio un error al actualizar el producto.");
  }

  return productUpdated;
};
