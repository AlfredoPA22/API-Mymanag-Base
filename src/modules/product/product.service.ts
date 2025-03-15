import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import {
  IProduct,
  ProductInput,
  UpdateProductInput,
} from "../../interfaces/product.interface";
import {
  IProductSerial,
  ProductSerialInput,
} from "../../interfaces/productSerial.interface";
import { codeType } from "../../utils/enums/orderType.enum";
import { addCount as addCountBrand } from "../brand/brand.service";
import { addCount as addCountCategory } from "../category/category.service";
import { generate, increment } from "../codeGenerator/codeGenerator.service";
import { PurchaseOrderDetail } from "../purchase_order/purchase_order_detail.model";
import { Product } from "./product.model";
import { ProductSerial } from "./product_serial.model";

export const findAll = async (): Promise<IProduct[]> => {
  const listProduct = await Product.find()
    .populate("category")
    .populate("brand")
    .lean<IProduct[]>();

  return listProduct;
};

export const listProductSerialByPurchaseOrder = async (
  purchaseOrderDetailId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProductSerial[]> => {
  const listSerial = await ProductSerial.find({
    purchase_order_detail: purchaseOrderDetailId,
  })
    .populate("product")
    .populate("purchase_order_detail")
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

export const createProduct = async (createProductInput: ProductInput) => {
  const productNameValidation = await Product.findOne({
    name: createProductInput.name,
  });

  if (productNameValidation) {
    throw new Error("El producto ya existe");
  }

  const customDataProduct: ProductInput = {
    code: await generate(codeType.PRODUCT),
    name: createProductInput.name,
    description: createProductInput.description,
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

  const deleted = await Product.deleteOne({
    _id: productId,
  });

  if (deleted.deletedCount > 0) {
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