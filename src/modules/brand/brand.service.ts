import {
  BrandInput,
  IBrand,
  UpdateBrandInput,
} from "../../interfaces/brand.interface";
import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";
import { Brand } from "./brand.model";

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IBrand[]> => {
  return await Brand.find({
    company: companyId,
  })
    .populate("company")
    .lean<IBrand[]>();
};

export const findById = async (
  brandId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IBrand> => {
  const brand = await Brand.findById(brandId)
    .populate("company")
    .lean<IBrand>();

  if (!brand) {
    throw new Error("La marca no existe");
  }

  return brand;
};

export const create = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  brandInput: BrandInput
) => {
  const brand = await Brand.findOne({
    name: brandInput.name,
    company: companyId,
  });

  if (brand) {
    throw new Error("La marca ya existe");
  }
  const newBrand = await Brand.create({ ...brandInput, company: companyId });

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
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  brandId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const brand = await Brand.findOne({ _id: brandId, company: companyId });

  if (!brand) {
    throw new Error("La marca no existe");
  }

  if (brand.count_product > 0) {
    throw new Error("No se puede eliminar porque tiene productos asociados");
  }

  const deleted = await Brand.deleteOne({ _id: brandId, company: companyId });

  return {
    success: deleted.deletedCount > 0,
  };
};

export const update = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  brandId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateBrandInput: UpdateBrandInput
) => {
  const brand = await Brand.findOne({ _id: brandId, company: companyId });

  if (!brand) {
    throw new Error("La marca no existe");
  }

  const existingBrand = await Brand.findOne({
    name: updateBrandInput.name,
    company: companyId,
    _id: { $ne: brandId },
  });

  if (existingBrand) {
    throw new Error("La marca ya existe");
  }

  const brandUpdated = await Brand.findOneAndUpdate(
    { _id: brandId, company: companyId },
    { $set: updateBrandInput },
    { new: true }
  );

  return brandUpdated;
};
