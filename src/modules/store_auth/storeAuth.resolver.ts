import { ISaleOrder } from "../../interfaces/saleOrder.interface";
import { IStoreOrderResult } from "../../interfaces/store.interface";
import {
  IStoreAuthResult,
  IStoreCartItem,
  IStoreClient,
  IStoreMeResult,
  IStoreOrderDetailResult,
  StoreRegisterInput,
  StoreUpdateProfileInput,
} from "../../interfaces/storeAuth.interface";
import {
  createOrderForClient,
  getMe,
  getOrderDetail,
  listOrdersByClient,
  loginClient,
  registerClient,
  updateCart,
  updateProfile,
} from "./storeAuth.service";

const requireClient = (context: any) => {
  if (!context.user || context.user.type !== "client") {
    throw new Error("No autorizado");
  }
  return { companyId: context.user.companyId, clientId: context.user.clientId };
};

export const storeAuthResolver = {
  Query: {
    async storeMe(_: any, args: Record<string, any>, context: any): Promise<IStoreMeResult> {
      const { companyId, clientId } = requireClient(context);
      return await getMe(companyId, clientId);
    },
    async storeMyOrders(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrder[]> {
      const { companyId, clientId } = requireClient(context);
      return (await listOrdersByClient(companyId, clientId)) as unknown as ISaleOrder[];
    },
    async storeOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IStoreOrderDetailResult> {
      const { companyId, clientId } = requireClient(context);
      return await getOrderDetail(companyId, clientId, args.orderId);
    },
  },
  Mutation: {
    async storeRegister(_: any, args: Record<string, any>): Promise<IStoreAuthResult> {
      return await registerClient(args.companyId, args.input as StoreRegisterInput);
    },
    async storeLogin(_: any, args: Record<string, any>): Promise<IStoreAuthResult> {
      return await loginClient(args.companyId, args.phoneNumber, args.password);
    },
    async storeUpdateCart(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IStoreCartItem[]> {
      const { companyId, clientId } = requireClient(context);
      return await updateCart(companyId, clientId, args.items);
    },
    async storeCreateOrderForClient(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IStoreOrderResult> {
      const { companyId, clientId } = requireClient(context);
      return await createOrderForClient(companyId, clientId, args.items, args.address);
    },
    async storeUpdateProfile(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IStoreClient> {
      const { companyId, clientId } = requireClient(context);
      return await updateProfile(
        companyId,
        clientId,
        args.input as StoreUpdateProfileInput
      );
    },
  },
};
