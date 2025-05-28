import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import {
  ClientInput,
  IClient,
  UpdateClientInput,
} from "../../interfaces/client.interface";
import { codeType } from "../../utils/enums/orderType.enum";
import { generate, increment } from "../codeGenerator/codeGenerator.service";
import { Client } from "./client.model";
import { SaleOrder } from "../sale_order/sale_order.model";
import {
  ISaleOrder,
  ISaleOrderByClient,
} from "../../interfaces/saleOrder.interface";
import { saleOrderStatus } from "../../utils/enums/saleOrderStatus.enum";
import { IUser } from "../../interfaces/user.interface";
import { User } from "../user/user.model";

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IClient[]> => {
  return await Client.find({ company: companyId })
    .populate("company")
    .lean<IClient[]>();
};

export const findAllSaleOrderByClient = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  userId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISaleOrderByClient> => {
  const foundUser: IUser | null = await User.findOne({
    _id: userId,
    company: companyId,
  });

  if (!foundUser) {
    throw new Error("Usuario no encontrado");
  }

  const client = await Client.findOne({ _id: clientId, company: companyId });

  if (!client) {
    throw new Error("El cliente no existe");
  }

  const filter: any = {
    client: clientId,
    company: companyId,
  };

  if (!foundUser.is_global) {
    filter.created_by = userId;
  }

  const allSalesOrderByClient = await SaleOrder.find(filter)
    .populate("client")
    .populate("company")
    .lean<ISaleOrder[]>();

  const total: number = allSalesOrderByClient
    .filter(
      (saleOrder: ISaleOrder) => saleOrder.status === saleOrderStatus.APROBADO
    )
    .reduce((sum, saleOrder) => sum + Number(saleOrder.total || 0), 0);

  const response: ISaleOrderByClient = {
    saleOrder: allSalesOrderByClient,
    total: total.toString(),
  };

  return response;
};

export const create = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  clientInput: ClientInput
) => {
  const newClient = await Client.create({
    code: await generate(companyId, codeType.CLIENT),
    ...clientInput,
    company: companyId,
  });

  await increment(companyId, codeType.CLIENT);

  return newClient;
};

export const deleteClient = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const client = await Client.findOne({ _id: clientId, company: companyId });

  if (!client) {
    throw new Error("El cliente no existe");
  }

  const saleOrderClient = await SaleOrder.find({
    client: clientId,
    company: companyId,
  });

  if (saleOrderClient.length > 0) {
    throw new Error("El cliente ya pertenece a una venta");
  }

  const deleted = await Client.deleteOne({
    _id: clientId,
    company: companyId,
  });

  return {
    success: deleted.deletedCount > 0,
  };
};

export const update = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateClientInput: UpdateClientInput
) => {
  const client = await Client.findOne({ _id: clientId, company: companyId });

  if (!client) {
    throw new Error("El cliente no existe");
  }

  const clientUpdated = await Client.findOneAndUpdate(
    { _id: clientId, company: companyId },
    { $set: updateClientInput },
    { new: true }
  );

  return clientUpdated;
};
