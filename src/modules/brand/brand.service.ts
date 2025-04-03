import {
  BrandInput,
  IBrand,
  UpdateBrandInput,
} from "../../interfaces/brand.interface";
import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { Brand } from "./brand.model";

export const findAll = async (): Promise<IBrand[]> => {
  return await Brand.find();
};

export const findById = async (
  brandId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IBrand> => {
  const brand = await Brand.findById(brandId);
  if (brand) {
    return brand.toObject() as IBrand;
  } else {
    throw new Error("La marca no existe");
  }
};

export const create = async (brandInput: BrandInput) => {
  const brand = await Brand.findOne({
    name: brandInput.name,
  });

  if (brand) {
    throw new Error("La marca ya existe");
  }
  const newBrand = await Brand.create(brandInput);

  return newBrand;
};

export const addCount = async (
  brandId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const brand = await findById(brandId);
  await Brand.updateOne(
    { _id: brandId },
    { count_product: brand.count_product + 1 }
  );
};

export const subtractCount = async (
  brandId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const brand = await findById(brandId);
  await Brand.updateOne(
    { _id: brandId },
    { count_product: brand.count_product - 1 }
  );
};

export const deleteBrand = async (
  brandId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const brand = await findById(brandId);

  if (brand.count_product > 0) {
    throw new Error("No se puede eliminar porque tiene productos asociados");
  }

  const deleted = await Brand.deleteOne({
    _id: brandId,
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
  brandId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateBrandInput: UpdateBrandInput
) => {
  const brandUpdated = await Brand.findByIdAndUpdate(
    brandId,
    { $set: updateBrandInput },
    { new: true }
  );

  if (!brandUpdated) {
    throw new Error("La marca no existe");
  }

  return brandUpdated;
};
