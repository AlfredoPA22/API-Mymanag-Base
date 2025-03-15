import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import { ClientInput, IClient, UpdateClientInput } from "../../interfaces/client.interface";
import { codeType } from "../../utils/enums/orderType.enum";
import { generate, increment } from "../codeGenerator/codeGenerator.service";
import { Client } from "./client.model";
import { SaleOrder } from "../sale_order/sale_order.model";
import {
  ISaleOrder,
  ISaleOrderByClient,
} from "../../interfaces/saleOrder.interface";
import { saleOrderStatus } from "../../utils/enums/saleOrderStatus.enum";

export const findAll = async (): Promise<IClient[]> => {
  return await Client.find();
};

export const findAllSaleOrderByClient = async (
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<ISaleOrderByClient> => {
  await findById(clientId);

  const allSalesOrderByClient = await SaleOrder.find({
    client: clientId,
  })
    .populate("client")
    .lean<ISaleOrder[]>();

  let total: number = allSalesOrderByClient
    .filter(
      (saleOrder: ISaleOrder) => saleOrder.status === saleOrderStatus.APROBADO
    )
    .reduce((sum, saleOrder) => {
      return sum + Number(saleOrder.total || 0);
    }, 0);

  const response: ISaleOrderByClient = {
    saleOrder: allSalesOrderByClient,
    total: total.toString(),
  };

  return response;
};

export const findById = async (
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IClient> => {
  const client = await Client.findById(clientId);
  if (client) {
    return client.toObject() as IClient;
  } else {
    throw new Error("El cliente no existe");
  }
};

export const create = async (clientInput: ClientInput) => {
  const newClient = await Client.create({
    code: await generate(codeType.CLIENT),
    ...clientInput,
  });

  await increment(codeType.CLIENT);

  return newClient;
};

export const deleteClient = async (
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  await findById(clientId);

  const saleOrderClient = await SaleOrder.find({
    client: clientId,
  });

  if (saleOrderClient.length > 0) {
    throw new Error("El cliente ya pertenece a una venta");
  }

  const deleted = await Client.deleteOne({
    _id: clientId,
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
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateClientInput: UpdateClientInput
) => {
  const clientUpdated = await Client.findByIdAndUpdate(
    clientId,
    { $set: updateClientInput },
    { new: true }
  );

  if (!clientUpdated) {
    throw new Error("El cliente no existe");
  }

  return clientUpdated;
};

