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

export const findAll = async (): Promise<IProvider[]> => {
  return await Provider.find();
};

// export const findAllSaleOrderByClient = async (
//   providerId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
// ): Promise<ISaleOrderByClient> => {
//   await findById(clientId);

//   const allSalesOrderByClient = await SaleOrder.find({
//     client: clientId,
//   })
//     .populate("client")
//     .lean<ISaleOrder[]>();

//   let total: number = allSalesOrderByClient
//     .filter(
//       (saleOrder: ISaleOrder) => saleOrder.status === saleOrderStatus.APROBADO
//     )
//     .reduce((sum, saleOrder) => {
//       return sum + Number(saleOrder.total || 0);
//     }, 0);

//   const response: ISaleOrderByClient = {
//     saleOrder: allSalesOrderByClient,
//     total: total.toString(),
//   };

//   return response;
// };

export const findById = async (
  providerId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IProvider> => {
  const provider = await Provider.findById(providerId);
  if (provider) {
    return provider.toObject() as IProvider;
  } else {
    throw new Error("El proveedor no existe");
  }
};

export const create = async (providerInput: ProviderInput) => {
  const newProvider = await Provider.create({
    code: await generate(codeType.PROVIDER),
    ...providerInput,
  });

  await increment(codeType.PROVIDER);

  return newProvider;
};

export const deleteProvider = async (
  providerId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  await findById(providerId);

  const purchaseOrderProvider = await PurchaseOrder.find({
    provider: providerId,
  });

  if (purchaseOrderProvider.length > 0) {
    throw new Error("El proveedor ya pertenece a una compra");
  }

  const deleted = await Provider.deleteOne({
    _id: providerId,
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
  providerId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateProviderInput: UpdateProviderInput
) => {
  const providertUpdated = await Provider.findByIdAndUpdate(
    providerId,
    { $set: updateProviderInput },
    { new: true }
  );

  if (!providertUpdated) {
    throw new Error("El proveedor no existe");
  }

  return providertUpdated;
};
