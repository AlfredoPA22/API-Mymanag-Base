import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import {
  IProvider,
  ProviderInput,
  UpdateProviderInput,
} from "../../interfaces/provider.interface";
import { codeType } from "../../utils/enums/orderType.enum";
import { generate, increment } from "../codeGenerator/codeGenerator.service";
import { PurchaseOrder } from "../purchase_order/purchase_order.model";
import { Provider } from "./provider.model";

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProvider[]> => {
  return await Provider.find({
    company: companyId,
  })
    .populate("company")
    .lean<IProvider[]>();
};

export const create = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  providerInput: ProviderInput
) => {
  const newProvider = await Provider.create({
    company: companyId,
    code: await generate(companyId, codeType.PROVIDER),
    ...providerInput,
  });

  await increment(companyId, codeType.PROVIDER);

  return newProvider;
};

export const deleteProvider = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  providerId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const provider = await Provider.findOne({
    _id: providerId,
    company: companyId,
  });

  if (!provider) {
    throw new Error("El proveedor no existe");
  }

  const purchaseOrderProvider = await PurchaseOrder.find({
    company: companyId,
    provider: providerId,
  });

  if (purchaseOrderProvider.length > 0) {
    throw new Error("El proveedor ya pertenece a una compra");
  }

  const deleted = await Provider.deleteOne({
    company: companyId,
    _id: providerId,
  });

  return {
    success: deleted.deletedCount > 0,
  };
};

export const update = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  providerId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateProviderInput: UpdateProviderInput
) => {
  const provider = await Provider.findOne({
    _id: providerId,
    company: companyId,
  });

  if (!provider) {
    throw new Error("El proveedor no existe");
  }

  const providertUpdated = await Provider.findOneAndUpdate(
    { _id: providerId, company: companyId },
    { $set: updateProviderInput },
    { new: true }
  );

  return providertUpdated;
};
